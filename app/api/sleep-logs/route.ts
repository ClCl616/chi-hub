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
      .from('sleep_logs')
      .select('id,slept_at,woke_at,quality,note,created_at')
      .order('woke_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return NextResponse.json({ logs: data });
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
    const sleptAt = new Date(String(body.sleptAt ?? ''));
    const wokeAt = new Date(String(body.wokeAt ?? ''));
    if (
      !Number.isFinite(sleptAt.getTime()) ||
      !Number.isFinite(wokeAt.getTime()) ||
      wokeAt <= sleptAt
    )
      return NextResponse.json(
        { message: '취침·기상 시간을 확인해주세요.' },
        { status: 400 },
      );
    const quality = Number(body.quality);
    const { data, error } = await supabase
      .from('sleep_logs')
      .insert({
        user_id: user.id,
        slept_at: sleptAt.toISOString(),
        woke_at: wokeAt.toISOString(),
        quality: quality >= 1 && quality <= 5 ? quality : null,
        note:
          String(body.note ?? '')
            .trim()
            .slice(0, 300) || null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ log: data }, { status: 201 });
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
    const { error } = await supabase.from('sleep_logs').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
