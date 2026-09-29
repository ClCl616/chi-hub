import { NextResponse } from 'next/server';
import { errorMessage, getAuthContext } from '@/lib/supabase/auth';
import { validDate } from '@/lib/calendar';

const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const jsonError = (message: string, status = 400) =>
  NextResponse.json({ message }, { status });
function itemInput(body: Record<string, unknown>) {
  if (
    typeof body.title !== 'string' ||
    !body.title.trim() ||
    body.title.length > 160 ||
    typeof body.content !== 'string' ||
    body.content.length > 20000 ||
    typeof body.subject !== 'string' ||
    !body.subject.trim() ||
    body.subject.length > 60 ||
    !validDate(body.due_date)
  )
    return null;
  return {
    title: body.title.trim(),
    content: body.content,
    subject: body.subject.trim(),
    due_date: body.due_date,
  };
}
export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user) return jsonError('로그인이 필요합니다.', 401);
    const params = new URL(request.url).searchParams;
    const scope = params.get('scope') ?? 'all';
    const today = params.get('today');
    if (scope === 'today' && !validDate(today))
      return jsonError('날짜를 확인해주세요.');
    const page = Number(params.get('page') ?? 0);
    if (!Number.isInteger(page) || page < 0 || page > 10000)
      return jsonError('페이지를 확인해주세요.');
    let query = supabase
      .from('study_items')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('archived', scope === 'archived');
    if (scope === 'today') query = query.lte('due_date', today!);
    const search = (params.get('q') ?? '').slice(0, 160);
    if (search)
      query = query.ilike(
        'title',
        '%' + search.replace(/[\\%_]/g, '\\$&') + '%',
      );
    const [items, history] = await Promise.all([
      query
        .order('due_date')
        .order('id')
        .range(page * 30, page * 30 + 29),
      supabase
        .from('study_reviews')
        .select('id,item_id,rating,reviewed_on,next_due_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (items.error || history.error) throw items.error ?? history.error;
    return NextResponse.json({
      items: items.data,
      total: items.count ?? 0,
      reviews: history.data,
    });
  } catch (error) {
    return jsonError(errorMessage(error), 503);
  }
}
export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user) return jsonError('로그인이 필요합니다.', 401);
    const body = await request.json();
    if (!body || typeof body !== 'object')
      return jsonError('학습 내용을 확인해주세요.');
    const input = itemInput(body);
    if (!input || !uuid(body.id))
      return jsonError('제목, 과목, 내용과 복습일을 확인해주세요.');
    const { error } = await supabase
      .from('study_items')
      .upsert(
        { id: body.id, user_id: user.id, ...input },
        { onConflict: 'id', ignoreDuplicates: true },
      );
    if (error) throw error;
    const { data, error: readError } = await supabase
      .from('study_items')
      .select('*')
      .eq('id', body.id)
      .eq('user_id', user.id)
      .single();
    if (readError) throw readError;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return jsonError(errorMessage(error), 503);
  }
}
export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user) return jsonError('로그인이 필요합니다.', 401);
    const body = await request.json();
    if (!body || !uuid(body.id)) return jsonError('학습 항목을 선택해주세요.');
    if (body.action === 'review') {
      if (
        !uuid(body.request_id) ||
        !['again', 'good', 'easy'].includes(body.rating) ||
        !Number.isInteger(body.expected_count) ||
        body.expected_count < 0 ||
        !validDate(body.reviewed_on)
      )
        return jsonError('복습 기록을 확인해주세요.');
      const { data, error } = await supabase.rpc('review_study_item', {
        target_id: body.id,
        request_id: body.request_id,
        expected_count: body.expected_count,
        rating: body.rating,
        reviewed_on: body.reviewed_on,
      });
      if (error)
        return jsonError(
          '다른 창에서 변경되었거나 저장하지 못했습니다. 목록을 새로고침하고 확인해주세요.',
          409,
        );
      return NextResponse.json({ item: data });
    }
    const input =
      body.action === 'archive' && typeof body.archived === 'boolean'
        ? { archived: body.archived }
        : body.action === 'edit'
          ? itemInput(body)
          : null;
    if (!input || typeof body.updated_at !== 'string')
      return jsonError('학습 내용을 확인해주세요.');
    const { data, error } = await supabase
      .from('study_items')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', user.id)
      .eq('updated_at', body.updated_at)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return jsonError(
        '다른 창에서 변경되었습니다. 목록을 새로고침하고 다시 열어주세요.',
        409,
      );
    return NextResponse.json({ item: data });
  } catch (error) {
    return jsonError(errorMessage(error), 503);
  }
}
