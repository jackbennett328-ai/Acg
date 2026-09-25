'use client';
export default function Error({reset}:{error:Error,reset:()=>void}){return <div className="auth-wrap"><div className="auth-card"><h1>Something went wrong.</h1><p>Your information could not be loaded right now.</p><button className="button dark" onClick={reset}>Try again</button></div></div>}
