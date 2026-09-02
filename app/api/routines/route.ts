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
    const [
      { data: routines, error: routineError },
      { data: checks, error: checkError },
    ] = await Promise.all([
      supabase
        .from('routines')
        .select('id,title,position,active,created_at')
        .order('position'),
      supabase
        .from('routine_checks')
        .select('id,routine_id,checked_on')
        .order('checked_on', { ascending: false })
        .limit(500),
    ]);
    if (routineError || checkError) throw routineError ?? checkError;
    return NextResponse.json({ routines, checks });
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
      .slice(0, 80);
    if (!title)
      return NextResponse.json(
        { message: '루틴 이름을 입력해주세요.' },
        { status: 400 },
      );
    const { count } = await supabase
      .from('routines')
      .select('*', { count: 'exact', head: true });
    const { data, error } = await supabase
      .from('routines')
      .insert({ user_id: user.id, title, position: count ?? 0 })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ routine: data }, { status: 201 });
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
        { message: '루틴을 선택해주세요.' },
        { status: 400 },
      );
    if (typeof body.checked === 'boolean') {
      const date =
        typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
          ? body.date
          : new Date().toISOString().slice(0, 10);
      if (body.checked) {
        const { error } = await supabase
          .from('routine_checks')
          .upsert(
            { user_id: user.id, routine_id: id, checked_on: date },
            { onConflict: 'routine_id,checked_on' },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('routine_checks')
          .delete()
          .eq('routine_id', id)
          .eq('checked_on', date);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }
    const updates: { title?: string; active?: boolean; position?: number } = {};
    if (typeof body.title === 'string' && body.title.trim())
      updates.title = body.title.trim().slice(0, 80);
    if (typeof body.active === 'boolean') updates.active = body.active;
    if (typeof body.position === 'number' && Number.isInteger(body.position))
      updates.position = body.position;
    const { error } = await supabase
      .from('routines')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
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
        { message: '루틴을 선택해주세요.' },
        { status: 400 },
      );
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
