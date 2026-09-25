import { configured, supabase } from './supabase';
import { demoDocuments, demoInspections, demoIssues, demoProperties } from './demo';
export {date,expiry} from './dates';

export async function getPortalData() {
  if (!configured()) {
    if (process.env.NODE_ENV !== 'development') throw new Error('The portal is not configured.');
    return {demo:true, properties:demoProperties, documents:demoDocuments, issues:demoIssues, inspections:demoInspections, service:[], quotes:[],user:null};
  }
  const db = await supabase();
  const {data:{user}} = await db.auth.getUser();
  if (!user) return {demo:false, properties:[], documents:[], issues:[], inspections:[],service:[],quotes:[], user:null};
  const [p,d,i,n,s,q] = await Promise.all([
    db.from('properties').select('id,label,address_line_1,town,postcode,type,condition,membership,last_inspection,next_inspection,photo_url').order('created_at',{ascending:false}),
    db.from('documents').select('id,property_id,kind,title,issued_on,expires_on,evidence_status,storage_path').order('created_at',{ascending:false}),
    db.from('issues').select('id,property_id,title,severity,status,recommendation').order('created_at',{ascending:false}),
    db.from('inspections').select('id,property_id,performed_on,summary,condition,outcome,priority_actions,specialist_follow_up,inspector_comment,access_restrictions').order('performed_on',{ascending:false}),
    db.from('service_events').select('id,property_id,occurred_on,title,description').order('occurred_on',{ascending:false}),
    db.from('quotes').select('id,property_id,title,status,amount_pence').order('created_at',{ascending:false})
  ]);
  if ([p,d,i,n,s,q].some(x=>x.error)) throw new Error('Unable to load your property information. Please try again.');
  return {demo:false,properties:p.data??[],documents:d.data??[],issues:i.data??[],inspections:n.data??[],service:s.data??[],quotes:q.data??[],user};
}
