import { NextResponse } from 'next/server';
import { errorMessage, getAuthContext } from '@/lib/supabase/auth';
import { attachmentHeader } from '@/lib/download';

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !/^[0-9a-f-]{36}$/i.test(id))
      return NextResponse.json(
        { message: '파일을 선택해주세요.' },
        { status: 400 },
      );
    const { data: file, error } = await supabase
      .from('files')
      .select('name,storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    if (!file)
      return NextResponse.json(
        { message: '파일을 찾을 수 없습니다.' },
        { status: 404 },
      );
    const { data: signed, error: signError } = await supabase.storage
      .from('private-files')
      .createSignedUrl(file.storage_path, 60);
    if (signError) throw signError;
    const upstream = await fetch(signed.signedUrl, {
      signal: request.signal,
      cache: 'no-store',
    });
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel();
      return NextResponse.json(
        { message: '다운로드하지 못했습니다. 다시 시도해주세요.' },
        { status: 502 },
      );
    }
    // Stream large files without buffering the entire file in browser/server memory.
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': attachmentHeader(file.name),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
