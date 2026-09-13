import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAX_BODY = 32768;
const MAX_UPSTREAM_FRAME = 262144;
const UI_MESSAGE_PROTOCOL = 'ui-message-v1';

const ERROR_STATUS = {
  authentication_failed: 401,
  body_too_large: 413,
  context_limit: 400,
  invalid_request: 400,
  quota_exhausted: 429,
  rate_limited: 429,
  timeout: 504,
  upstream_unavailable: 502,
};

class SafeUpstreamError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function validMessages(body) {
  if (!body || Object.keys(body).length !== 1 || !Array.isArray(body.messages))
    return false;
  const messages = body.messages;
  return (
    messages.length > 0 &&
    messages.length <= 24 &&
    messages.length % 2 === 1 &&
    messages.reduce(
      (total, message) =>
        total + (typeof message?.content === 'string' ? message.content.length : 16001),
      0,
    ) <= 16000 &&
    messages.every(
      (message, index) =>
        message &&
        Object.keys(message).length === 2 &&
        message.role === (index % 2 ? 'assistant' : 'user') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0 &&
        message.content.length <= 4000,
    )
  );
}

function structuredErrorText(value) {
  try {
    return JSON.stringify(value).slice(0, MAX_UPSTREAM_FRAME);
  } catch {
    return '';
  }
}

function hasStructuredCode(value, wanted) {
  if (!value || typeof value !== 'object') return false;
  const pending = [value];
  let visited = 0;
  while (pending.length && visited++ < 100) {
    const item = pending.pop();
    if (!item || typeof item !== 'object') continue;
    for (const [key, child] of Object.entries(item)) {
      if (
        ['code', 'error_code', 'status_code'].includes(key.toLowerCase()) &&
        String(child).trim().toLowerCase() === wanted
      ) return true;
      if (child && typeof child === 'object') pending.push(child);
    }
  }
  return false;
}

/** Classify only provider error/status metadata. Never pass assistant content here. */
export function normalizeUpstreamError(status, structured, fallback = 'upstream_unavailable') {
  const text = structuredErrorText(structured).toLowerCase();
  const code1113 =
    hasStructuredCode(structured, '1113') ||
    /\bglm[-_ ]?1113\b/i.test(text) ||
    /\bcode\b[^0-9a-z]{0,16}1113\b/i.test(text);
  if (
    status === 402 ||
    code1113 ||
    hasStructuredCode(structured, 'insufficient_quota') ||
    /insufficient[_ -]?(?:balance|quota|credit)|quota[_ -]?exhausted|余额不足|资源包/.test(text)
  ) return 'quota_exhausted';

  if (
    status === 401 || status === 403 ||
    hasStructuredCode(structured, 'invalid_api_key') ||
    /authentication[_ -]?(?:failed|error)|invalid[_ -]?api[_ -]?key|unauthori[sz]ed/.test(text)
  ) return 'authentication_failed';

  if (
    status === 429 ||
    hasStructuredCode(structured, 'rate_limit_exceeded') ||
    /rate[_ -]?limit|too many requests/.test(text)
  ) return 'rate_limited';

  if (
    hasStructuredCode(structured, 'context_length_exceeded') ||
    hasStructuredCode(structured, 'output_truncated') ||
    /context (?:length|window).*exceed|maximum context length|output[_ -]?truncat/.test(text)
  ) return 'context_limit';

  if (
    status === 408 || status === 504 ||
    hasStructuredCode(structured, 'timeout') ||
    /timed? ?out|timeout/.test(text)
  ) return 'timeout';

  if (
    hasStructuredCode(structured, 'interrupted') ||
    /["']?finish_reason["']?\s*:\s*["'](?:interrupted|cancel(?:l)?ed)/.test(text)
  ) return 'interrupted';

  if (status === 400 || status === 413 || status === 422)
    return 'invalid_request';
  return fallback;
}

async function readBoundedJson(response) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPSTREAM_FRAME) return null;
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function isStreamFailure(event, frame) {
  const finishReason = event?.choices?.[0]?.finish_reason;
  return Boolean(
    event?.error ||
    event?.type === 'error' ||
    event?.hermes?.failed ||
    event?.hermes?.partial ||
    event?.hermes?.completed === false ||
    ['error', 'length', 'content_filter', 'cancelled', 'canceled', 'interrupted'].includes(finishReason) ||
    /^event:\s*error\s*$/m.test(frame)
  );
}

function streamErrorMetadata(event) {
  return {
    error: event?.error,
    hermes: event?.hermes,
    code: event?.code,
    error_code: event?.error_code,
    message: event?.message,
    detail: event?.detail,
    status: event?.status,
    status_code: event?.status_code,
    type: event?.type,
    finish_reason: event?.choices?.[0]?.finish_reason,
  };
}

export function createChatServer({
  apiKey = process.env.HERMES_API_KEY,
  apiUrl = process.env.HERMES_API_URL ||
    'http://127.0.0.1:8642/v1/chat/completions',
  allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'https://siyuanxue.com,https://xuesiyuan.com'
  ).split(','),
  timeoutMs = 120000,
} = {}) {
  if (!apiKey?.trim()) throw new Error('HERMES_API_KEY is required');
  const endpoint = new URL(apiUrl);
  if (
    endpoint.protocol !== 'http:' ||
    !['127.0.0.1', '[::1]', 'localhost'].includes(endpoint.hostname)
  ) throw new Error('Hermes API must use loopback HTTP');

  const clients = new Map();
  let active = 0;
  const server = createServer(async (req, res) => {
    const json = (status, error, { retryAfter } = {}) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(retryAfter ? { 'Retry-After': retryAfter } : {}),
      });
      res.end(JSON.stringify(typeof error === 'string' ? { error } : error));
    };

    if (req.url === '/chat-api/health' && req.method === 'GET')
      return json(200, { ok: true });
    if (req.url !== '/chat-api') return json(404, 'invalid_request');
    if (req.method !== 'POST') return json(405, 'invalid_request');
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin))
      return json(403, 'invalid_request');
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || ''))
      return json(415, 'invalid_request');

    const requestedProtocol = req.headers['x-chat-protocol'];
    if (requestedProtocol && requestedProtocol !== UI_MESSAGE_PROTOCOL)
      return json(400, 'invalid_request');
    const uiProtocol = requestedProtocol === UI_MESSAGE_PROTOCOL;

    const now = Date.now();
    for (const [key, value] of clients)
      if (!value.active && now - value.last >= 60000) clients.delete(key);
    // The reverse proxy must overwrite X-Real-IP. Direct callers can only reach loopback.
    const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress).slice(0, 128);
    let client = clients.get(ip);
    if (!client) {
      if (clients.size >= 10000)
        return json(429, 'rate_limited', { retryAfter: '60' });
      client = { times: [], active: 0, last: now };
      clients.set(ip, client);
    }
    client.times = client.times.filter((time) => now - time < 60000);
    client.last = now;
    if (client.times.length >= 6 || client.active >= 2 || active >= 4)
      return json(429, 'rate_limited', { retryAfter: '60' });
    client.times.push(now);
    client.active++;
    active++;

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    res.on('close', () => controller.abort());

    let textStarted = false;
    const messageId = `msg_${randomUUID()}`;
    const textId = `text_${randomUUID()}`;
    const write = async (text) => {
      if (res.destroyed || res.writableEnded) throw new Error('closed');
      if (!res.write(text))
        await new Promise((resolve, reject) => {
          const cleanup = () => {
            res.off('drain', drain);
            res.off('close', close);
          };
          const drain = () => { cleanup(); resolve(); };
          const close = () => { cleanup(); reject(new Error('closed')); };
          res.once('drain', drain);
          res.once('close', close);
        });
    };
    const writeUi = (event) => write(`data: ${JSON.stringify(event)}\n\n`);
    const openText = async () => {
      if (!textStarted) {
        textStarted = true;
        await writeUi({ type: 'text-start', id: textId });
      }
    };
    const closeText = async () => {
      if (textStarted) {
        await writeUi({ type: 'text-end', id: textId });
        textStarted = false;
      }
    };
    const endStreamError = async (code) => {
      if (uiProtocol) {
        await closeText();
        await writeUi({ type: 'error', errorText: code });
        await write('data: [DONE]\n\n');
        res.end();
      } else {
        res.end(`event: error\ndata: ${JSON.stringify({ error: code })}\n\n`);
      }
    };

    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY) {
          json(413, 'body_too_large');
          return;
        }
        chunks.push(chunk);
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return json(400, 'invalid_request');
      }
      if (!validMessages(body)) return json(400, 'invalid_request');
      if (controller.signal.aborted) {
        if (timedOut) json(504, 'timeout');
        return;
      }

      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'hermes',
          stream: true,
          messages: body.messages,
          session_id: randomUUID(),
        }),
        signal: controller.signal,
      });

      if (!upstream.ok) {
        const errorBody = await readBoundedJson(upstream);
        if (timedOut) {
          json(504, 'timeout');
          return;
        }
        const code = normalizeUpstreamError(upstream.status, errorBody);
        const retryAfter = code === 'rate_limited'
          ? upstream.headers.get('retry-after') || undefined
          : undefined;
        json(ERROR_STATUS[code] || 502, code, { retryAfter });
        return;
      }
      if (!upstream.body) {
        json(502, 'upstream_unavailable');
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
        ...(uiProtocol ? { 'X-Vercel-AI-UI-Message-Stream': 'v1' } : {}),
      });
      if (uiProtocol) await writeUi({ type: 'start', messageId });

      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      for await (const chunk of upstream.body) {
        buffer += decoder.decode(chunk, { stream: true });
        if (buffer.length > MAX_UPSTREAM_FRAME)
          throw new SafeUpstreamError('stream_error');
        let match;
        while ((match = /\r?\n\r?\n/.exec(buffer))) {
          const frame = buffer.slice(0, match.index);
          buffer = buffer.slice(match.index + match[0].length);
          const data = frame
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n');
          if (!data) continue;
          if (data === '[DONE]') {
            done = true;
            break;
          }
          let event;
          try {
            event = JSON.parse(data);
          } catch {
            throw new SafeUpstreamError('stream_error');
          }
          if (isStreamFailure(event, frame)) {
            const code = normalizeUpstreamError(
              Number(
                event?.error?.status_code || event?.error?.status ||
                event?.status_code || event?.status,
              ) || undefined,
              streamErrorMetadata(event),
              'stream_error',
            );
            throw new SafeUpstreamError(code);
          }
          const content = event?.choices?.[0]?.delta?.content;
          if (typeof content === 'string' && content) {
            if (uiProtocol) {
              await openText();
              await writeUi({ type: 'text-delta', id: textId, delta: content });
            } else {
              await write(
                `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
              );
            }
          }
        }
        if (done) break;
      }
      if (!done) throw new SafeUpstreamError('stream_error');

      if (uiProtocol) {
        await closeText();
        await writeUi({ type: 'finish', finishReason: 'stop' });
      }
      await write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      const code = timedOut
        ? 'timeout'
        : error instanceof SafeUpstreamError
          ? error.code
          : 'upstream_unavailable';
      if (!res.headersSent) json(ERROR_STATUS[code] || 502, code);
      else if (!res.destroyed && !res.writableEnded) {
        try { await endStreamError(code === 'upstream_unavailable' ? 'stream_error' : code); }
        catch { res.destroy(); }
      }
    } finally {
      clearTimeout(timer);
      controller.abort();
      client.active--;
      active--;
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 30;
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const host = process.env.CHAT_HOST || '127.0.0.1';
  if (!['127.0.0.1', '::1'].includes(host))
    throw new Error('CHAT_HOST must be loopback');
  const server = createChatServer();
  server.listen(Number(process.env.CHAT_PORT || 8643), host);
  const stop = () => {
    server.close();
    server.closeAllConnections();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
