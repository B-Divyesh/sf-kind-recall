import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : join(dir, entry.name)));
  return nested.flat();
}

const all = (await files('dist')).filter((path) => !path.endsWith('/sw.js') && !path.endsWith('sw.js') && !path.endsWith('staticwebapp.config.json'));
const urls = all.map((path) => `/${relative('dist', path).replaceAll('\\\\', '/')}`).sort();
const template = await readFile('scripts/sw.template.js', 'utf8');
const cacheVersion = createHash('sha256').update(JSON.stringify(urls)).digest('hex').slice(0, 10);
await writeFile('dist/sw.js', template.replace('__CACHE_VERSION__', cacheVersion).replace('__PRECACHE__', JSON.stringify(urls)), 'utf8');
