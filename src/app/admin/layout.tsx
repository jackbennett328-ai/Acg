import {staffSession} from '@/lib/admin';
import {AdminShell} from '@/components/admin-shell';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){const {role}=await staffSession();return <AdminShell role={role}>{children}</AdminShell>}
