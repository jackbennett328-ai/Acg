'use server';
import {redirect} from 'next/navigation';
import {z} from 'zod';
import {supabase} from '@/lib/supabase';
export async function requestQuote(form:FormData){
  const id=z.string().uuid().safeParse(form.get('property_id'));
  const text=z.string().trim().min(10).max(1000).safeParse(form.get('details'));
  if(!id.success||!text.success)redirect('/?request=invalid');
  const db=await supabase();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
  const {error}=await db.from('quotes').insert({property_id:id.data,title:text.data,status:'requested',amount_pence:null});
  if(error)redirect(`/properties/${id.data}?request=error`);
  redirect(`/properties/${id.data}?request=sent`);
}
