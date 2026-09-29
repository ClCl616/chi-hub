import { NextResponse } from 'next/server';
import { getAuthContext, errorMessage } from '@/lib/supabase/auth';
import {
  emptyPreferences,
  validPreference,
  type PreferenceKey,
} from '@/lib/workspace-preferences';

export async function GET() {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const { data, error } = await supabase
      .from('workspace_preferences')
      .select('key,value,version')
      .eq('user_id', user.id);
    if (error) throw error;
    const preferences = { ...emptyPreferences },
      versions: Partial<Record<PreferenceKey, string>> = {};
    for (const row of data ?? [])
      if (validPreference(row.key, row.value)) {
        preferences[row.key] = row.value;
        versions[row.key] = row.version;
      }
    return NextResponse.json({ preferences, versions });
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
      !body ||
      !validPreference(body.key, body.value) ||
      !(
        body.version === null ||
        (typeof body.version === 'string' &&
          /^[0-9a-f-]{36}$/i.test(body.version))
      )
    )
      return NextResponse.json(
        { message: '올바른 설정 값을 입력해주세요.' },
        { status: 400 },
      );
    const version = crypto.randomUUID();
    const query =
      body.version === null
        ? supabase
            .from('workspace_preferences')
            .insert({
              user_id: user.id,
              key: body.key,
              value: body.value,
              version,
            })
        : supabase
            .from('workspace_preferences')
            .update({ value: body.value, version })
            .eq('user_id', user.id)
            .eq('key', body.key)
            .eq('version', body.version);
    const { data, error } = await query
      .select('key,value,version')
      .maybeSingle();
    if (error?.code === '23505' || (!error && !data))
      return NextResponse.json(
        {
          message:
            '다른 화면에서 설정이 변경되었습니다. 최신 상태를 확인하고 다시 시도해주세요.',
        },
        { status: 409 },
      );
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
