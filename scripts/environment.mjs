import { existsSync } from 'node:fs';

export function loadEnvironment() {
  process.env.NODE_ENV = 'production';
  for (const name of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    if (existsSync(name)) process.loadEnvFile(name);
  }
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SITE_URL']) {
    const value = process.env[name];
    if (!value || value.includes('your-project') || value === 'your-anon-key') {
      throw new Error(`Configure ${name} in .env.local before building or starting.`);
    }
  }
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const site = new URL(process.env.NEXT_PUBLIC_SITE_URL);
  for (const url of [supabase, site]) {
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Environment URLs must use HTTP or HTTPS.');
  }
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let role;
  try { role = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()).role; } catch {}
  if (key.startsWith('sb_secret_') || role === 'service_role') {
    throw new Error('Use a public Supabase anon/publishable key, never a service role or secret key.');
  }
  return site;
}
