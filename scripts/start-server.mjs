import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvironment } from './environment.mjs';

// Caddy is the only public entry point and supplies HTTPS proxy headers.
const site = loadEnvironment();
process.env.HOST = '127.0.0.1';
process.env.PORT ??= '3000';
process.env.VINEXT_TRUSTED_HOSTS = site.host;
const entry = resolve('dist/standalone/server.js');
if (!existsSync(entry)) throw new Error('Production build missing. Run npm run build first.');
await import(pathToFileURL(entry).href);
