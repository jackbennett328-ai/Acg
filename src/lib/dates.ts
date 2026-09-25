export function date(value:string|null|undefined) {
  return value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)) : 'Not recorded';
}

export function expiry(value:string|null|undefined, now=new Date()) {
  if(!value)return 'Not recorded';
  const end=Date.parse(`${value}T00:00:00Z`);
  if(!Number.isFinite(end))return 'Not recorded';
  const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
  const days=Math.round((end-today)/86400000);
  return days<0?'Expired':days<=60?'Due soon':'Current';
}
