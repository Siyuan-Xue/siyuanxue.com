import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

test('selected-ID upload works without old binaries and remote install failure cannot report success', async () => {
 const root = await mkdtemp(join(tmpdir(), 'media-upload-'));
 try {
  const binaries = join(root, 'media'), bin = join(root, 'bin'), calls = join(root, 'calls');
  await mkdir(binaries); await mkdir(bin);
  const bytes = Buffer.from('new-image'), sha256 = createHash('sha256').update(bytes).digest('hex');
  const file = { src: `/media/${sha256}.png`, format: 'png', sha256, bytes: bytes.length, width: 10, height: 20 };
  const record = { ...file, kind: 'image', variants: [], cover: file };
  const missing = { ...file, sha256: 'a'.repeat(64), src: `/media/${'a'.repeat(64)}.png` };
  await writeFile(join(binaries, `${sha256}.png`), bytes);
  const manifest = join(root, 'manifest.json');
  await writeFile(manifest, JSON.stringify({ selected: record, old: { ...missing, kind: 'image', variants: [], cover: missing } }));
  const programs = {
   ssh: '#!/bin/bash\nprintf "ssh\\n" >> "$UPLOAD_TEST_CALLS"\ncommand="${!#}"\nif [[ $command == *install-media.py* ]]; then bash -c "$command"; fi\n',
   rsync: '#!/bin/bash\nprintf "rsync\\n" >> "$UPLOAD_TEST_CALLS"\n',
   sudo: '#!/bin/bash\nif [[ $2 == python3 && ${UPLOAD_TEST_FAIL:-0} == 1 ]]; then printf "SIMULATED_INSTALL_FAILURE\\n" >&2; exit 47; fi\nexit 0\n',
  };
  for (const [name, code] of Object.entries(programs)) { await writeFile(join(bin, name), code); await chmod(join(bin, name), 0o755); }
  const run = (ids: string[], fail = '0') => spawnSync('bash', ['ops/upload-media.sh', 'ubuntu@82.156.77.131', binaries, manifest, ...ids], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, MEDIA_SSH_CONTROL: join(root, 'socket'), UPLOAD_TEST_CALLS: calls, UPLOAD_TEST_FAIL: fail } });
  const selected = run(['selected']);
  if (selected.status !== 0) throw new Error(selected.stderr);
  expect(selected.stdout).toContain('Direct upload verified');
  await writeFile(calls, '');
  expect(run([]).status).not.toBe(0);
  expect(await readFile(calls, 'utf8')).toBe('');
  const failed = run(['selected'], '1');
  expect(failed.stderr).toContain('SIMULATED_INSTALL_FAILURE');
  expect(failed.status).toBe(47);
  expect(failed.stdout).not.toContain('Direct upload verified');
 } finally { await rm(root, { recursive: true, force: true }); }
});

test('default SSH connection uses a short private socket path and closes it after upload', async () => {
 const root = await mkdtemp(join(tmpdir(), 'media-upload-'));
 try {
  const binaries = join(root, 'media'), bin = join(root, 'bin'), calls = join(root, 'calls');
  const longTemp = join(root, 'a-long-temporary-directory-for-macos-sockets');
  await mkdir(binaries); await mkdir(bin); await mkdir(longTemp);
  const bytes = Buffer.from('new-image'), sha256 = createHash('sha256').update(bytes).digest('hex');
  const file = { src: `/media/${sha256}.png`, format: 'png', sha256, bytes: bytes.length, width: 10, height: 20 };
  const manifest = join(root, 'manifest.json');
  await writeFile(join(binaries, `${sha256}.png`), bytes);
  await writeFile(manifest, JSON.stringify({ selected: { ...file, kind: 'image', variants: [], cover: file } }));
  const programs = {
   ssh: '#!/bin/bash\nprintf "%s\\n" "$*" >> "$UPLOAD_TEST_CALLS"\n',
   rsync: '#!/bin/bash\nexit 0\n',
  };
  for (const [name, code] of Object.entries(programs)) { await writeFile(join(bin, name), code); await chmod(join(bin, name), 0o755); }
  const result = spawnSync('bash', ['ops/upload-media.sh', 'ubuntu@82.156.77.131', binaries, manifest, 'selected'], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TMPDIR: longTemp, MEDIA_SSH_CONTROL: '', UPLOAD_TEST_CALLS: calls } });
  if (result.status !== 0) throw new Error(result.stderr);
  const commands = await readFile(calls, 'utf8');
  const control = commands.match(/ControlPath=(\S+)/)?.[1];
  expect(control).toBeDefined();
  // OpenSSH adds a dot and 16 random characters while creating its Unix listener.
  expect(Buffer.byteLength(control!) + 17).toBeLessThan(104);
  expect(commands).toContain(`-S ${control} -O exit`);
  expect(existsSync(dirname(control!))).toBe(false);
 } finally { await rm(root, { recursive: true, force: true }); }
});
