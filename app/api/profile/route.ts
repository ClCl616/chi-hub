import { NextResponse } from 'next/server';
import { getAuthContext, errorMessage } from '@/lib/supabase/auth';
export async function GET() {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      profile: {
        email: user.email ?? '',
        displayName: data?.display_name ?? '',
        createdAt: user.created_at,
      },
    });
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
    const body = await request.json().catch(() => null);
    if (
      typeof body?.displayName !== 'string' ||
      !body.displayName.trim() ||
      body.displayName.trim().length > 60
    )
      return NextResponse.json(
        { message: '이름은 1~60자로 입력해주세요.' },
        { status: 400 },
      );
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: body.displayName.trim(),
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
