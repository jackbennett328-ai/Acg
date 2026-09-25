import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { supabase } from './supabase';

export async function staffSession() {
  const db = await supabase();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect('/login');
  const { data, error: roleError } = await db.from('staff_users').select('role').eq('user_id', user.id).single();
  if (roleError || !data || !['staff','admin'].includes(data.role)) notFound();
  return {db, user, role: data.role as 'staff'|'admin'};
}

export function safeQuery(value:string|undefined|null) {
  return typeof value==='string' ? value.slice(0,100).trim() : '';
}
