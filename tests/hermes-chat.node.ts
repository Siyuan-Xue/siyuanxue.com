import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type RequestListener, type Server } from 'node:http';
import { createChatServer } from '../services/hermes-chat/server.mjs';

const UI_PROTOCOL = { 'X-Chat-Protocol': 'ui-message-v1' };
const DEFAULT_BODY = { messages: [{ role: 'user', content: 'Hello' }] };

async function listen(server: Server): Promise<void> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
}

async function fixture(
  handler: RequestListener = (_request, response) => {
    response.end(
      'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n' +
        'data: [DONE]\n\n',
    );
  },
  options: Record<string, unknown> = {},
) {
  const upstream = createServer(handler);
  await listen(upstream);
  const upstreamAddress = upstream.address();
  assert(upstreamAddress && typeof upstreamAddress === 'object');

  const bridge = createChatServer({
    apiKey: 'private-key',
    apiUrl: `http://127.0.0.1:${upstreamAddress.port}`,
    ...options,
  });
  await listen(bridge);
  const bridgeAddress = bridge.address();
  assert(bridgeAddress && typeof bridgeAddress === 'object');
  const url = `http://127.0.0.1:${bridgeAddress.port}/chat-api`;

  return {
    post: (
      body: unknown = DEFAULT_BODY,
      headers: Record<string, string> = {},
      signal?: AbortSignal,
    ) =>
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...headers },
        signal,
      }),
    url,
    close: () => {
      bridge.closeAllConnections();
      bridge.close();
      upstream.closeAllConnections();
      upstream.close();
    },
  };
}

function uiData(text: string): Array<Record<string, unknown> | '[DONE]'> {
  return text
    .split(/\r?\n\r?\n/)
    .filter(Boolean)
    .map((frame) => {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      return data === '[DONE]' ? '[DONE]' : JSON.parse(data);
    });
}

test('validates roles, sequence, overrides and size without upstream calls', async () => {
  let calls = 0;
  const f = await fixture((_request, response) => {
    calls++;
    response.end();
  });
  try {
    const invalidBodies = [
      { messages: [{ role: 'system', content: 'x' }] },
      { messages: [{ role: 'tool', content: 'x' }] },
      { messages: [{ role: 'assistant', content: 'x' }] },
      { messages: [{ role: 'user', content: 'x' }, { role: 'user', content: 'y' }] },
      { messages: [{ role: 'user', content: 'x' }], model: 'evil' },
      { messages: [{ role: 'user', content: 'x'.repeat(4001) }] },
      {
        messages: Array.from({ length: 25 }, (_, i) => ({
          role: i % 2 ? 'assistant' : 'user', content: 'x',
        })),
      },
      {
        messages: Array.from({ length: 5 }, (_, i) => ({
          role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(4000),
        })),
      },
    ];
    for (const body of invalidBodies) {
      const response = await f.post(body, { 'X-Real-IP': String(Math.random()) });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'invalid_request' });
    }
    const oversized = await f.post(
      { messages: [{ role: 'user', content: ' '.repeat(33000) }] },
      { 'X-Real-IP': String(Math.random()) },
    );
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), { error: 'body_too_large' });
    assert.equal(calls, 0);
  } finally { f.close(); }
});

test('requires allowed Origin, restricts paths and methods, and returns safe health', async () => {
  const f = await fixture();
  try {
    const denied = await f.post(undefined, { Origin: 'https://evil.com' });
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: 'invalid_request' });
    const method = await fetch(f.url);
    assert.equal(method.status, 405);
    assert.deepEqual(await method.json(), { error: 'invalid_request' });
    const path = await fetch(`${f.url}/sessions`);
    assert.equal(path.status, 404);
    assert.deepEqual(await path.json(), { error: 'invalid_request' });
    assert.deepEqual(await (await fetch(`${f.url}/health`)).json(), { ok: true });
    assert.equal((await f.post(undefined, { Origin: 'https://siyuanxue.com' })).status, 200);
  } finally { f.close(); }
});

test('legacy protocol sanitizes byte-split SSE and uses fresh fixed-model sessions', async () => {
  const requests: Array<{ body: Record<string, unknown>; auth: string | undefined }> = [];
  const f = await fixture(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    requests.push({ body: JSON.parse(body), auth: request.headers.authorization });
    response.setHeader('X-Secret', 'private-key');
    const wire = Buffer.from(
      'event: message\n' +
        'data: {"id":"secret-session","choices":[{"delta":{"reasoning":"secret-reason","content":"你好"}}]}\n\n' +
        'data: [DONE]\n\n',
    );
    for (const byte of wire) {
      response.write(Buffer.from([byte]));
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    response.end();
  });
  try {
    for (let i = 0; i < 2; i++) {
      const response = await f.post();
      assert.equal(response.headers.get('x-secret'), null);
      assert.equal(await response.text(),
        'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n' +
          'data: [DONE]\n\n');
    }
    assert.equal(requests[0].body.model, 'hermes');
    assert.equal(requests[0].body.stream, true);
    assert.notEqual(requests[0].body.session_id, requests[1].body.session_id);
    assert.equal(requests[0].auth, 'Bearer private-key');
  } finally { f.close(); }
});

test('UI protocol emits AI SDK framing with stable message and text IDs', async () => {
  const f = await fixture((_request, response) => {
    response.end(
      'data: {"choices":[{"delta":{"content":"你"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"好"}}]}\n\n' +
        'data: [DONE]\n\n',
    );
  });
  try {
    const response = await f.post(undefined, UI_PROTOCOL);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), 'v1');
    const frames = uiData(await response.text());
    assert.deepEqual(frames.map((frame) => frame === '[DONE]' ? frame : frame.type), [
      'start', 'text-start', 'text-delta', 'text-delta', 'text-end', 'finish', '[DONE]',
    ]);
    const messageId = (frames[0] as Record<string, unknown>).messageId;
    const textId = (frames[1] as Record<string, unknown>).id;
    assert.equal(typeof messageId, 'string');
    assert((messageId as string).length > 0);
    assert.equal(typeof textId, 'string');
    assert((textId as string).length > 0);
    for (const index of [2, 3, 4])
      assert.equal((frames[index] as Record<string, unknown>).id, textId);
    assert.equal((frames[2] as Record<string, unknown>).delta, '你');
    assert.equal((frames[3] as Record<string, unknown>).delta, '好');
    assert.equal((frames[5] as Record<string, unknown>).finishReason, 'stop');
  } finally { f.close(); }
});

test('assistant prose mentioning GLM1113 remains content', async () => {
  const prose = 'GLM1113 and code 1113 can be discussed as ordinary assistant prose.';
  const f = await fixture((_request, response) => {
    response.end(
      `data: ${JSON.stringify({ choices: [{ delta: { content: prose } }] })}\n\n` +
        'data: [DONE]\n\n',
    );
  });
  try {
    const frames = uiData(await (await f.post(undefined, UI_PROTOCOL)).text());
    assert.equal((frames[2] as Record<string, unknown>).type, 'text-delta');
    assert.equal((frames[2] as Record<string, unknown>).delta, prose);
    assert.equal((frames[4] as Record<string, unknown>).type, 'finish');
  } finally { f.close(); }
});

test('pre-header GLM 1113 response becomes a safe quota error', async () => {
  const f = await fixture((_request, response) => {
    response.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '3600' });
    response.end(JSON.stringify({ error: {
      code: '1113', type: 'invalid_request_error',
      message: 'Insufficient balance for sk-provider-secret',
    } }));
  });
  try {
    const response = await f.post(undefined, UI_PROTOCOL);
    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { error: 'quota_exhausted' });
    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), null);
    assert.equal(response.headers.get('retry-after'), null);
  } finally { f.close(); }
});

test('pre-header provider failures map only to allowlisted error codes', async () => {
  const cases = [
    { status: 401, body: { error: { code: 'invalid_api_key', message: 'Bearer private-key' } },
      expectedStatus: 401, expectedCode: 'authentication_failed' },
    { status: 429, headers: { 'Retry-After': '17' },
      body: { error: { type: 'rate_limit_error', message: 'slow down private-key' } },
      expectedStatus: 429, expectedCode: 'rate_limited', retryAfter: '17' },
    { status: 400, body: { error: { code: 'context_length_exceeded', message: 'context too long' } },
      expectedStatus: 400, expectedCode: 'context_limit' },
    { status: 503, body: { error: { message: 'private-key internal trace' } },
      expectedStatus: 502, expectedCode: 'upstream_unavailable' },
  ];
  for (const item of cases) {
    const f = await fixture((_request, response) => {
      response.writeHead(item.status, { 'Content-Type': 'application/json', ...item.headers });
      response.end(JSON.stringify(item.body));
    });
    try {
      const response = await f.post(undefined, UI_PROTOCOL);
      assert.equal(response.status, item.expectedStatus);
      assert.deepEqual(await response.json(), { error: item.expectedCode });
      assert.equal(response.headers.get('retry-after'), item.retryAfter ?? null);
    } finally { f.close(); }
  }
});

test('streamed structured GLM 1113 failure ends UI stream with redacted quota error', async () => {
  const f = await fixture((_request, response) => {
    response.end(
      'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":"error"}],"error":{"message":"Error code: 429 - {\\"error\\":{\\"code\\":\\"1113\\",\\"message\\":\\"private-key exhausted\\"}}","type":"agent_error"},"hermes":{"completed":false,"partial":false,"failed":true,"error_code":"agent_error"}}\n\n' +
        'data: [DONE]\n\n',
    );
  });
  try {
    const text = await (await f.post(undefined, UI_PROTOCOL)).text();
    const frames = uiData(text);
    assert.deepEqual(frames.map((frame) => frame === '[DONE]' ? frame : frame.type), [
      'start', 'text-start', 'text-delta', 'text-end', 'error', '[DONE]',
    ]);
    assert.equal((frames[4] as Record<string, unknown>).errorText, 'quota_exhausted');
    assert(!text.includes('private-key'));
    assert(!text.includes('1113'));
    assert(!text.includes('finishReason'));
  } finally { f.close(); }
});

test('Hermes GLM 1113 summary without its stripped numeric code remains quota_exhausted', async () => {
  const f = await fixture((_request, response) => {
    response.end(
      'data: {"choices":[{"delta":{},"finish_reason":"error"}],"error":{"message":"HTTP 429: 余额不足或无可用资源包","type":"agent_error"},"hermes":{"completed":false,"partial":false,"failed":true,"error_code":"agent_error"}}\n\n' +
        'data: [DONE]\n\n',
    );
  });
  try {
    const frames = uiData(await (await f.post(undefined, UI_PROTOCOL)).text());
    assert.deepEqual(frames.map((frame) => frame === '[DONE]' ? frame : frame.type), [
      'start', 'error', '[DONE]',
    ]);
    assert.equal((frames[1] as Record<string, unknown>).errorText, 'quota_exhausted');
  } finally { f.close(); }
});

test('streamed provider auth, rate, and timeout metadata use safe error codes', async () => {
  const cases = [
    {
      error: { code: 'invalid_api_key', message: 'Bearer private-key rejected' },
      expected: 'authentication_failed',
    },
    {
      error: { type: 'rate_limit_error', message: 'private-key made too many requests' },
      expected: 'rate_limited',
    },
    {
      error: { code: 'ETIMEDOUT', message: 'private-key upstream timed out' },
      expected: 'timeout',
    },
  ];
  for (const item of cases) {
    const f = await fixture((_request, response) => {
      response.end(
        `event: error\ndata: ${JSON.stringify({ error: item.error })}\n\n` +
          'data: [DONE]\n\n',
      );
    });
    try {
      const text = await (await f.post(undefined, UI_PROTOCOL)).text();
      const frames = uiData(text);
      assert.deepEqual(frames.map((frame) => frame === '[DONE]' ? frame : frame.type), [
        'start', 'error', '[DONE]',
      ]);
      assert.equal((frames[1] as Record<string, unknown>).errorText, item.expected);
      assert(!text.includes('private-key'));
      assert(!text.includes(JSON.stringify(item.error)));
    } finally { f.close(); }
  }
});

test('direct error-event metadata is classified without exposing its payload', async () => {
  const f = await fixture((_request, response) => {
    response.end(
      'event: error\n' +
        'data: {"code":"1113","message":"private-key exhausted"}\n\n',
    );
  });
  try {
    const text = await (await f.post(undefined, UI_PROTOCOL)).text();
    const frames = uiData(text);
    assert.equal((frames[1] as Record<string, unknown>).errorText, 'quota_exhausted');
    assert(!text.includes('private-key'));
    assert(!text.includes('1113'));
  } finally { f.close(); }
});

test('structured interruption uses the interrupted code and never emits finish', async () => {
  const f = await fixture((_request, response) => {
    response.end(
      'data: {"choices":[{"delta":{},"finish_reason":"interrupted"}]}\n\n' +
        'data: [DONE]\n\n',
    );
  });
  try {
    const text = await (await f.post(undefined, UI_PROTOCOL)).text();
    const frames = uiData(text);
    assert.equal((frames[1] as Record<string, unknown>).errorText, 'interrupted');
    assert(!text.includes('finishReason'));
  } finally { f.close(); }
});

test('UI protocol reports truncated and malformed streams without a success finish', async () => {
  for (const wire of [
    'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
    'data: {this is not json}\n\n',
  ]) {
    const f = await fixture((_request, response) => response.end(wire));
    try {
      const text = await (await f.post(undefined, UI_PROTOCOL)).text();
      const frames = uiData(text);
      const types = frames.map((frame) => frame === '[DONE]' ? frame : frame.type);
      assert.equal(types.at(-2), 'error');
      assert.equal(types.at(-1), '[DONE]');
      assert(!types.includes('finish'));
      assert.equal((frames.at(-2) as Record<string, unknown>).errorText, 'stream_error');
      assert(!text.includes('this is not json'));
    } finally { f.close(); }
  }
});

test('connection timeout before headers returns a safe timeout error', async () => {
  let closed = false;
  const f = await fixture((_request, response) => {
    response.on('close', () => { closed = true; });
  }, { timeoutMs: 30 });
  try {
    const response = await f.post(undefined, UI_PROTOCOL);
    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), { error: 'timeout' });
    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), null);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(closed, true);
  } finally { f.close(); }
});

test('connection timeout after partial UI content closes text and emits error plus DONE', async () => {
  let closed = false;
  const f = await fixture((_request, response) => {
    response.on('close', () => { closed = true; });
    response.write('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n');
  }, { timeoutMs: 30 });
  try {
    const text = await (await f.post(undefined, UI_PROTOCOL)).text();
    const frames = uiData(text);
    assert.deepEqual(frames.map((frame) => frame === '[DONE]' ? frame : frame.type), [
      'start', 'text-start', 'text-delta', 'text-end', 'error', '[DONE]',
    ]);
    assert.equal((frames[4] as Record<string, unknown>).errorText, 'timeout');
    assert(!text.includes('finishReason'));
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(closed, true);
  } finally { f.close(); }
});

test('rejects unsupported explicit chat protocols without calling upstream', async () => {
  let calls = 0;
  const f = await fixture((_request, response) => {
    calls++;
    response.end();
  });
  try {
    const response = await f.post(undefined, { 'X-Chat-Protocol': 'future-v2' });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_request' });
    assert.equal(calls, 0);
  } finally { f.close(); }
});

test('legacy errors and truncated streams remain safe and never append DONE', async () => {
  for (const wire of [
    'data: {"error":"private-key stack"}\n\n',
    'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
  ]) {
    const f = await fixture((_request, response) => response.end(wire));
    try {
      const text = await (await f.post()).text();
      assert(text.includes('stream_error'));
      assert(!text.includes('private-key'));
      assert(!text.includes('[DONE]'));
    } finally { f.close(); }
  }
});

test('enforces rolling IP rate limits', async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 6; i++) assert((await (await f.post()).text()).includes('[DONE]'));
    const response = await f.post();
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
    assert.deepEqual(await response.json(), { error: 'rate_limited' });
  } finally { f.close(); }
});

test('enforces per-IP and global concurrency; disconnect releases upstream', async () => {
  let disconnected = 0;
  const f = await fixture((_request, response) => {
    response.on('close', () => { disconnected++; });
    response.write('data: {"choices":[{"delta":{"content":"start"}}]}\n\n');
  });
  const controllers: AbortController[] = [];
  try {
    for (const ip of ['1', '1', '2', '2']) {
      const controller = new AbortController();
      controllers.push(controller);
      assert.equal((await f.post(undefined, { 'X-Real-IP': ip }, controller.signal)).status, 200);
    }
    assert.equal((await f.post(undefined, { 'X-Real-IP': '1' })).status, 429);
    assert.equal((await f.post(undefined, { 'X-Real-IP': '3' })).status, 429);
    controllers.forEach((controller) => controller.abort());
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(disconnected, 4);
  } finally {
    controllers.forEach((controller) => controller.abort());
    f.close();
  }
});
