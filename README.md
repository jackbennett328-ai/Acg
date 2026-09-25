# Asset Care Group portal

Customer and admin portal built with Next.js and Supabase. The customer app includes a dashboard, multiple properties, inspection history, P1–P4 findings, service history, document links, quote requests, sign-in and password recovery. Staff can manage customers and properties, enter inspection summaries and issues, attach verified PDFs, track certificate dates, service and quotes. The example mode is explicitly labelled and contains no customer information.

The official ACG logo supplied on 25 September 2026 is included unchanged at `public/acg-logo.jpg` (the uploaded file contains JPEG data). The SafetyCulture document supplied on that date is a **blank, 134-page template**, not a completed inspection. Its final summary and certificates sections informed the database and display fields; no real inspection result was inferred from it.

## Local setup

1. `npm ci`
2. Copy `.env.example` to `.env.local` and set the staging Supabase URL and publishable/anon key. `NEXT_PUBLIC_SUPABASE_ANON_KEY` accepts a Supabase publishable key despite the historical variable name. Set `SUPABASE_SERVICE_ROLE_KEY` only in a secure server environment for administrator invitations. Never put it in `NEXT_PUBLIC_` variables.
3. The migration `supabase/migrations/20260925175846_core_portal.sql` has been applied to the separate **ACG Staging** project in London. Use the migration runner for other environments; do not apply it twice to staging.
4. Once staging hosting is available, set the Supabase Auth Site URL to that URL and allow `https://<staging-host>/auth/callback`, `/auth/confirm` and `/update-password` as redirect destinations. With a configurable email provider, link invites to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite` and password recoveries to the same path with `type=recovery`. The app also accepts PKCE callbacks at `/auth/callback`. New Free projects with Supabase's default SMTP cannot customise email templates; test the default invitation and recovery links on staging before customer use, and configure a suitable mail sender before real customer invitations.
5. `npm run dev`. Without environment variables, the UI runs in clearly marked example mode; login requires Supabase.

## Provisioning and isolation

An administrator creates a customer and property, then invites the customer from the customer record. Invitations require the server-only service role key and verified staging email setup. Do not expose public self-signup. Add the first staff member to `staff_users` only after verifying identity; staff cannot grant themselves roles. A customer user can see a property only when linked through `customer_users`; an unknown ID returns the same not-found view. Staff roles are evaluated inside `security definer` functions and customer writes are denied. The storage bucket is private and URLs are short lived.

The staff browser uploads the PDF directly to private Supabase storage, avoiding the web host's small request limit. A server action then checks content, size, property and inspection linkage before writing document metadata. Paths use UUIDs, without addresses or names. A failed metadata write attempts to remove the uploaded file. Staff uploads remain drafts and inaccessible to customers until an administrator opens the PDF and confirms the property before publishing it.

## SafetyCulture report mapping

- Store the original exported PDF as a private `documents` row of kind `property_mot`, linked to its `property_id` and `inspection_id`.
- Map the report's final summary to `inspections.outcome`, `priority_actions` (up to three), `specialist_follow_up`, `inspector_comment` and `access_restrictions`.
- Store individual actionable findings as `issues`, using the template's P1 (24 hours), P2 (7 days), P3 (30–90 days), P4 (monitor within 12 months). Do not infer a P1 solely from a failed checklist answer.
- Store EICR, boiler, gas and EPC as separate document types with date and evidence status. Distinguish `missing`, `not_required` and `not_applicable`; an absent file does not prove that a certificate is due.
- A manual admin review must confirm property identity, issue priorities and certificates before making a report visible. The template is not a certificate or a replacement for a specialist assessment.

## Release gates

Before a customer launch: obtain a completed SafetyCulture export; install dependencies and run build/CI; apply the migration to staging; test two unrelated customer accounts, an account with two properties, empty accounts, stale sessions, missing and expired certificates, wrong-property uploads, reset/invite links, staff role escalation, signed URL expiry, mobile keyboard navigation, accessibility and backups. Configure privacy notice, retention rules, support contacts, staging and production secrets independently. Enable managed database backups and perform a restore test. Review all email templates and the portal domain before invitations.

## Delivery stages

- Stage 1 implemented here: customer UI, schema and access control foundation, authentication and read-only document access.
- Stage 2 partially implemented: admin customer/property editing, private report upload and publication review, inspection summary, issues, service history, quote records and audit triggers. Deletion, bulk export, advanced approval flows and direct PDF parsing remain.
- Stage 3: billing, memberships, notification preferences and expiry reminders.
- Stage 4: optional SafetyCulture integration after manual workflow is validated.

No production customer records, payments or external system integrations have been created by this repository.
