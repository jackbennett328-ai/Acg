'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { staffSession } from '@/lib/admin';

const uuid = z.string().uuid();
const short = z.string().trim().min(1).max(200);
const optional = z.string().trim().max(5000).optional();
const optionalDate = z.union([z.literal(''),z.iso.date()]);
const customerSchema = z.object({name:short,email:z.union([z.literal(''),z.email()]),phone:z.string().trim().max(40)});
const propertySchema = z.object({customer_id:uuid,label:z.string().trim().max(100),address_line_1:short,town:short,postcode:z.string().trim().min(5).max(10),type:short,membership:z.enum(['','Standard','Premium'])});
const findingSchema = z.object({property_id:uuid,title:short,recommendation:optional,severity:z.enum(['p1','p2','p3','p4']),status:z.enum(['open','in_progress','resolved'])});
const inspectionSchema = z.object({property_id:uuid,performed_on:z.iso.date(),outcome:z.enum(['no_significant_issue','routine_maintenance','repairs_recommended','urgent_specialist_attention']),summary:short,priority_actions:optional,specialist_follow_up:optional,inspector_comment:optional,access_restrictions:optional});
const documentSchema = z.object({property_id:uuid,inspection_id:z.union([z.literal(''),uuid]),kind:z.enum(['property_mot','eicr','gas_safety','epc','boiler_service','photo','other']),title:short,issued_on:optionalDate,expires_on:optionalDate,evidence_status:z.enum(['','current','due_soon','expired','missing','not_required','not_applicable','unverified'])});
const eventSchema = z.object({property_id:uuid,occurred_on:z.iso.date(),title:short,description:optional});
const quoteSchema = z.object({property_id:uuid,title:short,status:z.enum(['requested','draft','sent','accepted','declined','completed']),amount:z.union([z.literal(''),z.coerce.number().nonnegative().max(10000000)])});

function values<T extends z.ZodRawShape>(form:FormData, schema:z.ZodObject<T>): z.output<z.ZodObject<T>> {
  const input = Object.fromEntries([...form.entries()].filter(([,v])=>typeof v==='string'));
  const parsed=schema.safeParse(input);
  if (!parsed.success) redirect('/admin?error=validation');
  return parsed.data;
}
function fail(destination:string):never {redirect(`${destination}?error=save`)}
function done(destination:string):never {revalidatePath('/admin');revalidatePath('/');redirect(`${destination}${destination.includes('?')?'&':'?'}saved=1`)}

export async function saveCustomer(form:FormData) {
  const {db}=await staffSession();const data=values(form,customerSchema);const id=form.get('id');
  const payload={name:data.name,email:data.email||null,phone:data.phone||null};
  const result=id ? await db.from('customers').update(payload).eq('id',uuid.parse(id)).select('id').single() : await db.from('customers').insert(payload).select('id').single();
  if(result.error||!result.data) fail('/admin/customers');done(`/admin/customers/${result.data.id}`);
}
export async function inviteCustomer(form:FormData) {
  const {db,role}=await staffSession();
  if(role!=='admin')redirect('/admin/customers?error=role');
  const customerId=uuid.safeParse(form.get('customer_id'));
  if(!customerId.success)fail('/admin/customers');
  const {data:customer,error}=await db.from('customers').select('id,email').eq('id',customerId.data).single();
  if(error||!customer?.email)fail(`/admin/customers/${customerId.data}`);
  const existing=await db.from('customer_users').select('user_id').eq('customer_id',customerId.data).limit(1);
  if(existing.error||existing.data?.length)fail(`/admin/customers/${customerId.data}`);
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const site=process.env.NEXT_PUBLIC_SITE_URL;
  if(!serviceKey||!site||!/^https:\/\//.test(site))fail(`/admin/customers/${customerId.data}`);
  const privileged=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const invite=await privileged.auth.admin.inviteUserByEmail(customer.email,{redirectTo:`${site}/update-password`});
  if(invite.error||!invite.data.user)fail(`/admin/customers/${customerId.data}`);
  const link=await db.from('customer_users').insert({customer_id:customerId.data,user_id:invite.data.user.id});
  if(link.error)fail(`/admin/customers/${customerId.data}`);
  done(`/admin/customers/${customerId.data}`);
}
export async function saveProperty(form:FormData) {
  const {db}=await staffSession();const data=values(form,propertySchema);const id=form.get('id');
  const payload={...data,label:data.label||null,membership:data.membership||null,postcode:data.postcode.toUpperCase()};
  const {customer_id,...updatePayload}=payload;
  const result=id ? await db.from('properties').update(updatePayload).eq('id',uuid.parse(id)).select('id').single() : await db.from('properties').insert(payload).select('id').single();
  if(result.error||!result.data) fail('/admin/properties');done(`/admin/properties/${result.data.id}`);
}
export async function saveInspection(form:FormData) {
  const {db,user}=await staffSession();const data=values(form,inspectionSchema);
  const payload={...data,priority_actions:data.priority_actions?.split('\n').map((x:string)=>x.trim()).filter(Boolean).slice(0,3)||[],specialist_follow_up:data.specialist_follow_up?.split(',').map((x:string)=>x.trim()).filter(Boolean)||[],created_by:user.id,condition:data.outcome==='no_significant_issue'?'good':data.outcome==='urgent_specialist_attention'?'urgent':'attention'};
  const result=await db.from('inspections').insert(payload).select('id').single();
  if(result.error||!result.data) fail('/admin/inspections');
  const updated=await db.from('properties').update({last_inspection:data.performed_on,condition:payload.condition}).eq('id',data.property_id);
  if(updated.error)fail('/admin/inspections');
  done(`/admin/properties/${data.property_id}`);
}
export async function saveIssue(form:FormData) {
  const {db}=await staffSession();const data=values(form,findingSchema);const id=form.get('id');
  const payload={...data,recommendation:data.recommendation||null,resolved_at:data.status==='resolved'?new Date().toISOString():null};
  const {property_id,...updatePayload}=payload;
  const result=id ? await db.from('issues').update(updatePayload).eq('id',uuid.parse(id)).eq('property_id',property_id) : await db.from('issues').insert(payload);
  if(result.error)fail('/admin/issues');done('/admin/issues');
}
export async function saveService(form:FormData) {
  const {db,user}=await staffSession();const data=values(form,eventSchema);
  const result=await db.from('service_events').insert({...data,created_by:user.id,description:data.description||null});
  if(result.error)fail('/admin/service');done('/admin/service');
}
export async function saveQuote(form:FormData) {
  const {db}=await staffSession();const data=values(form,quoteSchema);
  const result=await db.from('quotes').insert({property_id:data.property_id,title:data.title,status:data.status,amount_pence:data.amount===''?null:Math.round(Number(data.amount)*100)});
  if(result.error)fail('/admin/quotes');done('/admin/quotes');
}
export async function finaliseDocument(input:unknown) {
  const {db,user}=await staffSession();
  const schema=documentSchema.extend({storage_path:z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/i)});
  const parsed=schema.safeParse(input);
  if(!parsed.success)fail('/admin/reports');
  const data=parsed.data;
  if(data.kind==='property_mot'&&!data.inspection_id)fail('/admin/reports');
  if(!data.storage_path.startsWith(`${data.property_id}/`))fail('/admin/reports');
  const property=await db.from('properties').select('id').eq('id',data.property_id).single();
  if(property.error||!property.data)fail('/admin/reports');
  if(data.inspection_id){
    const inspection=await db.from('inspections').select('id').eq('id',data.inspection_id).eq('property_id',data.property_id).single();
    if(inspection.error||!inspection.data)fail('/admin/reports');
  }
  const stored=await db.storage.from('property-documents').download(data.storage_path);
  if(stored.error||!stored.data)fail('/admin/reports');
  const file=stored.data;
  const header=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const pdf=new TextDecoder().decode(header.slice(0,5))==='%PDF-';
  const png=[137,80,78,71,13,10,26,10].every((b,i)=>header[i]===b);
  const jpeg=header[0]===255&&header[1]===216&&header[2]===255;
  const validType=data.kind==='photo' ? (data.storage_path.endsWith('.jpg')&&jpeg)||(data.storage_path.endsWith('.png')&&png) : data.storage_path.endsWith('.pdf')&&pdf;
  if(file.size<8||file.size>25*1024*1024||!validType){
    await db.storage.from('property-documents').remove([data.storage_path]);fail('/admin/reports');
  }
  const saved=await db.from('documents').insert({property_id:data.property_id,inspection_id:data.inspection_id||null,kind:data.kind,title:data.title,issued_on:data.issued_on||null,expires_on:data.expires_on||null,evidence_status:data.evidence_status||'unverified',storage_path:data.storage_path,created_by:user.id});
  if(saved.error){await db.storage.from('property-documents').remove([data.storage_path]);fail('/admin/reports');}
  done('/admin/reports');
}
export async function publishDocument(form:FormData) {
  const {db,user,role}=await staffSession();
  if(role!=='admin')fail('/admin/reports');
  const docId=uuid.safeParse(form.get('document_id'));
  const propertyId=uuid.safeParse(form.get('property_id'));
  if(!docId.success||!propertyId.success||form.get('confirmed')!=='yes')fail('/admin/reports');
  const {data:doc,error}=await db.from('documents').select('id,kind,inspection_id,storage_path,published_at').eq('id',docId.data).eq('property_id',propertyId.data).single();
  if(error||!doc||!doc.storage_path||doc.published_at||(doc.kind==='property_mot'&&!doc.inspection_id))fail('/admin/reports');
  const published=await db.from('documents').update({published_at:new Date().toISOString(),published_by:user.id}).eq('id',docId.data).eq('property_id',propertyId.data).is('published_at',null).select('id').single();
  if(published.error||!published.data)fail('/admin/reports');
  done('/admin/reports');
}
