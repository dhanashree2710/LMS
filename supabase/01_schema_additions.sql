-- STEP 2 of 3 — run after 00_schema.sql. Safe to re-run.
-- 1) Extra columns on existing tables
alter table admission_applications add column if not exists docs_status text default 'pending';
alter table admission_applications add column if not exists document_url text;
alter table assignments add column if not exists attachment_url text;
alter table subject_assignments add column if not exists college_id uuid;
alter table exam_results add column if not exists college_id uuid;
alter table exam_results add column if not exists status text default 'entered';
-- 2) Allow the new staff roles
alter table user_roles drop constraint if exists user_roles_role_check;
alter table user_roles add constraint user_roles_role_check check (role = any (array['super_admin','college_admin','sub_admin','principal','admission_admin','hod','class_teacher','subject_teacher','examination_admin','accounts','librarian','tpo','activity_admin','student','parent']));
-- 3) New tables
create table if not exists enquiries(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),full_name text not null,mobile text,email text,program_id uuid references programs(id),status text default 'new',created_at timestamptz default now());
create table if not exists semesters(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),program_id uuid references programs(id),year_number int,semester_number int,name text,created_at timestamptz default now());
create table if not exists timetable(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),class_id uuid references classes(id),subject_id uuid references subjects(id),day text,start_time time,end_time time,room text,created_at timestamptz default now());
create table if not exists feedback(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),subject_id uuid references subjects(id),rating text,comments text,created_at timestamptz default now());
create table if not exists quiz_attempts(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),quiz_id uuid references quizzes(id) on delete cascade,student_id uuid references students(id),score numeric,total numeric,created_at timestamptz default now());
create table if not exists hall_tickets(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),student_id uuid references students(id),exam_id uuid references exams(id),seat_number text,venue text,created_at timestamptz default now());
create table if not exists promotions(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),student_id uuid references students(id),from_class_id uuid references classes(id),to_class_id uuid references classes(id),semester_number int,status text default 'promoted',created_at timestamptz default now());
create table if not exists placements(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),student_id uuid references students(id),company text,job_role text,package_lpa numeric,status text default 'applied',created_at timestamptz default now());
create table if not exists certificates(id uuid primary key default gen_random_uuid(),college_id uuid not null references colleges(id),student_id uuid references students(id),type text,certificate_number text,issued_on date,file_url text,created_at timestamptz default now());
-- 4) Storage buckets (public for development: the app uses its own login, not Supabase Auth)
insert into storage.buckets(id,name,public) values ('college-logos','college-logos',true),('student-photos','student-photos',true),('admission-documents','admission-documents',true),('assignments','assignments',true),('study-materials','study-materials',true),('certificates','certificates',true),('result-files','result-files',true) on conflict(id) do update set public=true;
drop policy if exists "lms_bucket_all" on storage.objects;
create policy "lms_bucket_all" on storage.objects for all to anon,authenticated using (bucket_id in ('college-logos','student-photos','admission-documents','assignments','study-materials','certificates','result-files')) with check (bucket_id in ('college-logos','student-photos','admission-documents','assignments','study-materials','certificates','result-files'));
-- 5) Development only: RLS off on all public tables (matches seed.sql)
do $$ declare t text; begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I disable row level security',t); end loop; end $$;

-- 6) Link subjects to a semester (run after step 3)
alter table subjects add column if not exists semester_id uuid references semesters(id) on delete set null;
create index if not exists subjects_semester_idx on subjects(semester_id);
create index if not exists subjects_department_idx on subjects(department_id);

-- 7) v6: syllabus details, class teacher, parent verification, fees, library
alter table subjects add column if not exists syllabus_url text;
alter table subjects add column if not exists syllabus_text text;
alter table subjects add column if not exists objectives text;
alter table subjects add column if not exists units text;
alter table subjects add column if not exists reference_books text;
alter table subjects add column if not exists teaching_hours integer;
alter table classes add column if not exists class_teacher_id uuid references profiles(id) on delete set null;
alter table parent_student_links add column if not exists verified boolean default false;
alter table parent_student_links add column if not exists verified_at timestamptz;
create table if not exists student_fees(
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  student_id uuid not null references students(id) on delete cascade, academic_year_id uuid references academic_years(id),
  title text not null, amount numeric not null default 0, paid_amount numeric not null default 0,
  due_date date, status text default 'pending', created_at timestamptz default now());
create table if not exists library_books(
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  title text not null, author text, isbn text, copies integer default 1, created_at timestamptz default now());
create table if not exists library_issues(
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  book_id uuid not null references library_books(id) on delete cascade, student_id uuid not null references students(id) on delete cascade,
  issued_on date default current_date, due_on date, returned_on date, status text default 'issued', created_at timestamptz default now());
create index if not exists fees_student_idx on student_fees(student_id);
create index if not exists issues_student_idx on library_issues(student_id);
alter table student_fees disable row level security;
alter table library_books disable row level security;
alter table library_issues disable row level security;

-- 8) v7: course department, student semester, timetable, announcement targeting, accounts, library, TPO
alter table programs add column if not exists department_id uuid references departments(id) on delete set null;
alter table students add column if not exists semester_id uuid references semesters(id) on delete set null;
alter table timetable add column if not exists semester_id uuid references semesters(id) on delete set null;
alter table timetable add column if not exists teacher_id uuid references profiles(id) on delete set null;
alter table announcements add column if not exists program_id uuid references programs(id) on delete set null;
alter table announcements add column if not exists class_id uuid references classes(id) on delete set null;
alter table announcements add column if not exists semester_id uuid references semesters(id) on delete set null;
alter table announcements add column if not exists subject_id uuid references subjects(id) on delete set null;
alter table library_issues alter column student_id drop not null;
alter table library_issues add column if not exists borrower_type text default 'student';
alter table library_issues add column if not exists staff_user_id uuid references profiles(id) on delete set null;
create table if not exists fee_structures(
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  title text not null, academic_year_id uuid references academic_years(id), program_id uuid references programs(id),
  class_id uuid references classes(id), semester_id uuid references semesters(id),
  amount numeric not null default 0, due_date date, created_at timestamptz default now());
create table if not exists fee_payments(
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  fee_id uuid not null references student_fees(id) on delete cascade, student_id uuid references students(id) on delete cascade,
  amount numeric not null, mode text default 'Cash', reference text, paid_on date default current_date,
  received_by uuid references profiles(id), receipt_no text, created_at timestamptz default now());
create table if not exists tpo_records(
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  type text not null default 'Training', title text not null, organization text, event_date date,
  program_id uuid references programs(id), class_id uuid references classes(id), semester_id uuid references semesters(id),
  student_count integer, status text default 'planned', description text, file_url text, created_at timestamptz default now());
alter table fee_structures disable row level security;
alter table fee_payments disable row level security;
alter table tpo_records disable row level security;


-- 9) Student portal fixes and targeted notification fields
alter table public.announcements add column if not exists target_student_ids uuid[] default '{}'::uuid[];
alter table public.announcements add column if not exists target_roles text[] default '{}'::text[];
alter table public.announcements add column if not exists target_department_id uuid references public.departments(id) on delete set null;
create index if not exists announcements_class_idx on public.announcements(class_id);
create index if not exists announcements_program_idx on public.announcements(program_id);
create index if not exists announcements_department_idx on public.announcements(target_department_id);
create index if not exists fee_payments_student_idx on public.fee_payments(student_id);
create index if not exists fee_payments_fee_idx on public.fee_payments(fee_id);
create index if not exists fee_structures_college_idx on public.fee_structures(college_id);
alter table public.placements add column if not exists placement_date date;
create index if not exists tpo_records_college_date_idx on public.tpo_records(college_id,event_date);

-- Clubs: membership state is tracked separately from the club definition.
alter table public.clubs add column if not exists auto_approve boolean not null default true;
alter table public.clubs add column if not exists capacity integer;
alter table public.quiz_attempts add column if not exists status text not null default 'completed';
create table if not exists public.club_enrollments (
 id uuid primary key default gen_random_uuid(),
 college_id uuid not null references public.colleges(id) on delete cascade,
 club_id uuid not null references public.clubs(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected','waitlisted','cancelled')),
 requested_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id) on delete set null,
 unique(club_id,student_id)
);
create index if not exists club_enrollments_club_status_idx on public.club_enrollments(club_id,status);
create index if not exists club_enrollments_student_idx on public.club_enrollments(student_id);
-- The application uses a custom users/password table with the anon Supabase key.
-- Do not enable RLS here until login is migrated to Supabase Auth and policies
-- are written for auth.uid(); this schema is not a production security boundary.
notify pgrst, 'reload schema';

-- 10) Atomic club enrollment/review functions. These enforce capacity at the DB level.
create or replace function public.lms_enroll_in_club(p_club_id uuid,p_student_id uuid)
returns public.club_enrollments language plpgsql security definer set search_path=public as $$
declare c public.clubs%rowtype; n integer; r public.club_enrollments%rowtype; v_status text;
begin
 select * into c from public.clubs where id=p_club_id for update;
 if not found then raise exception 'Club not found'; end if;
 select * into r from public.club_enrollments where club_id=p_club_id and student_id=p_student_id;
 if found and r.status in ('approved','pending','waitlisted') then return r; end if;
 select count(*) into n from public.club_enrollments where club_id=p_club_id and status='approved';
 if c.capacity is not null and n>=c.capacity then v_status='waitlisted';
 elsif coalesce(c.auto_approve,true) then v_status='approved';
 else v_status='pending'; end if;
 insert into public.club_enrollments(college_id,club_id,student_id,status) values(c.college_id,p_club_id,p_student_id,v_status)
 on conflict(club_id,student_id) do update set status=excluded.status,requested_at=now(),reviewed_at=null,reviewed_by=null returning * into r;
 return r;
end $$;
create or replace function public.lms_review_club_request(p_enrollment_id uuid,p_decision text,p_reviewer_id uuid)
returns public.club_enrollments language plpgsql security definer set search_path=public as $$
declare r public.club_enrollments%rowtype; c public.clubs%rowtype; n integer; v_club uuid;
begin
 if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
 select club_id into v_club from public.club_enrollments where id=p_enrollment_id;
 if not found then raise exception 'Enrollment request not found'; end if;
 select * into c from public.clubs where id=v_club for update;
 select * into r from public.club_enrollments where id=p_enrollment_id for update;
 if p_decision='approved' then
  select count(*) into n from public.club_enrollments where club_id=r.club_id and status='approved';
  if c.capacity is not null and n>=c.capacity then raise exception 'Club is full. Request cannot be approved.'; end if;
 end if;
 update public.club_enrollments set status=p_decision,reviewed_at=now(),reviewed_by=p_reviewer_id where id=p_enrollment_id returning * into r;
 return r;
end $$;
grant execute on function public.lms_enroll_in_club(uuid,uuid) to anon, authenticated;
grant execute on function public.lms_review_club_request(uuid,text,uuid) to anon, authenticated;
create or replace function public.lms_promote_club_waitlist()
returns trigger language plpgsql security definer set search_path=public as $$
declare c public.clubs%rowtype; n integer; w public.club_enrollments%rowtype;
begin
 if old.status='approved' and new.status in ('cancelled','rejected') then
  select * into c from public.clubs where id=new.club_id;
  if c.capacity is null then return new; end if;
  select count(*) into n from public.club_enrollments where club_id=new.club_id and status='approved';
  if n<c.capacity then select * into w from public.club_enrollments where club_id=new.club_id and status='waitlisted' order by requested_at limit 1 for update;
   if found then update public.club_enrollments set status='approved',reviewed_at=now() where id=w.id; end if;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists club_waitlist_promote on public.club_enrollments;
create trigger club_waitlist_promote after update of status on public.club_enrollments for each row execute function public.lms_promote_club_waitlist();

-- 11) Explicit schema relationships and API table privileges for the added features
alter table public.students add column if not exists user_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='students_user_id_fk' and conrelid='public.students'::regclass) then
  alter table public.students add constraint students_user_id_fk foreign key(user_id) references public.users(id) on delete set null not valid;
 end if;
end $$;
create index if not exists students_user_id_idx on public.students(user_id);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='announcements_class_id_fk' and conrelid='public.announcements'::regclass) then
  alter table public.announcements add constraint announcements_class_id_fk foreign key(class_id) references public.classes(id) on delete set null not valid;
 end if;
end $$;
grant select,insert,update,delete on public.club_enrollments to anon,authenticated;

-- ===== v10: feedback forms assigned to a class / semester, and student responses =====
create table if not exists public.feedback_forms (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  title text not null,
  description text,
  department_id uuid references public.departments(id),
  program_id uuid references public.programs(id),
  class_id uuid references public.classes(id),
  semester_id uuid references public.semesters(id),
  subject_id uuid references public.subjects(id),
  teacher_id uuid references public.profiles(id),
  questions jsonb not null default '[]'::jsonb,
  open_on date default current_date,
  close_on date,
  status text not null default 'open' check (status in ('draft','open','closed')),
  anonymous boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  form_id uuid not null references public.feedback_forms(id) on delete cascade,
  student_id uuid not null references public.students(id),
  answers jsonb not null default '{}'::jsonb,
  comments text,
  created_at timestamptz default now(),
  unique (form_id, student_id)
);
create index if not exists feedback_forms_class_idx on public.feedback_forms(class_id);
create index if not exists feedback_responses_form_idx on public.feedback_responses(form_id);
alter table public.feedback_forms disable row level security;
alter table public.feedback_responses disable row level security;
grant all on public.feedback_forms, public.feedback_responses to anon, authenticated;
alter table public.feedback_forms add column if not exists anonymous boolean not null default true;
