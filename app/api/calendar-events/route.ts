import { eventInput } from '@/lib/calendar';
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
      .from('calendar_events')
      .select('*')
      .order('event_date')
      .limit(300);
    if (error) throw error;
    return NextResponse.json({ events: data });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
async function write(request: Request, editing: boolean) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const body = await request.json();
    let values;
    try {
      values = eventInput(body);
    } catch (error) {
      return NextResponse.json(
        { message: errorMessage(error) },
        { status: 400 },
      );
    }
    if (editing && typeof body.id !== 'string')
      return NextResponse.json(
        { message: '일정을 선택해주세요.' },
        { status: 400 },
      );
    const query = editing
      ? supabase
          .from('calendar_events')
          .update(values)
          .eq('id', body.id)
          .eq('user_id', user.id)
      : supabase
          .from('calendar_events')
          .insert({ ...values, user_id: user.id });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return NextResponse.json({ event: data }, { status: editing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
export async function POST(request: Request) {
  return write(request, false);
}
export async function PATCH(request: Request) {
  return write(request, true);
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
        { message: '일정을 선택해주세요.' },
        { status: 400 },
      );
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
