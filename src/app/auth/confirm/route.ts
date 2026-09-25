import {NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
export async function GET(request:Request){
  const url=new URL(request.url);
  const token_hash=url.searchParams.get('token_hash');
  const type=url.searchParams.get('type');
  if(token_hash&&(type==='invite'||type==='recovery')){
    const db=await supabase();
    const {error}=await db.auth.verifyOtp({token_hash,type});
    if(!error)return NextResponse.redirect(new URL('/update-password',url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=link',url.origin));
}
