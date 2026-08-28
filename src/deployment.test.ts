import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface StaticConfig {
  routes: Array<{ route: string; headers?: Record<string, string> }>;
  mimeTypes: Record<string, string>;
  globalHeaders: Record<string, string>;
}

describe('Azure Static Web Apps response policy', () => {
  const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8')) as StaticConfig;

  it('gives hashed application bundles a long immutable cache lifetime', () => {
    const assets = config.routes.find((route) => route.route === '/_app/*');
    expect(assets?.headers?.['Cache-Control']).toMatch(/max-age=31536000/);
    expect(assets?.headers?.['Cache-Control']).toContain('immutable');
    expect(config.routes.find((route) => route.route === '/sw.js')?.headers?.['Cache-Control']).toContain('no-cache');
  });

  it('serves the web manifest with its standard media type', () => {
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json');
  });

  it('ships restrictive browser security headers while allowing required billing calls', () => {
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain('https://api.sociobot.in');
    expect(config.globalHeaders['Permissions-Policy']).toContain('microphone=(self)');
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');
  });
});
