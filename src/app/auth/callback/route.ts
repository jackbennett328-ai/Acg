import {NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
import {postAuthDestination} from '@/lib/redirect';
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get('code');const destination=postAuthDestination(url.searchParams.get('next'));if(code){const db=await supabase();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(destination,url.origin))}return NextResponse.redirect(new URL('/login?error=link',url.origin))}
