import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get('code');if(code){try{const supabase=await createClient();await supabase.auth.exchangeCodeForSession(code)}catch{return NextResponse.redirect(new URL('/login?error=callback',url.origin))}}return NextResponse.redirect(new URL('/',url.origin))}
