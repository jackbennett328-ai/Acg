import {staffSession} from '@/lib/admin';
import {AdminTitle,Notice} from '@/components/admin-shell';
import {ReportUploadForm} from '@/components/report-upload-form';
import {publishDocument} from '../actions';

export default async function Reports({searchParams}:{searchParams:Promise<Record<string,string>>}){
  const params=await searchParams;
  const {db,role}=await staffSession();
  const [properties,inspections,pending]=await Promise.all([
    db.from('properties').select('id,address_line_1,postcode').order('address_line_1').limit(500),
    db.from('inspections').select('id,property_id,performed_on').order('performed_on',{ascending:false}).limit(500),
    db.from('documents').select('id,property_id,kind,title,storage_path,inspection_id').is('published_at',null).order('created_at',{ascending:false}).limit(50)
  ]);
  const reviewLinks:Record<string,string>={};
  for(const doc of pending.data||[]){
    if(doc.storage_path){const link=await db.storage.from('property-documents').createSignedUrl(doc.storage_path,120);if(link.data)reviewLinks[doc.id]=link.data.signedUrl;}
  }
  return <>
    <AdminTitle eyebrow="SAFETYCULTURE & CERTIFICATES" title="Report review" description="Upload a PDF as a draft, then publish it after checking the original file and the property."/>
    <Notice params={params}/>
    <div className="admin-two">
      <div className="admin-panel"><h2>Waiting for review</h2>{pending.data?.length?<div className="admin-list">{pending.data.map(doc=>{
        const property=properties.data?.find(p=>p.id===doc.property_id);
        return <div key={doc.id}><strong>{doc.title}</strong><small>{property?`${property.address_line_1}, ${property.postcode}`:'Property unavailable'} · {doc.kind.replaceAll('_',' ')}</small>
          {reviewLinks[doc.id]&&<a href={reviewLinks[doc.id]} target="_blank" rel="noopener noreferrer" className="admin-pdf-link">Open PDF for review ↗</a>}
          {doc.kind==='property_mot'&&!doc.inspection_id&&<p>Link this Property MOT to its inspection before publishing.</p>}
          {role==='admin'&&reviewLinks[doc.id]&&(doc.kind!=='property_mot'||doc.inspection_id)&&<form action={publishDocument} className="admin-review-form"><input type="hidden" name="document_id" value={doc.id}/><input type="hidden" name="property_id" value={doc.property_id}/><label><input type="checkbox" name="confirmed" value="yes" required/> I opened the PDF and confirmed that its address and contents belong to {property?.address_line_1||'this property'}.</label><button className="button dark">Publish to customer</button></form>}
        </div>;
      })}</div>:<p className="muted">No PDFs awaiting review.</p>}</div>
      <div className="admin-panel"><h2>Upload a PDF</h2><p className="admin-warning">Confirm the address before upload. A report stays private to staff until an administrator publishes it.</p>{properties.data?.length?<ReportUploadForm properties={properties.data} inspections={inspections.data||[]}/>:<p>Add a customer and property first.</p>}</div>
    </div>
  </>;
}
