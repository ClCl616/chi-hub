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
    const { data: activeSleep, error: activeError } = await supabase
      .from('sleep_logs')
      .select('id,slept_at,woke_at,quality,note,created_at')
      .is('woke_at', null)
      .maybeSingle();
    if (activeError) throw activeError;
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('id,slept_at,woke_at,quality,note,created_at')
      .order('woke_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return NextResponse.json({ logs: data, activeSleep });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}

export async function POST() {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const sleptAt = new Date();
    if (!Number.isFinite(sleptAt.getTime()))
      return NextResponse.json(
        { message: '취침 시작 시간을 확인해주세요.' },
        { status: 400 },
      );
    const { data, error } = await supabase
      .from('sleep_logs')
      .insert({
        user_id: user.id,
        slept_at: sleptAt.toISOString(),
        woke_at: null,
        quality: null,
        note: null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ log: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const body = (await request.json()) as Record<string, string | number | null | undefined>;
    const id = String(body.id ?? '');
    const quality = Number(body.quality);
    if (!id) return NextResponse.json({ message: '진행 중인 수면 기록이 없습니다.' }, { status: 400 });
    const { data: active, error: findError } = await supabase
      .from('sleep_logs')
      .select('slept_at')
      .eq('id', id)
      .is('woke_at', null)
      .single();
    if (findError) throw findError;
    if (new Date() <= new Date(active.slept_at))
      return NextResponse.json({ message: '수면 시간이 너무 짧습니다. 잠시 후 다시 시도해주세요.' }, { status: 400 });
    const { data, error } = await supabase
      .from('sleep_logs')
      .update({
        woke_at: new Date().toISOString(),
        quality: quality >= 1 && quality <= 5 ? quality : null,
        note: String(body.note ?? '').trim().slice(0, 300) || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ log: data });
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
