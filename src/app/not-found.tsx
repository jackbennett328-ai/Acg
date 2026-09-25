import Link from 'next/link';
export default function NotFound(){return <div className="auth-wrap"><div className="auth-card"><span className="eyebrow">PROPERTY NOT FOUND</span><h1>We couldn’t find that property.</h1><p>It may have moved or you may not have access to it.</p><Link className="button dark" href="/">Return to your properties</Link></div></div>}
