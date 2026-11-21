# Security and verification notes

## Critical production blocker
This project currently authenticates against a custom `public.users` table with passwords and the Supabase anon key. RLS is disabled by the existing schema setup. Hiding pages/buttons is not authorization. A real production release needs Supabase Auth, server-side role/college/student mappings, RLS on every exposed table and storage bucket, and RPC permission checks based on authenticated identity.

The club enrollment/review RPCs currently enforce seat capacity and workflow state but are not protected against identity spoofing in this custom-auth architecture. They must be secured with Auth/RLS before production.

## Static validation
`node scripts/check-project.js` checks JavaScript syntax and local links. It does not connect to Supabase. SQL syntax, foreign keys, RLS policies, storage, login mapping, upload permissions, filters, notifications, and workflows still require testing against the actual Supabase project.

## Data retention
The global cascade-delete migration from the prior package was removed. Keep restrictive foreign keys and archive important student, academic, fee, attendance, and library records rather than deleting them indiscriminately.
