import { createClient } from '@/lib/supabase/server';

export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
}
