import type { Metadata } from 'next';
import './styles.css';
export const metadata: Metadata = {title:'My properties | Asset Care Group',description:'Your property care, reports and service history in one place',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en-GB"><body>{children}</body></html>; }
