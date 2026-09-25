import Link from 'next/link';
import {staffSession} from '@/lib/admin';
import {AdminTitle} from '@/components/admin-shell';
export default async function Memberships(){const {db}=await staffSession();const {data}=await db.from('properties').select('id,address_line_1,membership').order('address_line_1').limit(500);return <><AdminTitle eyebrow="PLANS" title="Memberships" description="Recorded plans by property. Billing and payment collection will be introduced in Stage 3."/><div className="admin-panel"><div className="admin-list">{data?.map(p=><Link href={`/admin/properties/${p.id}`} key={p.id}><strong>{p.address_line_1}</strong><small>{p.membership||'No plan recorded'}</small><span>Edit →</span></Link>)}</div>{!data?.length&&<p className="muted">No properties added yet.</p>}</div></>}
