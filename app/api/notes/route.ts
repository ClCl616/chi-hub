import { NextResponse } from 'next/server';
import { errorMessage, getAuthContext } from '@/lib/supabase/auth';

export async function GET() {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const { data, error } = await supabase
      .from('notes')
      .select('id,title,content,pinned,content_type,category,drawing_data,created_at,updated_at')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(200);
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
    const title = String(body.title ?? '')
      .trim()
      .slice(0, 120);
    const content = String(body.content ?? '').slice(0, 50_000);
    if (!title && !content.trim())
      return NextResponse.json(
        { message: '메모 내용을 입력해주세요.' },
        { status: 400 },
      );
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title,
        content,
        pinned: Boolean(body.pinned),category: typeof body.category==='string'?body.category.slice(0,40):'개인',content_type: typeof body.contentType==='string'?body.contentType:'markdown',drawing_data: typeof body.contentType==='string'&&body.contentType==='drawing'?content:null,
      })
      .select()
      .single();
    if (error) throw error;
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
    const id = String(body.id ?? '');
    if (!id)
      return NextResponse.json(
        { message: '메모를 선택해주세요.' },
        { status: 400 },
      );
    const updates: {
      title?: string;
      content?: string;
      pinned?: boolean;
      category?: string; content_type?: string; drawing_data?: string|null;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (typeof body.title === 'string')
      updates.title = body.title.trim().slice(0, 120);
    if (typeof body.content === 'string')
      updates.content = body.content.slice(0, 50_000);
    if (typeof body.pinned === 'boolean') updates.pinned = body.pinned;
    if(typeof body.category==='string')updates.category=body.category.slice(0,40);if(typeof body.contentType==='string'&&['markdown','sticky','drawing'].includes(body.contentType)){updates.content_type=body.contentType;updates.drawing_data=body.contentType==='drawing'?String(body.content??''):null;}
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
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
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
