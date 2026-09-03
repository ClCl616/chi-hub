import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedNext = url.searchParams.get('next') ?? '/';
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/';
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error || !data.url) throw error ?? new Error('OAuth URL이 없습니다.');
    return NextResponse.redirect(data.url);
  } catch {
    return NextResponse.redirect(
      new URL('/login?error=google-config', url.origin),
    );
  }
}
