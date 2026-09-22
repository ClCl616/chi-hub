import { NextResponse } from 'next/server';
import { errorMessage, getAuthContext } from '@/lib/supabase/auth';

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const trash = new URL(request.url).searchParams.get('trash') === 'true';
    let query = supabase
      .from('files')
      .select(
        'id,name,storage_path,mime_type,size_bytes,created_at,deleted_at,purge_started_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000);
    query = trash
      ? query.not('deleted_at', 'is', null)
      : query.is('deleted_at', null);
    const { data, error } = await query;
    if (error) throw error;
    const files = await Promise.all(
      (data ?? []).map(async (file) => {
        if (trash) return { ...file, url: null };
        const { data: signed } = await supabase.storage
          .from('private-files')
          .createSignedUrl(file.storage_path, 300, { download: file.name });
        return { ...file, url: signed?.signedUrl ?? null };
      }),
    );
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File))
      return NextResponse.json(
        { message: '파일을 선택해주세요.' },
        { status: 400 },
      );
    if (file.size > 500 * 1024 * 1024)
      return NextResponse.json(
        { message: '파일은 500MB 이하만 업로드할 수 있습니다.' },
        { status: 400 },
      );
    // Keep storage object keys ASCII-only while preserving the original
    // filename in the database for display and downloads.
    const safeName =
      file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'file';
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('private-files')
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
    if (uploadError) throw uploadError;
    const { data, error } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        name: file.name.slice(0, 255),
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
      })
      .select()
      .single();
    if (error) {
      await supabase.storage.from('private-files').remove([path]);
      throw error;
    }
    return NextResponse.json({ file: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const id = new URL(request.url).searchParams.get('id');
    if (!id)
      return NextResponse.json(
        { message: '파일을 선택해주세요.' },
        { status: 400 },
      );
    const { data, error: deleteError } = await supabase
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!data)
      return NextResponse.json(
        { message: '파일이 없거나 이미 휴지통에 있습니다.' },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const body = await request.json();
    if (typeof body.id !== 'string')
      return NextResponse.json(
        { message: '파일을 선택해주세요.' },
        { status: 400 },
      );
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabase
      .from('files')
      .update({ deleted_at: null })
      .eq('id', body.id)
      .eq('user_id', user.id)
      .is('purge_started_at', null)
      .gt('deleted_at', cutoff)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { message: '보관 기간이 지났거나 복원할 수 없는 파일입니다.' },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
