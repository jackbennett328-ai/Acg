'use client';
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import {finaliseDocument} from '@/app/admin/actions';

type Property={id:string,address_line_1:string,postcode:string};
type Inspection={id:string,property_id:string,performed_on:string};
export function ReportUploadForm({properties,inspections}:{properties:Property[],inspections:Inspection[]}){
  const [propertyId,setPropertyId]=useState(properties[0]?.id||'');
  const [kind,setKind]=useState('property_mot');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage('');
    const form=new FormData(event.currentTarget);
    const file=form.get('file');
    const allowed=kind==='photo'?['image/jpeg','image/png']:['application/pdf'];
    if(!(file instanceof File)||!allowed.includes(file.type)||file.size>25*1024*1024||file.size<8){setMessage('Select a PDF, JPEG or PNG of the chosen type, smaller than 25 MB.');setBusy(false);return;}
    const head=new Uint8Array(await file.slice(0,8).arrayBuffer());
    const pdf=new TextDecoder().decode(head.slice(0,5))==='%PDF-';
    const png=[137,80,78,71,13,10,26,10].every((b,i)=>head[i]===b);
    const jpeg=head[0]===255&&head[1]===216&&head[2]===255;
    if(kind==='photo'?!png&&!jpeg:!pdf){setMessage('The selected file does not match the document type.');setBusy(false);return;}
    if(form.get('kind')==='property_mot'&&!form.get('inspection_id')){setMessage('Choose the matching inspection before attaching a Property MOT report.');setBusy(false);return;}
    const extension=kind==='photo'?(png?'png':'jpg'):'pdf';
    const path=`${propertyId}/${crypto.randomUUID()}.${extension}`;
    try{
      const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const {error}=await db.storage.from('property-documents').upload(path,file,{contentType:file.type,upsert:false});
      if(error){setMessage('Upload failed. Please check your connection and try again.');return;}
      await finaliseDocument({property_id:propertyId,inspection_id:String(form.get('inspection_id')||''),kind:String(form.get('kind')),title:String(form.get('title')),issued_on:String(form.get('issued_on')||''),expires_on:String(form.get('expires_on')||''),evidence_status:String(form.get('evidence_status')||''),storage_path:path});
    }catch{setMessage('We could not finish attaching this PDF. Please refresh the review queue before retrying.');}
    finally{setBusy(false);}
  }
  return <form onSubmit={submit} className="admin-form">
    <label className="admin-field">Property<select name="property_id" value={propertyId} onChange={e=>setPropertyId(e.target.value)}>{properties.map(p=><option value={p.id} key={p.id}>{p.address_line_1}, {p.postcode}</option>)}</select></label>
    <label className="admin-field">Linked inspection (required for Property MOT)<select name="inspection_id" defaultValue=""><option value="">No inspection selected</option>{inspections.filter(i=>i.property_id===propertyId).map(i=><option key={i.id} value={i.id}>{i.performed_on}</option>)}</select></label>
    <label className="admin-field">Document type<select name="kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="property_mot">Property MOT report</option><option value="eicr">EICR</option><option value="gas_safety">Gas Safety Certificate</option><option value="epc">EPC</option><option value="boiler_service">Boiler service</option><option value="photo">Property photograph</option><option value="other">Other</option></select></label>
    <label className="admin-field">Customer-facing title<input name="title" required maxLength={200}/></label>
    <label className="admin-field">Issue date<input type="date" name="issued_on"/></label>
    <label className="admin-field">Expiry date, if applicable<input type="date" name="expires_on"/></label>
    <label className="admin-field">Evidence status<select name="evidence_status" defaultValue="unverified"><option value="unverified">Not checked</option><option value="current">Current</option><option value="due_soon">Due within 90 days</option><option value="expired">Expired</option><option value="missing">Missing</option><option value="not_required">Not required</option><option value="not_applicable">Not applicable</option></select></label>
    <label className="admin-field">{kind==='photo'?'JPEG or PNG photograph':'PDF file'} (up to 25 MB)<input key={kind} name="file" type="file" accept={kind==='photo'?'image/jpeg,image/png,.jpg,.jpeg,.png':'application/pdf,.pdf'} required/></label>
    {message&&<p className="admin-error" role="alert">{message}</p>}
    <button className="button dark" type="submit" disabled={busy}>{busy?'Uploading…':'Save as draft'}</button>
  </form>;
}
