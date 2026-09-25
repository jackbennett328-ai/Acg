import {NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
export async function POST(request:Request){const db=await supabase();await db.auth.signOut();return NextResponse.redirect(new URL('/login',request.url),303)}
