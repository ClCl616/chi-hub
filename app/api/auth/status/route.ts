import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(){try{const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({user:null},{status:401});return NextResponse.json({user:{id:user.id,email:user.email}})}catch{return NextResponse.json({message:'인증 서비스를 확인할 수 없습니다.'},{status:503})}}
