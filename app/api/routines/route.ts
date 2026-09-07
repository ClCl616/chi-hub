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
        .select('id,title,position,active,repeat_type,repeat_days,created_at')
        .order('position'),
      supabase
        .from('routine_checks')
        .select('id,routine_id,checked_on,completed_at')
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
    const body = (await request.json()) as Record<string, unknown>;
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
    const repeatType = body.repeat_type === 'weekly' ? 'weekly' : 'daily';
    const repeatDays = Array.isArray(body.repeat_days)
      ? body.repeat_days
          .filter((value): value is number => typeof value === 'number')
          .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
      : [];
    if (repeatType === 'weekly' && repeatDays.length === 0)
      return NextResponse.json(
        { message: '반복할 요일을 하나 이상 선택해주세요.' },
        { status: 400 },
      );
    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        title,
        position: count ?? 0,
        repeat_type: repeatType,
        repeat_days: repeatType === 'weekly' ? repeatDays : [],
      })
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
    const body = (await request.json()) as Record<string, unknown>;
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
            {
              user_id: user.id,
              routine_id: id,
              checked_on: date,
              completed_at: new Date().toISOString(),
            },
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
    const updates: {
      title?: string;
      active?: boolean;
      position?: number;
      repeat_type?: 'daily' | 'weekly';
      repeat_days?: number[];
    } = {};
    if (typeof body.title === 'string' && body.title.trim())
      updates.title = body.title.trim().slice(0, 80);
    if (typeof body.active === 'boolean') updates.active = body.active;
    if (typeof body.position === 'number' && Number.isInteger(body.position))
      updates.position = body.position;
    if (body.repeat_type === 'daily' || body.repeat_type === 'weekly') {
      const repeatDays = Array.isArray(body.repeat_days)
        ? body.repeat_days
            .filter((value): value is number => typeof value === 'number')
            .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
        : [];
      if (body.repeat_type === 'weekly' && repeatDays.length === 0)
        return NextResponse.json(
          { message: '반복할 요일을 하나 이상 선택해주세요.' },
          { status: 400 },
        );
      updates.repeat_type = body.repeat_type;
      updates.repeat_days = body.repeat_type === 'weekly' ? repeatDays : [];
    }
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
