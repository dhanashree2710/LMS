# KDRT LMS (multi-page)
Open `index.html` (splash) in a browser, or host the folder on any static host.

```
index.html            splash -> login
login.html            sign in
assets/css/style.css  all styles
js/config.js          Supabase keys + small helpers
js/core.js            shared helpers, page list, role menus
js/shell.js           session guard, sidebar, top bar
js/pages/*.js         logic for each page type
pages/*.html          one HTML file per tab (dashboard, students, staff, ...)
```
Edit `SB_URL` / `SB_KEY` in `js/config.js`.

First super admin (run once in Supabase SQL editor):
```sql
with u as (insert into users(full_name,email,password) values('Super Admin','admin@kdrt.com','ChangeMe123') returning id,full_name,email),
p as (insert into profiles(id,email,full_name) select id,email,full_name from u)
insert into user_roles(user_id,role) select id,'super_admin' from u;
```
Disable RLS on the tables while testing. Passwords are plain text in `users` (your schema): move to Supabase Auth before production.

## v11 — 21 Nov 2026
- Branded PDF and Excel downloads: college logo, name, address, phone, email and code in the header, the filter context (year, department, course, class, semester), a footer with page numbers and a watermark.
- Groq AI assistant through the Supabase Edge Function `ai-assistant` (the key is kept in Supabase secrets). Includes "Generate with AI" for quizzes.
- Supabase keys moved to `js/env.js` (gitignored), with `js/env.example.js` and `scripts/make-env.js` for servers.
- `03_linked_delete_rules.sql`: cascading deletes and login sync. Deletes that are blocked now say what still uses the record.
- Student uploads ask for department, course, class and semester when no filter is set. Students and parents without a password get the default one.

## 7-phase flow
Drawer is grouped by phase: Platform setup, College setup, Staff, Admission, Academic operations, Examinations, Progression (incl. **Annual process**).

**Setup order:** 1) base schema, 2) `supabase/seed.sql`, 3) `supabase/schema_additions.sql` (extra columns, new tables, 7 storage buckets: college-logos, student-photos, admission-documents, assignments, study-materials, certificates, result-files).

- Super admin creates a college (auto College ID, module access, admin account) and gets a copyable invitation.
- Annual process page: activate year, bulk promote or complete course (alumni), then certificates.
- Quizzes: manual builder or Word (.docx) upload. Assignments: staff upload files, students submit, staff download and mark.
- Buckets are public for development; use signed URLs and RLS before production, especially for admission-documents and certificates.

## v4 redesign
Aurora theme: light/dark toggle, animated splash + login, collapsible sidebar (drawer on mobile), header with page search, notification bell and profile menu, staggered card/table animations, 3D card tilt, skeleton loading. Styling lives in `assets/css/style.css`; shell in `js/shell.js`; theme in `js/fx.js`. No page logic or schema was changed.

## v5 changes
Times New Roman + capitalised text; single password eye; password management by college card (super admin); live notification bell and Recent activity (scoped by role); header download button exports every table on any page; Excel download hardened (CSV fallback); Courses/Departments/Semesters/Subjects/Classes as cards or table with click-through drill-down; student "My courses" page (course → semesters → subjects). **Re-run `supabase/schema_additions.sql`** (adds `subjects.semester_id`).

## v6 changes
Professional Excel/PDF exports (separate sheets, readable columns, resolved names); every data page has Cards/Table with Academic year → Course → Class filters and click-through details; Course → Year (FY/SY/TY) → Classes/Semesters → Subjects → Syllabus flow with syllabus upload; academic-year cards with details; parent sheet upload with verification; annual process charts (Excel + PDF); back button on every page; HOD / Class teacher / Subject teacher scoping; Fees and Library modules; student & parent portals by year → course → semester → subject.
**Run `supabase/schema_additions.sql` again** (new columns/tables). Set the HOD on *Departments* and the Class Teacher on *Classes* for role scoping to work.

## v7 changes
Course ↔ department; classes as FY/SY/TY; cascading Course → Class → Semester → Subject → Student dropdowns; every list grouped Course → Class → Semester with year filter and charts; weekly timetable view + sheet upload; bulk attendance marking; announcements targeted by role/course/class/semester/subject; assignment closing time, task download and submission download; accountant flow (fee structure → generate fees → record payment → PDF receipt); library (available / issued / overdue / returned, students and staff); TPO training & activity records; hall tickets removed; journey page fixed. **Re-run `supabase/schema_additions.sql`.**

## CRUD reliability update (2026-11-19)

- Generic records support create, edit/update, and delete from the CRUD pages.
- Delete actions now surface Supabase errors cleanly instead of failing silently.
- Edit mode resets after a successful update and the form returns to Save mode.
- Student records have an Archive action (sets `status` to `inactive`) so academic history can be retained.
- Student IDs can be entered in their original case at sign-in; student logins resolve through the student roll-number mapping.

### Foreign-key behavior
The previous global cascade migration has been removed from this package because cascading deletes across every table can erase academic, attendance, library, and financial history. Delete operations remain subject to each table's foreign keys and report the database error if dependent data must first be archived or removed intentionally.

## Student portal repair/features update (2026-11-19)

- `supabase/schema_additions.sql` now idempotently adds notification targeting columns, club capacity/approval settings, club enrollment and waitlist tables, enrollment RPCs, waitlist promotion trigger, quiz attempt status, indexes, and a PostgREST schema-cache reload notification. It also contains the earlier missing `tpo_records`, `fee_payments`, `fee_structures`, and `announcements.class_id` additions.
- Fees explorer: All / Paid / Unpaid filter. Paid is based on the record's paid amount or paid status; partial balances remain in Unpaid.
- Activity marks explorer: Activity Type filter.
- Placement explorer: company, role, status, department (derived from student's course), and date filters.
- Student dashboard: linked student's assignments, exams, notices, attendance, pending fees, placement updates, events, quizzes, and published results; no college administrative KPI panel for student role.
- Quiz portal: completed attempts and marks shown, repeat attempts blocked after a recorded attempt, Excel and PDF result exports.
- Club cards: enrolled and seat counts with availability colors. Club details provide student enrollment/request, cancellation, admin approvals/rejections, and waitlist. Enrollment/approval functions lock the club row to enforce capacity at database transaction level.
- Announcements can target roles, department, class, course/program, semester, subject, or student IDs; feed items link to their corresponding module.
- Drawer scroll uses independent, touch-friendly vertical scrolling and hides horizontal overflow.
- Upload toast handling is null-safe; upload success/failure notifications are preserved.


## Supabase setup for this update
1. Back up your Supabase database.
2. Run the full `supabase/schema_additions.sql` in SQL Editor after the base schema/seed, even if you ran an earlier version; it uses `IF NOT EXISTS` for additions.
3. Reload the browser and sign in. If the API still reports stale columns, refresh the Supabase/PostgREST schema cache from Dashboard or run `NOTIFY pgrst, 'reload schema';`.
4. Verify club RPCs, uploads, filters and student-specific data using real accounts and records. Static checks do not verify live Supabase permissions or RLS.


## Production security limitation — must be resolved before deployment
This LMS still uses a custom `public.users` password field and the public/anon Supabase client. The schema additions disable RLS to match the existing development architecture. That means client-side role checks are **not a production security boundary**, and the club RPCs are currently callable using the anon key. Before real student/financial records are used in production, migrate sign-in to Supabase Auth, enable RLS on all exposed tables and storage, and add policies based on `auth.uid()` plus verified college/role/student mappings. Do not deploy with the development RLS settings or public storage buckets.

### Supabase schema cache / missing-table troubleshooting
If the API reports missing `tpo_records`, `fee_payments`, `fee_structures`, or `announcements.class_id`, rerun `supabase/schema_additions.sql` from top to bottom in the Supabase SQL Editor, then refresh the schema cache (the file ends with `NOTIFY pgrst, 'reload schema'`). Confirm the base tables `users`, `colleges`, `students`, `classes`, `programs`, and `profiles` already exist first.
