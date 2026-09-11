import { spawnSync } from 'node:child_process';
import { cp, rm } from 'node:fs/promises';
for (const locale of ['en', 'zh']) {
 await rm(`.build/${locale}`, { recursive: true, force: true });
 const result = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { stdio: 'inherit', env: { ...process.env, SITE_LOCALE: locale } });
 if (result.status !== 0) process.exit(result.status ?? 1);
}
await rm('dist', { recursive: true, force: true });
await cp('.build/en', 'dist', { recursive: true });
await cp('.build/zh', 'dist/zh', { recursive: true });
// Both local preview roots retain assets; production also seeds these into shared storage.
await cp('.build/zh/_astro', 'dist/_astro', { recursive: true });
const validation = spawnSync('bun', ['run', 'test:output'], { stdio: 'inherit' });
if (validation.status !== 0) process.exit(validation.status ?? 1);
