import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

/** @typedef {{version: number, host: string, pages: Record<string, string>}} Manifest */
/** @typedef {{version: number, manifests: Record<string, Manifest>, pending: Record<string, string[]>}} State */
/** @typedef {{status: string, httpStatus: number | null, attempts: number}} Submission */
/** @typedef {{status: string, pending: number, changed?: number, batches?: (Submission & {count:number})[]}} Report */
/** @typedef {{fetchFn?: (url: string, options: RequestInit) => Promise<Response>, sleep?: (ms: number) => Promise<void>, saveState?: (state: State) => Promise<void>}} Options */

const HOSTS = ['siyuanxue.com', 'xuesiyuan.com'];
const KEY_ENV = { 'siyuanxue.com': 'INDEXNOW_KEY_EN', 'xuesiyuan.com': 'INDEXNOW_KEY_ZH' };
const MAX_BODY = 16 * 1024 * 1024;
const MAX_URLS = 100000;

function validUrl(value, host) {
 if (!HOSTS.includes(host) || typeof value !== 'string' || value.length > 2048) throw new Error('Invalid IndexNow host or URL');
 let url;
 try { url = new URL(value); } catch { throw new Error('Invalid IndexNow URL'); }
 if (url.origin !== `https://${host}` || url.username || url.password || url.search || url.hash || url.href !== value) throw new Error('Noncanonical IndexNow URL');
 return value;
}

export function validateManifest(manifest, host) {
 if (!HOSTS.includes(host) || !manifest || manifest.version !== 1 || manifest.host !== host || !manifest.pages || typeof manifest.pages !== 'object' || Array.isArray(manifest.pages)) throw new Error('Invalid IndexNow manifest');
 const entries = Object.entries(manifest.pages);
 if (entries.length > MAX_URLS) throw new Error('IndexNow manifest exceeds bound');
 for (const [url, digest] of entries) {
  validUrl(url, host);
  if (typeof digest !== 'string' || !/^[0-9a-f]{64}$/.test(digest)) throw new Error('Invalid IndexNow content digest');
 }
 return { version: 1, host, pages: { ...manifest.pages } };
}

function validateState(input) {
 if (input == null) return { version: 1, manifests: {}, pending: {} };
 if (input.version !== 1 || !input.manifests || !input.pending) throw new Error('Invalid saved IndexNow state');
 const state = { version: 1, manifests: {}, pending: {} };
 for (const host of HOSTS) {
  if (input.manifests[host]) state.manifests[host] = validateManifest(input.manifests[host], host);
  if (input.pending[host]) {
   if (!Array.isArray(input.pending[host]) || input.pending[host].length > MAX_URLS) throw new Error('Invalid IndexNow pending queue');
   state.pending[host] = [...new Set(input.pending[host].map(url => validUrl(url, host)))].sort();
  }
 }
 return state;
}

export function changedUrls(current, previous) {
 validateManifest(current, current.host);
 if (previous) validateManifest(previous, current.host);
 const before = previous?.pages ?? {};
 return [...new Set([...Object.keys(current.pages), ...Object.keys(before)])].filter(url => current.pages[url] !== before[url]).sort();
}

export function retryDelay(value, attempt, now = Date.now()) {
 let delay = NaN;
 if (value && /^\d+$/.test(value)) delay = Number(value) * 1000;
 else if (value) delay = Date.parse(value) - now;
 return Math.min(30000, Math.max(0, Number.isFinite(delay) ? delay : 1000 * 2 ** attempt));
}

/** @param {string} host @param {string} key @param {string[]} urls @param {Options} options @returns {Promise<Submission>} */
export async function submitUrls(host, key, urls, { fetchFn = fetch, sleep = ms => new Promise(done => setTimeout(done, ms)) } = {}) {
 if (!HOSTS.includes(host) || !/^[A-Za-z0-9-]{8,128}$/.test(key ?? '') || !Array.isArray(urls) || urls.length < 1 || urls.length > 10000) throw new Error('Invalid IndexNow submission');
 for (const url of urls) validUrl(url, host);
 const body = JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls });
 let result;
 for (let attempt = 0; attempt < 3; attempt++) {
  let retryAfter = null;
  try {
   const response = await fetchFn('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body, redirect: 'error', signal: AbortSignal.timeout(15000) });
   const status = response.status;
   await response.body?.cancel();
   result = { status: status === 200 ? 'submitted' : status === 202 ? 'accepted-pending-validation' : 'rejected', httpStatus: status, attempts: attempt + 1 };
   if (status !== 429 && (status < 500 || status > 599)) return result;
   retryAfter = response.headers.get('Retry-After');
  } catch {
   // Fetch errors can contain a URL or request body. Never log them or a key.
   result = { status: 'transport-failed', httpStatus: null, attempts: attempt + 1 };
  }
  if (attempt < 2) await sleep(retryDelay(retryAfter, attempt));
 }
 return result;
}

/** @param {Record<string, Manifest>} current @param {Record<string, Manifest>} baseline @param {State | null} retained @param {Record<string, string>} keys @param {Options} options @returns {Promise<{state: State, report: Record<string, Report>}>} */
export async function deliver(current, baseline, retained, keys, options = {}) {
 const state = validateState(retained), report = {};
 for (const host of HOSTS) {
  if (!current[host]) {
   // First-run failure still has to remember URLs that were live before deployment.
   if (!state.manifests[host] && baseline[host]) state.manifests[host] = validateManifest(baseline[host], host);
   report[host] = { status: 'manifest-unavailable', pending: state.pending[host]?.length ?? 0 };
   continue;
  }
  const manifest = validateManifest(current[host], host);
  // A newer public baseline must not hide a release missed by a failed notification.
  // Missing retained history deliberately bootstraps every current URL.
  const changed = [...new Set([
   ...changedUrls(manifest, state.manifests[host]),
   ...(baseline[host] ? changedUrls(manifest, baseline[host]) : []),
  ])];
  state.pending[host] = [...new Set([...(state.pending[host] ?? []), ...changed])].sort();
  if (state.pending[host].length > MAX_URLS) throw new Error('IndexNow pending queue exceeds bound');
  state.manifests[host] = manifest;
  report[host] = { status: 'queued', changed: changed.length, pending: state.pending[host].length, batches: [] };
 }
 // Persist before making requests, so any later interruption leaves a recoverable queue.
 await options.saveState?.(state);
 for (const host of HOSTS) {
  if (!current[host]) continue;
  const row = report[host], key = keys[host];
  if (!key) { row.status = 'skipped-unconfigured'; continue; }
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) { row.status = 'invalid-configuration'; continue; }
  if (!state.pending[host].length) { row.status = 'unchanged'; continue; }
  const queued = [...state.pending[host]];
  for (let start = 0; start < queued.length; start += 10000) {
   const batch = queued.slice(start, start + 10000);
   const result = await submitUrls(host, key, batch, options);
   row.batches.push({ count: batch.length, ...result });
   if (result.httpStatus === 200 || result.httpStatus === 202) {
    const acknowledged = new Set(batch);
    state.pending[host] = state.pending[host].filter(url => !acknowledged.has(url));
    await options.saveState?.(state);
   } else break;
  }
  row.pending = state.pending[host].length;
  row.status = row.pending ? 'pending-retry' : row.batches.some(batch => batch.httpStatus === 202) ? 'accepted-pending-validation' : 'submitted';
 }
 return { state, report };
}

async function boundedText(response) {
 if (!response.ok) throw new Error('Public IndexNow resource unavailable');
 const reader = response.body.getReader(), chunks = [];
 let length = 0;
 try {
  for (;;) {
   const { done, value } = await reader.read();
   if (done) break;
   length += value.length;
   if (length > MAX_BODY) throw new Error('Public IndexNow resource exceeds bound');
   chunks.push(Buffer.from(value));
  }
 } finally { await reader.cancel(); }
 return Buffer.concat(chunks).toString('utf8');
}

async function publicText(host, path) {
 return boundedText(await fetch(`https://${host}${path}`, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } }));
}

async function readManifests(expectedSha) {
 const manifests = {}, status = {};
 await Promise.all(HOSTS.map(async host => {
  try {
   if (expectedSha && (await publicText(host, '/__health')).trim() !== expectedSha) throw new Error('Public release mismatch');
   manifests[host] = validateManifest(JSON.parse(await publicText(host, '/indexnow-manifest.json')), host);
   status[host] = 'available';
  } catch { status[host] = 'unavailable'; }
 }));
 return { manifests, status };
}

function github(args) {
 return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: MAX_BODY, stdio: ['ignore', 'pipe', 'pipe'] });
}

function repository() {
 const value = process.env.GITHUB_REPOSITORY;
 if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value ?? '')) throw new Error('Invalid Actions repository');
 return value;
}

async function downloadArtifact(artifact, destination) {
 await mkdir(destination, { recursive: true });
 github(['run', 'download', String(artifact.workflow_run.id), '--repo', repository(), '--name', artifact.name, '--dir', destination]);
}

// Only artifacts written by this production workflow on main can supply a queue.
async function retainedState(directory) {
 const repo = repository();
 for (let page = 1; page <= 10; page++) {
  const list = JSON.parse(github(['api', `repos/${repo}/actions/artifacts?per_page=100&page=${page}`])).artifacts;
  for (const artifact of list.sort((a, b) => b.id - a.id)) {
   if (artifact.expired || !/^indexnow-state-\d+-\d+$/.test(artifact.name) || artifact.workflow_run?.head_branch !== 'main') continue;
   const run = JSON.parse(github(['api', `repos/${repo}/actions/runs/${artifact.workflow_run.id}`]));
   if (run.path !== '.github/workflows/deploy.yml' || run.head_branch !== 'main' || !['push', 'workflow_dispatch'].includes(run.event)) continue;
   const target = join(directory, 'retained');
   await downloadArtifact(artifact, target);
   return validateState(JSON.parse(await readFile(join(target, 'state.json'), 'utf8')));
  }
  if (list.length < 100) return null;
 }
 throw new Error('IndexNow history exceeds lookup bound');
}

async function saveJson(path, data) {
 await writeFile(path + '.tmp', JSON.stringify(data) + '\n');
 await rename(path + '.tmp', path);
}

async function main() {
 const [command, path] = process.argv.slice(2), directory = resolve(path ?? '.build/indexnow');
 if (!['snapshot', 'notify'].includes(command)) throw new Error('Expected snapshot or notify');
 await mkdir(directory, { recursive: true });
 const runId = process.env.GITHUB_RUN_ID;
 if (!/^\d+$/.test(runId ?? '')) throw new Error('Invalid Actions run');
 if (command === 'snapshot') {
  // Re-running deployment must keep the original before-release comparison.
  const artifacts = JSON.parse(github(['api', `repos/${repository()}/actions/runs/${runId}/artifacts?per_page=100`])).artifacts;
  const existing = artifacts.find(item => !item.expired && item.name === `indexnow-before-${runId}`);
  if (existing) { await downloadArtifact(existing, directory); return; }
  const snapshot = await readManifests();
  await saveJson(join(directory, 'before.json'), snapshot);
  for (const host of HOSTS) console.log(`IndexNow baseline ${host}: ${snapshot.status[host]}`);
  return;
 }
 const sha = process.env.GITHUB_SHA;
 if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error('Invalid release SHA');
 const retained = await retainedState(directory);
 let baseline = {};
 try { baseline = JSON.parse(await readFile(join(directory, 'before.json'), 'utf8')).manifests; }
 catch { console.log('IndexNow baseline unavailable; using retained release state or initial full submission.'); }
 const current = await readManifests(sha);
 const keys = Object.fromEntries(HOSTS.map(host => [host, process.env[KEY_ENV[host]] ?? '']));
 const keyStatus = {};
 for (const host of HOSTS) {
  if (!keys[host]) continue;
  if (!/^[A-Za-z0-9-]{8,128}$/.test(keys[host])) { keyStatus[host] = 'invalid-configuration'; keys[host] = ''; continue; }
  try {
   if ((await publicText(host, `/${keys[host]}.txt`)).trim() !== keys[host]) throw new Error('Key mismatch');
  } catch { keyStatus[host] = 'verification-file-unavailable'; keys[host] = ''; }
 }
 const result = await deliver(current.manifests, baseline, retained, keys, { saveState: state => saveJson(join(directory, 'state.json'), state) });
 for (const host of HOSTS) if (keyStatus[host]) result.report[host].status = keyStatus[host];
 await saveJson(join(directory, 'report.json'), result.report);
 const lines = ['## IndexNow delivery', '', '| Host | Result | Changed URLs | Pending retry |', '| --- | --- | ---: | ---: |'];
 for (const host of HOSTS) { const row = result.report[host]; lines.push(`| ${host} | ${row.status} | ${row.changed ?? 0} | ${row.pending ?? 0} |`); console.log(`IndexNow ${host}: ${row.status}; ${row.pending ?? 0} pending`); }
 lines.push('', 'HTTP 200 means received; HTTP 202 means received with key validation pending. Neither confirms indexing.', 'Unacknowledged URLs are retained in the IndexNow state artifact for the next successful deployment or workflow retry.', '');
 if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
 if (Object.values(result.report).some(row => ['manifest-unavailable', 'invalid-configuration', 'verification-file-unavailable', 'pending-retry'].includes(row.status))) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 main().catch(() => {
  // Do not print caught errors: HTTP/CLI diagnostics may contain credentials.
  console.error('IndexNow delivery could not complete. The website release is unaffected; retained state will be retried.');
  process.exitCode = 1;
 });
}
