#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const safeRoles = new Set(['user', 'assistant']);
const contentTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const frame = value => `data: ${typeof value === 'string' ? value : JSON.stringify(value)}\n\n`;

export function validatePreviewRequest(headers, body) {
  if (headers.get('X-Chat-Protocol') !== 'ui-message-v1' || !body || !Array.isArray(body.messages) || !body.messages.length) {
    return { ok: false, code: 'invalid_request' };
  }
  for (const message of body.messages) {
    if (!message || !safeRoles.has(message.role) || typeof message.content !== 'string' || !message.content.trim() || Object.keys(message).some(key => key !== 'role' && key !== 'content')) {
      return { ok: false, code: 'invalid_request' };
    }
  }
  const last = body.messages.at(-1);
  if (last.role !== 'user') return { ok: false, code: 'invalid_request' };
  return { ok: true, prompt: last.content };
}

export function buildScenario(prompt) {
  const start = [frame({ type: 'start', messageId: 'fixture-assistant' }), frame({ type: 'text-start', id: 'fixture-text' })];
  if (/thinking/i.test(prompt)) return {
    delayMs: 1200,
    chunks: [...start, ...Array.from({ length: 20 }, () => ': waiting\n\n'),
      frame({ type: 'text-delta', id: 'fixture-text', delta: 'A thought has arrived. 想到啦。' }),
      frame({ type: 'text-end', id: 'fixture-text' }), frame({ type: 'finish', finishReason: 'stop' }), frame('[DONE]')],
  };
  if (/quota/i.test(prompt)) return { delayMs: 0, chunks: [frame({ type: 'error', errorText: 'quota_exhausted' }), frame('[DONE]')] };
  if (/timeout/i.test(prompt)) return { delayMs: 120, chunks: [...start, frame({ type: 'text-delta', id: 'fixture-text', delta: 'This partial reply arrived before the timeout.' }), frame({ type: 'error', errorText: 'timeout' }), frame('[DONE]')] };
  if (/truncation/i.test(prompt)) return { delayMs: 80, chunks: [...start, frame({ type: 'text-delta', id: 'fixture-text', delta: 'This partial reply is intentionally interrupted' }), frame({ type: 'error', errorText: 'stream_error' }), frame('[DONE]')] };
  if (/longstream/i.test(prompt)) {
    const deltas = Array.from({ length: 30 }, (_, index) => frame({ type: 'text-delta', id: 'fixture-text', delta: `\n\n${index + 1}. Streaming paragraph ${index + 1} — scroll upward now to release follow mode.` }));
    return { delayMs: 350, chunks: [...start, ...deltas, frame({ type: 'text-end', id: 'fixture-text' }), frame({ type: 'finish', finishReason: 'stop' }), frame('[DONE]')] };
  }
  return {
    delayMs: 70,
    chunks: [...start,
      frame({ type: 'text-delta', id: 'fixture-text', delta: '# Hello from xue\n\nThis is **streaming Markdown** with Chinese support: 你好。\n\n' }),
      frame({ type: 'text-delta', id: 'fixture-text', delta: '```js\nconst answer = "safe";\n```' }),
      frame({ type: 'text-end', id: 'fixture-text' }), frame({ type: 'finish', finishReason: 'stop' }), frame('[DONE]')],
  };
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error('body_too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function streamScenario(response, scenario) {
  response.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Vercel-AI-UI-Message-Stream': 'v1' });
  let index = 0;
  const write = () => {
    if (index >= scenario.chunks.length) { response.end(); return; }
    response.write(scenario.chunks[index++]);
    if (scenario.delayMs) setTimeout(write, scenario.delayMs); else write();
  };
  write();
}

async function serveFile(root, urlPath, response) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const target = resolve(root, `.${relative}`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) { response.writeHead(404).end(); return; }
  try {
    const info = await stat(target);
    const file = info.isDirectory() ? resolve(target, 'index.html') : target;
    response.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found'); }
}

export function createPreviewServer(root) {
  return createServer(async (request, response) => {
    if (request.url === '/chat-api' && request.method === 'POST') {
      try {
        const body = await readJson(request);
        const result = validatePreviewRequest(new Headers(request.headers), body);
        if (!result.ok) { response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: result.code })); return; }
        streamScenario(response, buildScenario(result.prompt));
      } catch (error) {
        const code = error instanceof Error && error.message === 'body_too_large' ? 'body_too_large' : 'invalid_request';
        response.writeHead(code === 'body_too_large' ? 413 : 400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: code }));
      }
      return;
    }
    await serveFile(root, request.url ?? '/', response);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootIndex = process.argv.indexOf('--root');
  const portIndex = process.argv.indexOf('--port');
  const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : '.build/zh');
  const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 4322);
  createPreviewServer(root).listen(port, '127.0.0.1', () => {
    console.log(`xue chat preview: http://127.0.0.1:${port}/chat/`);
    console.log('Prompts: normal markdown | quota | timeout | truncation | longstream');
  });
}
