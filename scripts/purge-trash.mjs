// Scheduled on the Windows server; never load this credential into browser code.
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { purgeTrash } from './trash-worker.mjs';

const envFile =
  process.env.TRASH_ENV_FILE ?? 'C:/Services/chi-hub-maintenance/trash.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the protected trash worker environment file.',
  );
}
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const count = await purgeTrash(client);
console.log(`Trash cleanup completed: ${count} expired files removed.`);
