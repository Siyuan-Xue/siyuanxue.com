import { expect, test } from 'bun:test';
import { rejects } from 'node:assert/strict';
import { changedUrls, deliver, retryDelay, submitUrls, validateManifest } from '../ops/indexnow.mjs';

const host = 'siyuanxue.com';
const key = 'test-indexnow-key';
const digest = 'a'.repeat(64);
const manifest = (pages: Record<string, string> = {}, domain = host) => ({ version: 1, host: domain, pages });
const response = (status: number, headers: Record<string, string> = {}) => new Response('', { status, headers });

// Losing either side of this comparison drops deletion or update notifications.
test('release differences include additions, content changes, and deletions only', () => {
 const before = manifest({ [`https://${host}/`]: digest, [`https://${host}/old/`]: digest, [`https://${host}/changed/`]: digest });
 const after = manifest({ [`https://${host}/`]: digest, [`https://${host}/new/`]: digest, [`https://${host}/changed/`]: 'b'.repeat(64) });
 expect(changedUrls(after, before)).toEqual([`https://${host}/changed/`, `https://${host}/new/`, `https://${host}/old/`]);
});

test('manifest trust boundary rejects off-host, credentialed, queried and malformed inputs', () => {
 for (const url of ['https://evil.test/', 'http://siyuanxue.com/', 'https://user@siyuanxue.com/', 'https://siyuanxue.com/?secret=yes', 'https://siyuanxue.com/#fragment', 'https://siyuanxue.com:444/']) {
  expect(() => validateManifest(manifest({ [url]: digest }), host)).toThrow();
 }
 expect(() => validateManifest(manifest({ [`https://${host}/`]: 'invalid' }), host)).toThrow();
 expect(() => validateManifest(manifest({}, 'evil.test'), 'evil.test')).toThrow();
 expect(() => validateManifest({ ...manifest(), version: 2 }, host)).toThrow();
 expect(validateManifest(manifest({ [`https://${host}/`]: digest }), host)).toEqual(manifest({ [`https://${host}/`]: digest }));
});

test('Retry-After respects delta and date formats but bounds wait time', () => {
 const now = Date.parse('2026-10-11T00:00:00Z');
 expect(retryDelay('12', 0, now)).toBe(12000);
 expect(retryDelay('Sun, 11 Oct 2026 00:00:04 GMT', 0, now)).toBe(4000);
 expect(retryDelay('9999', 0, now)).toBe(30000);
 expect(retryDelay('invalid', 1, now)).toBe(2000);
});

test('submission retries rate limits and server failures, and identifies 202 as pending validation', async () => {
 const attempts: unknown[] = [], sleeps: number[] = [];
 const responses = [response(429, { 'Retry-After': '2' }), response(503), response(202)];
 const result = await submitUrls(host, key, [`https://${host}/`], {
  fetchFn: async (url: string, options: RequestInit) => { attempts.push({ url, ...JSON.parse(options.body as string) }); return responses.shift()!; },
  sleep: async (ms: number) => { sleeps.push(ms); },
 });
 expect(result).toEqual({ status: 'accepted-pending-validation', httpStatus: 202, attempts: 3 });
 expect(sleeps).toEqual([2000, 2000]);
 expect(attempts[0]).toEqual({ url: 'https://api.indexnow.org/indexnow', host, key, keyLocation: `https://${host}/${key}.txt`, urlList: [`https://${host}/`] });
});

test('invalid key and cross-host URLs are rejected before any submission', async () => {
 let requests = 0;
 const options = { fetchFn: async () => { requests++; return response(200); } };
 await rejects(submitUrls(host, '../badkey', [`https://${host}/`], options));
 await rejects(submitUrls(host, key, ['https://xuesiyuan.com/'], options));
 expect(requests).toBe(0);
});

test('permanent rejection is not retried and transport errors never expose key text', async () => {
 let attempts = 0;
 const permanent = await submitUrls(host, key, [`https://${host}/`], { fetchFn: async () => { attempts++; return response(403); } });
 expect(permanent).toEqual({ status: 'rejected', httpStatus: 403, attempts: 1 });
 expect(attempts).toBe(1);
 const failed = await submitUrls(host, key, [`https://${host}/`], { fetchFn: async () => { throw new Error(`sensitive ${key}`); }, sleep: async () => {} });
 expect(failed).toEqual({ status: 'transport-failed', httpStatus: null, attempts: 3 });
 expect(JSON.stringify(failed)).not.toContain(key);
});

test('delivery persists failures across the next unchanged release and clears only acknowledged batches', async () => {
 const current = { [host]: manifest({ [`https://${host}/new/`]: digest }) };
 const baseline = { [host]: manifest({ [`https://${host}/deleted/`]: digest }) };
 const first = await deliver(current, baseline, null, { [host]: key }, { fetchFn: async () => response(403) });
 expect(first.state.pending[host]).toEqual([`https://${host}/deleted/`, `https://${host}/new/`]);
 const submitted: string[] = [];
 const retried = await deliver(current, current, first.state, { [host]: key }, { fetchFn: async (_: string, options: RequestInit) => { submitted.push(...JSON.parse(options.body as string).urlList); return response(200); } });
 expect(submitted).toEqual([`https://${host}/deleted/`, `https://${host}/new/`]);
 expect(retried.state.pending[host]).toEqual([]);
 expect(retried.report[host].status).toBe('submitted');
});

test('unconfigured host safely skips while preserving its changed URL queue', async () => {
 let requests = 0;
 const current = { [host]: manifest({ [`https://${host}/`]: digest }) };
 const result = await deliver(current, {}, null, {}, { fetchFn: async () => { requests++; return response(200); } });
 expect(result.report[host].status).toBe('skipped-unconfigured');
 expect(result.state.pending[host]).toEqual([`https://${host}/`]);
 expect(requests).toBe(0);
});

test('delivery splits more than 10000 URLs and retains only failed batches', async () => {
 const pages = Object.fromEntries(Array.from({ length: 10001 }, (_, n) => [`https://${host}/page-${String(n).padStart(5, '0')}/`, digest]));
 const sizes: number[] = [];
 const saved: string[][] = [];
 const result = await deliver({ [host]: manifest(pages) }, {}, null, { [host]: key }, {
  fetchFn: async (_: string, options: RequestInit) => { sizes.push(JSON.parse(options.body as string).urlList.length); return response(sizes.length === 1 ? 200 : 403); },
  saveState: async (state: any) => { saved.push([...state.pending[host]]); },
 });
 expect(sizes).toEqual([10000, 1]);
 expect(saved[0]).toHaveLength(10001);
 expect(result.state.pending[host]).toEqual([`https://${host}/page-10000/`]);
});

test('missing public baseline uses retained release state without dropping deleted URLs', async () => {
 const previous = { version: 1, manifests: { [host]: manifest({ [`https://${host}/deleted/`]: digest }) }, pending: { [host]: [] } };
 const result = await deliver({ [host]: manifest() }, {}, previous, {}, {});
 expect(result.state.pending[host]).toEqual([`https://${host}/deleted/`]);
});

test('unavailable current host keeps the previous state and pending queue intact', async () => {
 const previous = { version: 1, manifests: { [host]: manifest({ [`https://${host}/old/`]: digest }) }, pending: { [host]: [`https://${host}/retry/`] } };
 const result = await deliver({}, {}, previous, {}, {});
 expect(result.state.manifests[host]).toEqual(previous.manifests[host]);
 expect(result.state.pending[host]).toEqual([`https://${host}/retry/`]);
});

test('CLI preserves its original baseline on retry and recovers failed URLs from trusted workflow artifacts', async () => {
 const { mkdtemp, mkdir, readFile, writeFile, rm } = await import('node:fs/promises');
 const { tmpdir } = await import('node:os');
 const { join, resolve } = await import('node:path');
 const { spawnSync } = await import('node:child_process');
 const root = await mkdtemp(join(tmpdir(), 'indexnow-cli-'));
 try {
  const bin = join(root, 'bin'), work = join(root, 'work'), fixture = join(root, 'transport.mjs');
  await mkdir(bin); await mkdir(work);
  await writeFile(join(bin, 'gh'), `#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
if (args[0] === 'api') {
 const path = args[1];
 if (path.includes('/runs/123/artifacts')) console.log(JSON.stringify({ artifacts: process.env.TEST_BEFORE ? [{ name: 'indexnow-before-123', expired: false, workflow_run: {id: 123} }] : [] }));
 else if (path.includes('/actions/artifacts?')) console.log(JSON.stringify({ artifacts: process.env.TEST_RETAINED ? [
  {id: 90, name: 'indexnow-state-999-1', expired: false, workflow_run: {id: 999, head_branch:'main'}},
  {id: 80, name: 'indexnow-state-122-1', expired: false, workflow_run: {id: 122, head_branch:'main'}}] : [] }));
 else if (path.endsWith('/runs/999')) console.log(JSON.stringify({path:'.github/workflows/ci.yml',head_branch:'main',event:'pull_request'}));
 else if (path.endsWith('/runs/122')) console.log(JSON.stringify({path:'.github/workflows/deploy.yml',head_branch:'main',event:'push'}));
 else process.exit(7);
} else if (args[0] === 'run' && args[1] === 'download') {
 const dir = args[args.indexOf('--dir')+1], before = args[2] === '123';
 if (args[2] === '999') process.exit(8);
 mkdirSync(dir, {recursive:true});
 writeFileSync(join(dir, before ? 'before.json' : 'state.json'), readFileSync(before ? process.env.TEST_BEFORE : process.env.TEST_RETAINED));
} else process.exit(9);
`, { mode: 0o755 });
  await writeFile(fixture, `import { appendFileSync } from 'node:fs';
globalThis.fetch = async (input, options) => {
 const url = new URL(input);
 if (url.hostname === 'api.indexnow.org') { appendFileSync(process.env.TEST_REQUESTS, options.body+'\\n'); return new Response('', {status:Number(process.env.TEST_POST_STATUS)}); }
 if (url.pathname === '/__health') return new Response(process.env.GITHUB_SHA);
 if (url.pathname === '/indexnow-manifest.json') return new Response(JSON.stringify(JSON.parse(process.env.TEST_MANIFESTS)[url.hostname]));
 if (url.pathname.endsWith('.txt')) return new Response(process.env.INDEXNOW_KEY_EN);
 throw new Error('unexpected transport path');
};`);
  const domains = ['siyuanxue.com', 'xuesiyuan.com'];
  const before = Object.fromEntries(domains.map(domain => [domain, manifest({ [`https://${domain}/deleted/`]: digest }, domain)]));
  const current = Object.fromEntries(domains.map(domain => [domain, manifest({ [`https://${domain}/new/`]: digest }, domain)]));
  const requests = join(root, 'requests');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: 'owner/repository', GITHUB_RUN_ID: '123', GITHUB_SHA: 'f'.repeat(40), INDEXNOW_KEY_EN: key, INDEXNOW_KEY_ZH: key, TEST_REQUESTS: requests, GITHUB_STEP_SUMMARY: join(root, 'summary'), TEST_POST_STATUS: '403', TEST_MANIFESTS: JSON.stringify(before) };
  const run = (command: string, extra = {}) => spawnSync('node', ['--import', fixture, resolve('ops/indexnow.mjs'), command, work], { encoding: 'utf8', env: { ...env, ...extra } });
  expect(run('snapshot').status).toBe(0);
  const original = await readFile(join(work, 'before.json'), 'utf8');
  const copy = join(root, 'before.json'); await writeFile(copy, original);
  expect(run('snapshot', { TEST_BEFORE: copy, TEST_MANIFESTS: JSON.stringify(current) }).status).toBe(0);
  expect(await readFile(join(work, 'before.json'), 'utf8')).toBe(original);
  const rejected = run('notify', { TEST_MANIFESTS: JSON.stringify(current) });
  expect(rejected.status).toBe(1);
  expect(rejected.stdout + rejected.stderr).not.toContain(key);
  const saved = JSON.parse(await readFile(join(work, 'state.json'), 'utf8'));
  expect(saved.pending[host]).toEqual([`https://${host}/deleted/`, `https://${host}/new/`]);
  const retained = join(root, 'retained.json'); await writeFile(retained, JSON.stringify(saved));
  await writeFile(join(work, 'before.json'), JSON.stringify({ manifests: current }));
  await writeFile(requests, '');
  const retried = run('notify', { TEST_RETAINED: retained, TEST_MANIFESTS: JSON.stringify(current), TEST_POST_STATUS: '202' });
  expect(retried.status).toBe(0);
  const sent = (await readFile(requests, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  expect(sent[0].urlList).toEqual([`https://${host}/deleted/`, `https://${host}/new/`]);
  expect(JSON.parse(await readFile(join(work, 'state.json'), 'utf8')).pending[host]).toEqual([]);
  expect(JSON.parse(await readFile(join(work, 'report.json'), 'utf8'))[host].status).toBe('accepted-pending-validation');
 } finally { await rm(root, { recursive: true, force: true }); }
});

test('failed batch leaves later batches queued without hammering a rejecting endpoint', async () => {
 const pages = Object.fromEntries(Array.from({ length: 10001 }, (_, n) => [`https://${host}/page-${n}/`, digest]));
 let attempts = 0;
 const result = await deliver({ [host]: manifest(pages) }, {}, null, { [host]: key }, { fetchFn: async () => { attempts++; return response(403); } });
 expect(attempts).toBe(1);
 expect(result.state.pending[host]).toHaveLength(10001);
});

test('next unchanged deployment recovers additions and deletions after the current manifest was unavailable', async () => {
 const previous = { version: 1, manifests: { [host]: manifest({ [`https://${host}/`]: digest, [`https://${host}/deleted/`]: digest }) }, pending: { [host]: [`https://${host}/retry/`] } };
 const current = { [host]: manifest({ [`https://${host}/`]: digest, [`https://${host}/new/`]: digest }) };
 const missed = await deliver({}, previous.manifests, previous, {}, {});
 const recovered = await deliver(current, current, missed.state, {}, {});
 expect(recovered.state.pending[host]).toEqual([`https://${host}/deleted/`, `https://${host}/new/`, `https://${host}/retry/`]);
 expect(recovered.report[host].changed).toBe(2);
});

test('a failure before saving notification state cannot lose changes on a later deployment', async () => {
 const previous = { version: 1, manifests: { [host]: manifest({ [`https://${host}/deleted/`]: digest }) }, pending: { [host]: [] } };
 const current = { [host]: manifest({ [`https://${host}/new/`]: digest }) };
 await rejects(deliver(current, previous.manifests, previous, {}, { saveState: async () => { throw new Error('storage unavailable'); } }));
 const recovered = await deliver(current, current, previous, {}, {});
 expect(recovered.state.pending[host]).toEqual([`https://${host}/deleted/`, `https://${host}/new/`]);
});

test('first successful manifest read submits all current URLs after an empty first-run history', async () => {
 const current = { [host]: manifest({ [`https://${host}/new/`]: digest }) };
 const missed = await deliver({}, {}, null, {}, {});
 const recovered = await deliver(current, current, missed.state, {}, {});
 expect(recovered.state.pending[host]).toEqual([`https://${host}/new/`]);
});

test('first failed manifest read retains its known baseline so later deletion is recoverable', async () => {
 const baseline = { [host]: manifest({ [`https://${host}/deleted/`]: digest }) };
 const current = { [host]: manifest({ [`https://${host}/new/`]: digest }) };
 const missed = await deliver({}, baseline, null, {}, {});
 const recovered = await deliver(current, current, missed.state, {}, {});
 expect(recovered.state.pending[host]).toEqual([`https://${host}/deleted/`, `https://${host}/new/`]);
});
