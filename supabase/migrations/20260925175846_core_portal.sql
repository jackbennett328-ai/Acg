-- Apply to staging first. All customer-facing access is derived from auth.uid().
create extension if not exists pgcrypto;
create type public.acg_role as enum ('customer','staff','admin');
create type public.property_condition as enum ('unknown','good','attention','urgent');
create type public.issue_severity as enum ('p1','p2','p3','p4');

create table public.customers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 200), email text, phone text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.customer_users (
 customer_id uuid not null references public.customers(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(customer_id,user_id)
);
create table public.staff_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role public.acg_role not null check(role in ('staff','admin')),
 created_at timestamptz not null default now()
);
create table public.properties (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id),
 label text, address_line_1 text not null, address_line_2 text, town text not null, postcode text not null,
 type text not null default 'house', condition public.property_condition not null default 'unknown',
 membership text, last_inspection date, next_inspection date, photo_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,customer_id)
);
create table public.inspections (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id),
 performed_on date not null, summary text, condition public.property_condition not null default 'unknown',
 outcome text check(outcome in ('no_significant_issue','routine_maintenance','repairs_recommended','urgent_specialist_attention')),
 priority_actions text[] not null default '{}', specialist_follow_up text[] not null default '{}',
 inspector_comment text, access_restrictions text,
 safetyculture_id text unique, created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table public.issues (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id),
 inspection_id uuid references public.inspections(id), title text not null, recommendation text,
 severity public.issue_severity not null default 'p4', status text not null default 'open' check(status in ('open','in_progress','resolved')),
 created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id),
 inspection_id uuid references public.inspections(id), kind text not null check(kind in ('property_mot','eicr','gas_safety','epc','boiler_service','photo','other')),
 title text not null, issued_on date, expires_on date, storage_path text unique,
 evidence_status text check(evidence_status in ('current','due_soon','expired','missing','not_required','not_applicable','unverified')),
 published_at timestamptz, published_by uuid references auth.users(id),
 created_at timestamptz not null default now(), created_by uuid references auth.users(id),
 check(expires_on is null or issued_on is null or expires_on>=issued_on)
);
create table public.service_events (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id),
 occurred_on date not null, title text not null, description text, document_id uuid references public.documents(id),
 created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table public.quotes (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id),
 title text not null, status text not null default 'requested' check(status in ('requested','draft','sent','accepted','declined','completed')),
 amount_pence integer check(amount_pence>=0), created_at timestamptz not null default now()
);
create table public.audit_events (
 id bigint generated always as identity primary key, actor_id uuid, action text not null, entity_type text not null,
 entity_id uuid, details jsonb not null default '{}', occurred_at timestamptz not null default now()
);
create index on public.customer_users(user_id);
create index on public.properties(customer_id);
create index on public.inspections(property_id,performed_on desc);
create index on public.issues(property_id,status);
create index on public.documents(property_id,expires_on);
create index on public.service_events(property_id,occurred_on desc);
create index on public.quotes(property_id);

-- New Supabase projects do not expose public tables to the Data API by default.
-- Grant only the operations the app needs, and let the policies below filter rows.
revoke all on public.customers, public.customer_users, public.staff_users,
 public.properties, public.inspections, public.issues, public.documents,
 public.service_events, public.quotes, public.audit_events
 from public, anon, authenticated, service_role;
grant select, insert, update on public.customers, public.properties,
 public.inspections, public.issues, public.documents, public.service_events,
 public.quotes to authenticated;
grant select, insert, delete on public.customer_users to authenticated;
grant select on public.staff_users, public.audit_events to authenticated;
grant select, insert, update, delete on public.customers, public.customer_users,
 public.staff_users, public.properties, public.inspections, public.issues,
 public.documents, public.service_events, public.quotes, public.audit_events
 to service_role;

-- Keep the attached evidence in the same property record as its inspection.
alter table public.inspections add constraint inspections_id_property_unique unique(id,property_id);
alter table public.documents add constraint documents_id_property_unique unique(id,property_id);
alter table public.issues add constraint issues_inspection_property_fk foreign key(inspection_id,property_id) references public.inspections(id,property_id);
alter table public.documents add constraint documents_inspection_property_fk foreign key(inspection_id,property_id) references public.inspections(id,property_id);
alter table public.service_events add constraint service_document_property_fk foreign key(document_id,property_id) references public.documents(id,property_id);

create schema acg_internal;
grant usage on schema acg_internal to authenticated;
create function acg_internal.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_users where user_id=(select auth.uid()) and role in ('staff','admin'))
$$;
create function acg_internal.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_users where user_id=(select auth.uid()) and role='admin')
$$;
create function acg_internal.can_access_property(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select acg_internal.is_staff() or exists(select 1 from public.properties p join public.customer_users cu on cu.customer_id=p.customer_id where p.id=p_id and cu.user_id=(select auth.uid()))
$$;
revoke all on function acg_internal.is_staff() from public;
revoke all on function acg_internal.is_admin() from public;
revoke all on function acg_internal.can_access_property(uuid) from public;
grant execute on function acg_internal.is_staff(),acg_internal.is_admin(),acg_internal.can_access_property(uuid) to authenticated;

alter table public.customers enable row level security;
alter table public.customer_users enable row level security;
alter table public.staff_users enable row level security;
alter table public.properties enable row level security;
alter table public.inspections enable row level security;
alter table public.issues enable row level security;
alter table public.documents enable row level security;
alter table public.service_events enable row level security;
alter table public.quotes enable row level security;
alter table public.audit_events enable row level security;
create policy customer_read on public.customers for select to authenticated using(acg_internal.is_staff() or exists(select 1 from public.customer_users cu where cu.customer_id=id and cu.user_id=(select auth.uid())));
create policy customer_users_read on public.customer_users for select to authenticated using(acg_internal.is_staff() or user_id=(select auth.uid()));
create policy staff_read on public.staff_users for select to authenticated using(user_id=(select auth.uid()) or acg_internal.is_admin());
create policy property_read on public.properties for select to authenticated using(acg_internal.can_access_property(id));
create policy inspection_read on public.inspections for select to authenticated using(acg_internal.can_access_property(property_id));
create policy issue_read on public.issues for select to authenticated using(acg_internal.can_access_property(property_id));
create policy document_read on public.documents for select to authenticated using(acg_internal.can_access_property(property_id) and (published_at is not null or acg_internal.is_staff()));
create policy service_read on public.service_events for select to authenticated using(acg_internal.can_access_property(property_id));
create policy quote_read on public.quotes for select to authenticated using(acg_internal.can_access_property(property_id) and (status <> 'draft' or acg_internal.is_staff()));
create policy customer_quote_request on public.quotes for insert to authenticated
with check(status='requested' and amount_pence is null and acg_internal.can_access_property(property_id));
create policy admin_audit_read on public.audit_events for select to authenticated using(acg_internal.is_admin());
create policy staff_customer_write on public.customers for all to authenticated using(acg_internal.is_staff()) with check(acg_internal.is_staff());
create policy staff_customer_users_write on public.customer_users for all to authenticated using(acg_internal.is_admin()) with check(acg_internal.is_admin());
create policy staff_property_write on public.properties for all to authenticated using(acg_internal.is_staff()) with check(acg_internal.is_staff());
create policy staff_inspection_write on public.inspections for all to authenticated using(acg_internal.is_staff()) with check(acg_internal.is_staff());
create policy staff_issue_write on public.issues for all to authenticated using(acg_internal.is_staff()) with check(acg_internal.is_staff());
create policy staff_document_write on public.documents for all to authenticated using(acg_internal.is_staff()) with check(acg_internal.is_staff());
create policy staff_service_write on public.service_events for all to authenticated using(acg_internal.is_staff()) with check(acg_internal.is_staff());
create policy staff_quote_write on public.quotes for all to authenticated using(acg_internal.is_staff()) with check(acg_internal.is_staff());
-- Audit records are written by a trigger and can only be read by administrators.
create function acg_internal.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare affected_id uuid;
begin
  affected_id := case when TG_OP='DELETE' then old.id else new.id end;
  insert into public.audit_events(actor_id,action,entity_type,entity_id)
  values ((select auth.uid()),lower(TG_OP),TG_TABLE_NAME,affected_id);
  return case when TG_OP='DELETE' then old else new end;
end $$;
revoke all on function acg_internal.audit_change() from public;
do $$
declare table_name text;
begin
  foreach table_name in array array['customers','customer_users','properties','inspections','issues','documents','service_events','quotes'] loop
    -- customer_users has a composite key and is intentionally excluded from generic ID-only audit.
    if table_name <> 'customer_users' then
      execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function acg_internal.audit_change()',table_name,table_name);
    end if;
  end loop;
end $$;
create function acg_internal.audit_customer_link() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_OP='DELETE' then
    insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
    values ((select auth.uid()),'delete','customer_users',old.customer_id,
      jsonb_build_object('user_id',old.user_id));
    return old;
  end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,details)
  values ((select auth.uid()),'insert','customer_users',new.customer_id,
    jsonb_build_object('user_id',new.user_id));
  return new;
end $$;
revoke all on function acg_internal.audit_customer_link() from public;
create trigger audit_customer_link after insert or delete on public.customer_users for each row execute function acg_internal.audit_customer_link();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('property-documents','property-documents',false,26214400,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create policy document_download on storage.objects for select to authenticated
using(bucket_id='property-documents' and exists(select 1 from public.documents d where d.storage_path=name and acg_internal.can_access_property(d.property_id) and (d.published_at is not null or acg_internal.is_staff())));
create policy staff_review_upload on storage.objects for select to authenticated
using(bucket_id='property-documents' and acg_internal.is_staff());
create policy staff_document_upload on storage.objects for insert to authenticated
with check(bucket_id='property-documents' and acg_internal.is_staff());
create policy staff_document_cleanup on storage.objects for delete to authenticated
using(bucket_id='property-documents' and acg_internal.is_staff());
