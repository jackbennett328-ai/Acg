import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expiry,date} from '../src/lib/dates.ts';

test('certificate remains due on its recorded expiry date',()=>{
  assert.equal(expiry('2026-09-25',new Date('2026-09-25T18:00:00Z')),'Due soon');
  assert.equal(expiry('2026-09-25',new Date('2026-09-26T00:01:00Z')),'Expired');
});
test('distinguishes missing dates and the 60 day window',()=>{
  const now=new Date('2026-09-25T07:00:00Z');
  assert.equal(expiry(null,now),'Not recorded');
  assert.equal(expiry('2030-01-01',now),'Current');
  assert.equal(expiry('2026-10-25',now),'Due soon');
});
test('UK-facing date format is stable',()=>assert.equal(date('2026-09-25'),'25 Sept 2026'));
