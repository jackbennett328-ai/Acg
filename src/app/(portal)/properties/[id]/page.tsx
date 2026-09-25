import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {ArrowLeft,CalendarClock,CheckCircle2,FileText,House,Wrench} from 'lucide-react';
import {Shell} from '@/components/shell';
import {getPortalData,date,expiry} from '@/lib/data';
import {configured,supabase} from '@/lib/supabase';
import {requestQuote} from '../../actions';

export const dynamic='force-dynamic';
const outcomeLabels:Record<string,string>={no_significant_issue:'No significant issue observed',routine_maintenance:'Routine maintenance items identified',repairs_recommended:'Repairs recommended',urgent_specialist_attention:'Urgent specialist attention recommended'};
const priorityLabels:Record<string,string>={p1:'Urgent · within 24 hours',p2:'High · within 7 days',p3:'Planned · 30–90 days',p4:'Monitor · within 12 months'};

export default async function Property({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{request?:string}>}) {
  const [{id},query]=await Promise.all([params,searchParams]);
  const data=await getPortalData();
  if(!data.demo&&!data.user)redirect('/login');
  const property=data.properties.find(x=>x.id===id);
  if(!property)notFound();
  const docs=data.documents.filter(x=>x.property_id===id);
  const photos=docs.filter(x=>x.kind==='photo');
  const records=docs.filter(x=>x.kind!=='photo');
  const issues=data.issues.filter(x=>x.property_id===id);
  const inspections=data.inspections.filter(x=>x.property_id===id);
  const events=data.service.filter(x=>x.property_id===id);
  const quotes=data.quotes.filter(x=>x.property_id===id);
  const latest=inspections[0];
  const links:Record<string,string>={};
  if(configured()){
    const db=await supabase();
    for(const doc of docs){
      if(doc.storage_path){
        const signed=await db.storage.from('property-documents').createSignedUrl(doc.storage_path,60);
        if(signed.data)links[doc.id]=signed.data.signedUrl;
      }
    }
  }
  return <Shell demo={data.demo}><div className="page">
    <Link className="back" href="/"><ArrowLeft size={17}/> All properties</Link>
    <div className="page-head"><div><span className="eyebrow">PROPERTY RECORD</span><h1>{property.address_line_1}<span className="dot">.</span></h1><p>{property.town} · {property.postcode}</p></div><span className={`status ${property.condition==='good'?'good':'attention'}`}>{property.condition==='good'?'Looking good':property.condition==='unknown'?'Awaiting first MOT':'Action recommended'}</span></div>
    <div className="property-hero"><div className="property-hero-icon"><House size={58} strokeWidth={1.2}/></div><div><span className="eyebrow">YOUR PROPERTY AT A GLANCE</span><h2>{property.label||'Property'}</h2><p>{property.type} · {property.membership||'No membership recorded'}</p></div><div className="property-hero-dates"><span>Last Property MOT <b>{date(property.last_inspection)}</b></span><span>Next inspection <b>{date(property.next_inspection)}</b></span></div></div>
    {latest&&<section className="panel summary-panel"><div className="panel-head"><div><span className="eyebrow">LATEST PROPERTY MOT · {date(latest.performed_on)}</span><h2>Inspection summary</h2></div><FileText size={20}/></div><p className="summary-outcome">{outcomeLabels[latest.outcome||'']||'Outcome not recorded'}</p>{latest.priority_actions?.length>0&&<div><strong className="summary-label">Priority actions</strong><ol className="summary-actions">{latest.priority_actions.map((action:string,index:number)=><li key={index}>{action}</li>)}</ol></div>}{latest.specialist_follow_up?.length>0&&<p className="summary-extra"><strong>Specialist follow-up:</strong> {latest.specialist_follow_up.join(', ')}</p>}{latest.access_restrictions&&<p className="summary-extra"><strong>Areas not inspected:</strong> {latest.access_restrictions}</p>}<p className="scope-note">A Property MOT is a visual, non-invasive record. It does not replace an EICR, gas safety inspection, structural survey or other specialist assessment.</p></section>}
    <div className="two-column"><section className="panel"><div className="panel-head"><div><span className="eyebrow">PROPERTY MOT</span><h2>Inspection history</h2></div><CalendarClock size={20}/></div>{inspections.length?inspections.map(item=><div className="list-row" key={item.id}><span className="list-icon"><CheckCircle2 size={18}/></span><div><strong>{item.summary||'Property MOT'}</strong><small>{date(item.performed_on)}</small></div><span className={`tag ${item.condition==='attention'?'soon':''}`}>{item.condition==='good'?'Good':'Review'}</span></div>):<p className="muted">No inspections recorded yet.</p>}</section>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">ONGOING CARE</span><h2>Issues & recommendations</h2></div><Wrench size={20}/></div>{issues.length?issues.map(issue=><div className="issue" key={issue.id}><div><span className={`tag ${issue.severity==='p1'?'expired':issue.severity==='p2'?'soon':''}`}>{issue.severity.toUpperCase()} · {priorityLabels[issue.severity]||'Review'}</span><span className="muted">{issue.status.replaceAll('_',' ')}</span></div><strong>{issue.title}</strong><p>{issue.recommendation||'Contact ACG for further advice.'}</p></div>):<div className="quiet"><CheckCircle2 size={22}/> No issues recorded</div>}</section></div>
    <section className="panel wide" id="documents"><div className="panel-head"><div><span className="eyebrow">KEEP EVERYTHING TOGETHER</span><h2>Documents & certificates</h2></div><FileText size={20}/></div>{records.length?<div className="document-grid">{records.map(doc=><div className="document-card" key={doc.id}><span className="list-icon"><FileText size={20}/></span><div><strong>{doc.title}</strong><small>Issued {date(doc.issued_on)} · Expires {date(doc.expires_on)}</small></div><span className={`tag ${expiry(doc.expires_on)==='Expired'?'expired':expiry(doc.expires_on)==='Due soon'?'soon':''}`}>{doc.expires_on?expiry(doc.expires_on):'Report'}</span>{links[doc.id]&&<a href={links[doc.id]} target="_blank" rel="noopener noreferrer" className="document-link">View PDF</a>}</div>)}</div>:<p className="muted">No certificates have been added to this property. A missing record does not confirm whether a certificate is required.</p>}</section>
    <section className="panel wide"><div className="panel-head"><div><span className="eyebrow">IMPORTANT RECORDS</span><h2>Certificate register</h2></div></div><div className="certificate-grid">{([['eicr','EICR'],['gas_safety','Gas Safety'],['epc','EPC'],['boiler_service','Boiler service']] as const).map(([kind,label])=>{const item=records.find(doc=>doc.kind===kind);return <div className="certificate-tile" key={kind}><strong>{label}</strong><span>{item?item.evidence_status==='not_required'?'Not required':item.evidence_status==='not_applicable'?'Not applicable':item.evidence_status==='missing'?'Recorded as missing':item.expires_on?expiry(item.expires_on):'Record present · date not recorded':'No record on portal'}</span></div>})}</div><p className="scope-note">A missing portal record does not mean a certificate is legally required or that one does not exist.</p></section>
    {photos.length>0&&<section className="panel wide"><div className="panel-head"><div><span className="eyebrow">PROPERTY IMAGES</span><h2>Photographs</h2></div></div><div className="photo-grid">{photos.map(photo=>links[photo.id]?<a href={links[photo.id]} target="_blank" rel="noopener noreferrer" key={photo.id}><img src={links[photo.id]} alt={photo.title}/><span>{photo.title}</span></a>:<div key={photo.id}>{photo.title}</div>)}</div></section>}
    <div className="two-column"><section className="panel"><div className="panel-head"><div><span className="eyebrow">PROPERTY HISTORY</span><h2>Service & maintenance</h2></div><Wrench size={20}/></div>{events.length?events.map(event=><div className="list-row" key={event.id}><span className="list-icon"><Wrench size={18}/></span><div><strong>{event.title}</strong><small>{date(event.occurred_on)}{event.description?` · ${event.description}`:''}</small></div></div>):<p className="muted">No service work recorded yet.</p>}</section><section className="panel"><div className="panel-head"><div><span className="eyebrow">WORK REQUESTS</span><h2>Quotes</h2></div><FileText size={20}/></div>{quotes.length?quotes.map(quote=><div className="list-row" key={quote.id}><span className="list-icon"><FileText size={18}/></span><div><strong>{quote.title}</strong><small>Status: {quote.status}</small></div>{quote.amount_pence!==null&&<span className="tag">£{(quote.amount_pence/100).toFixed(2)}</span>}</div>):<p className="muted">No quote requests yet.</p>}</section></div>
    <section className="panel wide" id="request"><div className="panel-head"><div><span className="eyebrow">NEED SOMETHING DONE?</span><h2>Request a quote</h2></div></div>{query.request==='sent'&&<p className="admin-notice" role="status">Request sent to ACG. We’ll be in touch.</p>}{query.request==='error'&&<p className="admin-error" role="alert">Your request could not be sent. Please try again.</p>}{data.demo?<p className="muted">Quote requests are available after your account is set up.</p>:<form action={requestQuote} className="admin-form"><input type="hidden" name="property_id" value={id}/><label className="admin-field">What work do you need?<textarea name="details" minLength={10} maxLength={1000} required rows={4} placeholder="Tell us what needs attention…"/></label><button className="button dark" type="submit">Send request</button></form>}</section>
  </div></Shell>;
}
