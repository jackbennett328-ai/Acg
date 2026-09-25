-- Run against a fresh local Supabase database. This transaction never changes staging.
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (id,email) values
 ('00000000-0000-4000-8000-000000000001','acg-a@example.test'),
 ('00000000-0000-4000-8000-000000000002','acg-b@example.test'),
 ('00000000-0000-4000-8000-000000000003','acg-staff@example.test'),
 ('00000000-0000-4000-8000-000000000004','acg-admin@example.test'),
 ('00000000-0000-4000-8000-000000000005','acg-empty@example.test');
insert into public.customers (id,name) values
 ('00000000-0000-4000-8000-000000000101','Example A'),
 ('00000000-0000-4000-8000-000000000102','Example B'),
 ('00000000-0000-4000-8000-000000000103','Example empty account');
insert into public.customer_users (customer_id,user_id) values
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000005');
insert into public.staff_users (user_id,role) values
 ('00000000-0000-4000-8000-000000000003','staff'),
 ('00000000-0000-4000-8000-000000000004','admin');
insert into public.properties (id,customer_id,address_line_1,town,postcode) values
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','1 Example Street','Leeds','LS1 1AA'),
 ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000101','2 Example Street','Leeds','LS1 1AB'),
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000102','3 Example Street','York','YO1 1AA');
insert into public.inspections (id,property_id,performed_on) values
 ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','2026-01-02'),
 ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000203','2026-01-03');
insert into public.issues (id,property_id,inspection_id,title) values
 ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','Example A finding'),
 ('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000302','Example B finding');
insert into public.documents (id,property_id,inspection_id,kind,title,issued_on,expires_on,evidence_status,published_at,storage_path) values
 ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000201',null,'eicr','Expired example','2020-01-01','2025-01-01','expired',now(),'00000000-0000-4000-8000-000000000201/expired.pdf'),
 ('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','property_mot','Unreviewed report',null,null,'unverified',null,'00000000-0000-4000-8000-000000000201/draft.pdf'),
 ('00000000-0000-4000-8000-000000000503','00000000-0000-4000-8000-000000000202',null,'gas_safety','Missing evidence',null,null,'missing',now(),null),
 ('00000000-0000-4000-8000-000000000504','00000000-0000-4000-8000-000000000203',null,'epc','Example B document',null,null,'current',now(),'00000000-0000-4000-8000-000000000203/epc.pdf');
insert into public.service_events (id,property_id,occurred_on,title) values
 ('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000201','2026-01-02','Boiler visit'),
 ('00000000-0000-4000-8000-000000000602','00000000-0000-4000-8000-000000000203','2026-01-03','Service visit');
insert into public.quotes (id,property_id,title,status) values
 ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000201','Published quote','sent'),
 ('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000201','Private draft','draft'),
 ('00000000-0000-4000-8000-000000000703','00000000-0000-4000-8000-000000000203','Other owner quote','sent');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
 'public.customers'::regclass,'public.customer_users'::regclass,'public.staff_users'::regclass,
 'public.properties'::regclass,'public.inspections'::regclass,'public.issues'::regclass,
 'public.documents'::regclass,'public.service_events'::regclass,'public.quotes'::regclass,
 'public.audit_events'::regclass)), 'every customer-facing table has RLS enabled');
select is(has_table_privilege('authenticated','public.properties','SELECT'),true,'authenticated property reads have an explicit API grant');
select is(has_table_privilege('authenticated','public.quotes','INSERT'),true,'authenticated quote requests have an explicit API grant');
select is(has_table_privilege('anon','public.properties','SELECT'),false,'anonymous users have no property table grant');
select is(has_table_privilege('authenticated','public.staff_users','INSERT'),false,'no API role can grant staff access');
select is(has_table_privilege('authenticated','public.audit_events','INSERT'),false,'audit entries can only be written by triggers');
select throws_ok($$insert into public.documents (property_id,inspection_id,kind,title)
 values ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000302','property_mot','Wrong inspection')$$,
 '23503',null,'a report cannot refer to an inspection of another property');
select throws_ok($$insert into public.issues (property_id,inspection_id,title)
 values ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000302','Wrong inspection')$$,
 '23503',null,'a finding cannot refer to an inspection of another property');
select throws_ok($$insert into public.documents (property_id,kind,title,issued_on,expires_on)
 values ('00000000-0000-4000-8000-000000000201','eicr','Bad dates','2026-01-01','2025-01-01')$$,
 '23514',null,'a certificate cannot expire before it was issued');

set local role anon;
set local request.jwt.claim.sub = '';
select throws_ok('select count(*) from public.properties','42501',null,'anonymous users cannot read properties');
select throws_ok('select count(*) from public.documents','42501',null,'anonymous users cannot read documents');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.customers),1,'customer A sees only their customer account');
select is((select count(*)::integer from public.properties),2,'customer A sees both owned properties');
select is((select count(*)::integer from public.inspections),1,'customer A sees only their inspection');
select is((select count(*)::integer from public.issues),1,'customer A sees only their finding');
select is((select count(*)::integer from public.documents),2,'customer A sees published documents and missing evidence, but no draft');
select is((select count(*)::integer from public.service_events),1,'customer A sees only their service history');
select is((select count(*)::integer from public.quotes),1,'customer A cannot see draft or other-owner quotes');
select is(acg_internal.can_access_property('00000000-0000-4000-8000-000000000203'),false,'customer A cannot access customer B property by ID');
select is(acg_internal.is_staff(),false,'customer A cannot claim a staff role');
select lives_ok($$insert into public.quotes (property_id,title)
 values ('00000000-0000-4000-8000-000000000202','Own quote request')$$,'customer A can request a quote for their second property');
select throws_ok($$insert into public.quotes (property_id,title)
 values ('00000000-0000-4000-8000-000000000203','Foreign quote request')$$,
 '42501',null,'customer A cannot request work for customer B property');
select throws_ok($$insert into public.quotes (property_id,title,status,amount_pence)
 values ('00000000-0000-4000-8000-000000000201','Self-approved quote','sent',100)$$,
 '42501',null,'customers cannot create priced or sent quotes');
select results_eq($$update public.properties set address_line_1='Tampered' where id='00000000-0000-4000-8000-000000000201' returning id$$,
 array[]::uuid[],'customers cannot edit their property record');
select throws_ok($$insert into public.staff_users (user_id,role)
 values ('00000000-0000-4000-8000-000000000001','admin')$$,
 '42501',null,'a customer cannot grant themselves admin');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.properties),1,'customer B sees only their property');
select is((select count(*)::integer from public.documents),1,'customer B sees only their own document');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000005';
select is((select count(*)::integer from public.properties),0,'an empty account sees no properties');
select is((select count(*)::integer from public.documents),0,'an empty account sees no documents');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select is(acg_internal.is_staff(),true,'staff role can be verified');
select is(acg_internal.is_admin(),false,'staff role has no admin permission');
select is((select count(*)::integer from public.documents),4,'staff can review unpublished reports across properties');
select throws_ok($$insert into public.customer_users (customer_id,user_id)
 values ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000003')$$,
 '42501',null,'staff cannot grant a customer link');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000004';
select is(acg_internal.is_admin(),true,'admin role can be verified');
select lives_ok($$insert into public.customer_users (customer_id,user_id)
 values ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000005')$$,
 'admin can explicitly grant a customer link');
select * from finish();
rollback;
