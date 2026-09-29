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
      .from('notes')
      .select(
        'id,title,content,pinned,content_type,category,drawing_data,created_at,updated_at,deleted_at',
      )
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(200);
    query = trash
      ? query.not('deleted_at', 'is', null)
      : query.is('deleted_at', null);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ notes: data });
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
    const body = (await request.json()) as Record<
      string,
      string | number | boolean | null | undefined
    >;
    if (typeof body.content === 'string' && body.content.length > 50000)
      return NextResponse.json(
        {
          message:
            '메모는 최대 50,000자까지 저장할 수 있습니다. 내용을 줄여주세요.',
        },
        { status: 400 },
      );
    const title = String(body.title ?? '')
      .trim()
      .slice(0, 120);
    const content = String(body.content ?? '').slice(0, 50_000);
    const id =
      typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id)
        ? body.id
        : crypto.randomUUID();
    if (!title && !content.trim())
      return NextResponse.json(
        { message: '메모 내용을 입력해주세요.' },
        { status: 400 },
      );
    const { data, error } = await supabase
      .from('notes')
      .upsert({
        id,
        user_id: user.id,
        title,
        content,
        updated_at: new Date().toISOString(),
        pinned: Boolean(body.pinned),
        category:
          typeof body.category === 'string'
            ? body.category.slice(0, 40)
            : '개인',
        content_type:
          typeof body.contentType === 'string' ? body.contentType : 'markdown',
        drawing_data:
          typeof body.contentType === 'string' && body.contentType === 'drawing'
            ? content
            : null,
      })
      .select()
      .single();
    if (error) throw error;
    if (data.deleted_at)
      return NextResponse.json(
        { message: '휴지통의 메모는 복원한 뒤 수정해주세요.' },
        { status: 409 },
      );
    return NextResponse.json({ note: data }, { status: 201 });
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
    const body = (await request.json()) as Record<
      string,
      string | number | boolean | null | undefined
    >;
    if (typeof body.content === 'string' && body.content.length > 50000)
      return NextResponse.json(
        {
          message:
            '메모는 최대 50,000자까지 저장할 수 있습니다. 내용을 줄여주세요.',
        },
        { status: 400 },
      );
    const id = String(body.id ?? '');
    if (!id)
      return NextResponse.json(
        { message: '메모를 선택해주세요.' },
        { status: 400 },
      );
    if (body.action === 'restore') {
      const { data, error } = await supabase
        .from('notes')
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .gt('deleted_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return NextResponse.json(
          { message: '보관 기간이 지났거나 복원할 수 없는 메모입니다.' },
          { status: 409 },
        );
      return NextResponse.json({ note: data });
    }
    const updates: {
      title?: string;
      content?: string;
      pinned?: boolean;
      category?: string;
      content_type?: string;
      drawing_data?: string | null;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (typeof body.title === 'string')
      updates.title = body.title.trim().slice(0, 120);
    if (typeof body.content === 'string')
      updates.content = body.content.slice(0, 50_000);
    if (typeof body.pinned === 'boolean') updates.pinned = body.pinned;
    if (typeof body.category === 'string')
      updates.category = body.category.slice(0, 40);
    if (
      typeof body.contentType === 'string' &&
      ['markdown', 'sticky', 'drawing'].includes(body.contentType)
    ) {
      updates.content_type = body.contentType;
      updates.drawing_data =
        body.contentType === 'drawing' ? String(body.content ?? '') : null;
    }
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ note: data });
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
        { message: '메모를 선택해주세요.' },
        { status: 400 },
      );
    const { data, error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { message: '메모가 없거나 이미 휴지통에 있습니다.' },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
