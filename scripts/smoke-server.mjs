// Run after building with the same dummy env below. No production data is used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

const port = '13001';
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['scripts/start-server.mjs'], {
  env: { ...process.env, PORT: port, NEXT_PUBLIC_SUPABASE_URL: 'https://smoke-test.invalid',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'smoke-test-anon-key', NEXT_PUBLIC_SITE_URL: 'https://chi-hub.kro.kr' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (data) => { output += data; });
child.stderr.on('data', (data) => { output += data; });
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try { ready = (await fetch(`${base}/api/health`)).ok; } catch {}
    if (ready) break;
    await sleep(250);
  }
  assert.ok(ready, 'Production server starts');
  for (const path of ['/', '/login', '/?view=meals', '/manifest.webmanifest']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
  }
  const html = await (await fetch(`${base}/login`)).text();
  const asset = html.match(/(?:src|href)="([^" ]+\.js)"/)?.[1];
  assert.ok(asset, 'SSR emits a client script');
  assert.equal((await fetch(new URL(asset, base))).status, 200, 'Client asset available');
  assert.equal((await fetch(`${base}/api/auth/status`)).status, 401);
  assert.equal((await fetch(`${base}/api/files`)).status, 401);
  const oldRoute = await fetch(`${base}/meals`, { redirect: 'manual' });
  assert.ok([301, 302, 307, 308].includes(oldRoute.status));
  assert.ok(oldRoute.headers.get('location')?.endsWith('/?view=meals'));
  const callback = await fetch(`${base}/auth/callback?next=%2F%3Fview%3Dmeals`, {
    redirect: 'manual', headers: { 'x-forwarded-host': 'chi-hub.kro.kr', 'x-forwarded-proto': 'https' },
  });
  assert.equal(callback.headers.get('location'), 'https://chi-hub.kro.kr/?view=meals');
  const malicious = await fetch(`${base}/auth/callback?next=//evil.invalid`, {
    redirect: 'manual', headers: { 'x-forwarded-host': 'evil.invalid' },
  });
  assert.equal(malicious.headers.get('location'), base + '/');
  console.log('PASS: production SSR, assets, auth guards, redirects, trusted proxy and open-redirect checks.');
} finally {
  if (child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
}
