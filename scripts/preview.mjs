import { preview } from 'astro';
import { parseArgs } from 'node:util';

const locales = { en: { outDir: './dist', port: 4321 }, zh: { outDir: './dist/zh', port: 4322 } };
const locale = process.env.SITE_LOCALE ?? 'en';
if (!Object.hasOwn(locales, locale)) throw new Error('SITE_LOCALE must be en or zh');
const selected = locales[locale];
const { values } = parseArgs({ options: { port: { type: 'string' } } });
const port = Number(values.port ?? selected.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port');
// The public API starts this process's server without the CLI's project-wide daemon lock.
const server = await preview({ outDir: selected.outDir, server: { host: '127.0.0.1', port } });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.stop(); process.exit(0); });
