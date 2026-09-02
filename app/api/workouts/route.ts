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
      .from('workout_logs')
      .select('id,title,workout_date,duration_minutes,note,created_at')
      .order('workout_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ workouts: data });
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
    const duration = Number(body.durationMinutes);
    if (
      !title ||
      typeof body.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
      !Number.isFinite(duration) ||
      duration < 1 ||
      duration > 1440
    )
      return NextResponse.json(
        { message: '운동 이름, 날짜, 시간을 확인해주세요.' },
        { status: 400 },
      );
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: user.id,
        title,
        workout_date: body.date,
        duration_minutes: Math.round(duration),
        note:
          String(body.note ?? '')
            .trim()
            .slice(0, 500) || null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ workout: data }, { status: 201 });
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
        { message: '기록을 선택해주세요.' },
        { status: 400 },
      );
    const { error } = await supabase.from('workout_logs').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
