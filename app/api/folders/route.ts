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
      .from('drive_folders')
      .select('id,name,parent_id,deleted_at,trash_root_id,created_at')
      .eq('user_id', user.id)
      .order('name')
      .limit(5000);
    if (error) throw error;
    return NextResponse.json({ folders: data });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 503 });
  }
}
async function write(request: Request, method: string) {
  try {
    const { supabase, user } = await getAuthContext();
    if (!user)
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      );
    const body = await request.json();
    let result;
    if (method === 'DELETE' || body.action === 'restore')
      result = await supabase.rpc('trash_drive_folder', {
        folder: body.id,
        restore: body.action === 'restore',
      });
    else {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 120)
        return NextResponse.json(
          { message: '폴더 이름을 1~120자로 입력해주세요.' },
          { status: 400 },
        );
      result =
        method === 'POST'
          ? await supabase
              .from('drive_folders')
              .insert({
                user_id: user.id,
                name,
                parent_id: body.parent_id || null,
              })
          : await supabase
              .from('drive_folders')
              .update({ name })
              .eq('id', body.id)
              .eq('user_id', user.id)
              .is('deleted_at', null)
              .select('id')
              .single();
    }
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 409 });
  }
}
export async function POST(request: Request) {
  return write(request, 'POST');
}
export async function PATCH(request: Request) {
  return write(request, 'PATCH');
}
export async function DELETE(request: Request) {
  return write(request, 'DELETE');
}
