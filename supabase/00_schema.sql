-- =====================================================================
-- College LMS — base schema (STEP 1 of 3)
-- Safe to run on a fresh Supabase project AND on an existing one:
-- every table uses CREATE TABLE IF NOT EXISTS, so existing tables are left alone.
-- Order: 00_schema.sql  ->  schema_additions.sql  ->  02_seed_data.sql
-- =====================================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.colleges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  address text, contact_phone text, contact_email text, logo_url text,
  ug_enabled boolean default true, pg_enabled boolean default true,
  status text not null default 'active' check (status in ('active','suspended')),
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- NOTE: the current app signs in against this table (development architecture).
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null, email text not null unique, phone text,
  password text not null, is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  email text, full_name text, phone text, avatar_url text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  college_id uuid references public.colleges(id),
  role text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.academic_years (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  name text not null, start_date date, end_date date,
  is_active boolean default false, created_at timestamptz default now()
);

create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  name text not null, code text,
  hod_user_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.programs (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  name text not null, code text not null,
  level text not null check (level in ('UG','PG')),
  duration_years integer default 3,
  department_id uuid references public.departments(id),
  created_at timestamptz default now()
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  program_id uuid references public.programs(id),
  year_number integer, semester_number integer, name text,
  created_at timestamptz default now()
);

create table if not exists public.classes (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  program_id uuid not null references public.programs(id),
  academic_year_id uuid not null references public.academic_years(id),
  name text not null, year_number integer,
  class_teacher_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.divisions (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.classes(id),
  name text not null, created_at timestamptz default now()
);

create table if not exists public.subjects (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  program_id uuid references public.programs(id),
  department_id uuid references public.departments(id),
  semester_id uuid references public.semesters(id),
  code text not null, name text not null, credits numeric,
  is_elective boolean default false,
  syllabus_url text, syllabus_text text, objectives text, units text,
  reference_books text, teaching_hours integer,
  created_at timestamptz default now()
);

create table if not exists public.subject_assignments (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid references public.colleges(id),
  subject_id uuid not null references public.subjects(id),
  class_id uuid not null references public.classes(id),
  teacher_id uuid not null references public.profiles(id),
  academic_year_id uuid not null references public.academic_years(id),
  created_at timestamptz default now()
);

create table if not exists public.admission_applications (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  academic_year_id uuid not null references public.academic_years(id),
  program_id uuid not null references public.programs(id),
  department_id uuid references public.departments(id),
  full_name text not null, dob date, email text,
  student_mobile text, parent_mobile text, address text,
  previous_education jsonb, photo_url text, documents jsonb default '[]'::jsonb,
  student_otp_verified boolean default false, parent_otp_verified boolean default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected','correction_required')),
  reviewed_by uuid references public.profiles(id), review_notes text,
  docs_status text default 'pending', document_url text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  full_name text not null, mobile text, email text,
  program_id uuid references public.programs(id),
  status text default 'new', created_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references public.profiles(id),
  college_id uuid not null references public.colleges(id),
  application_id uuid references public.admission_applications(id),
  roll_number text not null,
  program_id uuid not null references public.programs(id),
  class_id uuid references public.classes(id),
  division_id uuid references public.divisions(id),
  semester_id uuid references public.semesters(id),
  academic_year_id uuid not null references public.academic_years(id),
  full_name text not null, dob date, email text, mobile text, parent_mobile text, photo_url text,
  status text default 'active' check (status in ('active','inactive','alumni','suspended')),
  created_at timestamptz default now()
);

create table if not exists public.parents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references public.profiles(id),
  college_id uuid not null references public.colleges(id),
  full_name text, mobile text, email text, created_at timestamptz default now()
);

create table if not exists public.parent_student_links (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references public.parents(id),
  student_id uuid not null references public.students(id),
  relationship text default 'parent', is_primary boolean default true,
  verified boolean default false, verified_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.otp_verifications (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid references public.colleges(id),
  mobile text not null, purpose text not null, otp_hash text not null,
  expires_at timestamptz not null, verified_at timestamptz,
  attempts integer default 0, created_at timestamptz default now()
);

create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  student_id uuid not null references public.students(id),
  subject_id uuid not null references public.subjects(id),
  class_id uuid not null references public.classes(id),
  date date not null,
  status text not null check (status in ('present','absent','late','excused')),
  marked_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.assignments (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  subject_id uuid not null references public.subjects(id),
  class_id uuid not null references public.classes(id),
  teacher_id uuid not null references public.profiles(id),
  title text not null, instructions text, max_marks numeric default 20,
  allowed_file_types text[] default array['pdf','doc','docx','jpg','png'],
  open_at timestamptz, deadline timestamptz not null,
  grace_hours integer default 0, late_penalty_per_day numeric default 0,
  final_cutoff timestamptz, attachment_url text,
  created_at timestamptz default now()
);

create table if not exists public.assignment_submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.assignments(id),
  student_id uuid not null references public.students(id),
  file_urls text[] default '{}'::text[],
  submitted_at timestamptz default now(),
  is_late boolean default false, late_days integer default 0,
  original_marks numeric, penalty numeric default 0, final_marks numeric,
  feedback text, evaluated_by uuid references public.profiles(id), evaluated_at timestamptz
);

create table if not exists public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  subject_id uuid not null references public.subjects(id),
  class_id uuid references public.classes(id),
  teacher_id uuid not null references public.profiles(id),
  title text not null, questions jsonb not null default '[]'::jsonb,
  duration_minutes integer, max_marks numeric, negative_marking boolean default false,
  open_at timestamptz, close_at timestamptz, created_at timestamptz default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  quiz_id uuid references public.quizzes(id),
  student_id uuid references public.students(id),
  score numeric, total numeric, status text not null default 'completed',
  created_at timestamptz default now()
);

create table if not exists public.exams (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  subject_id uuid not null references public.subjects(id),
  class_id uuid references public.classes(id),
  academic_year_id uuid not null references public.academic_years(id),
  name text not null, exam_date date, max_marks numeric,
  created_at timestamptz default now()
);

create table if not exists public.exam_results (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid,
  exam_id uuid not null references public.exams(id),
  student_id uuid not null references public.students(id),
  marks_obtained numeric, grade text, is_published boolean default false,
  status text default 'entered', created_at timestamptz default now()
);

create table if not exists public.hall_tickets (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  student_id uuid references public.students(id),
  exam_id uuid references public.exams(id),
  seat_number text, venue text, created_at timestamptz default now()
);

create table if not exists public.internal_marks (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  student_id uuid not null references public.students(id),
  subject_id uuid not null references public.subjects(id),
  academic_year_id uuid not null references public.academic_years(id),
  marks numeric, max_marks numeric, created_at timestamptz default now()
);

create table if not exists public.clubs (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  name text not null, description text, capacity integer,
  auto_approve boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.club_memberships (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id),
  student_id uuid not null references public.students(id),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  joined_at timestamptz default now()
);

create table if not exists public.competitions (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  title text not null, description text, event_date date, capacity integer,
  created_at timestamptz default now()
);

create table if not exists public.competition_registrations (
  id uuid primary key default uuid_generate_v4(),
  competition_id uuid not null references public.competitions(id),
  student_id uuid not null references public.students(id),
  status text default 'registered', created_at timestamptz default now()
);

create table if not exists public.activity_marks (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  student_id uuid not null references public.students(id),
  academic_year_id uuid not null references public.academic_years(id),
  activity_type text, title text, marks numeric, max_marks numeric,
  certificate_url text, approved_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.result_imports (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  academic_year_id uuid not null references public.academic_years(id),
  uploaded_by uuid references public.profiles(id),
  file_path text, status text default 'pending', validation_log jsonb,
  created_at timestamptz default now()
);

create table if not exists public.academic_progression (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  student_id uuid not null references public.students(id),
  academic_year_id uuid not null references public.academic_years(id),
  status text not null check (status in ('PASS','ATKT','FAIL','PENDING')),
  backlogs jsonb default '[]'::jsonb, promoted boolean default false,
  approved_by uuid references public.profiles(id), approved_at timestamptz,
  notes text, created_at timestamptz default now()
);

create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  title text not null, body text,
  target_roles text[] default '{}'::text[],
  created_by uuid references public.profiles(id),
  program_id uuid references public.programs(id),
  class_id uuid references public.classes(id),
  semester_id uuid references public.semesters(id),
  subject_id uuid references public.subjects(id),
  target_student_ids uuid[] default '{}'::uuid[],
  target_department_id uuid references public.departments(id),
  created_at timestamptz default now()
);

create table if not exists public.study_materials (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id),
  subject_id uuid not null references public.subjects(id),
  class_id uuid references public.classes(id),
  title text not null, file_url text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid references public.colleges(id),
  user_id uuid references public.profiles(id),
  action text not null, entity_type text, entity_id uuid,
  old_data jsonb, new_data jsonb, ip_address text,
  created_at timestamptz default now()
);

create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  class_id uuid references public.classes(id),
  subject_id uuid references public.subjects(id),
  semester_id uuid references public.semesters(id),
  teacher_id uuid references public.profiles(id),
  day text, start_time time, end_time time, room text,
  created_at timestamptz default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  subject_id uuid references public.subjects(id),
  rating text, comments text, created_at timestamptz default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  student_id uuid references public.students(id),
  from_class_id uuid references public.classes(id),
  to_class_id uuid references public.classes(id),
  semester_number integer, status text default 'promoted',
  created_at timestamptz default now()
);

create table if not exists public.placements (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  student_id uuid references public.students(id),
  company text, job_role text, package_lpa numeric,
  status text default 'applied', placement_date date,
  created_at timestamptz default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  student_id uuid references public.students(id),
  type text, certificate_number text, issued_on date, file_url text,
  created_at timestamptz default now()
);

create table if not exists public.student_fees (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  student_id uuid not null references public.students(id),
  academic_year_id uuid references public.academic_years(id),
  title text not null, amount numeric not null default 0, paid_amount numeric not null default 0,
  due_date date, status text default 'pending', created_at timestamptz default now()
);

create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  title text not null,
  academic_year_id uuid references public.academic_years(id),
  program_id uuid references public.programs(id),
  class_id uuid references public.classes(id),
  semester_id uuid references public.semesters(id),
  amount numeric not null default 0, due_date date,
  created_at timestamptz default now()
);

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  fee_id uuid not null references public.student_fees(id),
  student_id uuid references public.students(id),
  amount numeric not null, mode text default 'Cash', reference text,
  paid_on date default current_date,
  received_by uuid references public.profiles(id), receipt_no text,
  created_at timestamptz default now()
);

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  title text not null, author text, isbn text, copies integer default 1,
  created_at timestamptz default now()
);

create table if not exists public.library_issues (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  book_id uuid not null references public.library_books(id),
  student_id uuid references public.students(id),
  borrower_type text default 'student',
  staff_user_id uuid references public.profiles(id),
  issued_on date default current_date, due_on date, returned_on date,
  status text default 'issued', created_at timestamptz default now()
);

create table if not exists public.tpo_records (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id),
  type text not null default 'Training', title text not null, organization text,
  event_date date,
  program_id uuid references public.programs(id),
  class_id uuid references public.classes(id),
  semester_id uuid references public.semesters(id),
  student_count integer, status text default 'planned', description text, file_url text,
  created_at timestamptz default now()
);

-- Helpful indexes for the queries the app runs most (college scope + lookups)
create index if not exists ix_user_roles_user on public.user_roles(user_id);
create index if not exists ix_user_roles_college on public.user_roles(college_id);
create index if not exists ix_students_college on public.students(college_id);
create index if not exists ix_students_class on public.students(class_id);
create index if not exists ix_students_roll on public.students(college_id, roll_number);
create index if not exists ix_attendance_student on public.attendance(student_id);
create index if not exists ix_attendance_class_date on public.attendance(class_id, date);
create index if not exists ix_subjects_program on public.subjects(program_id);
create index if not exists ix_classes_program on public.classes(program_id);
create index if not exists ix_exam_results_student on public.exam_results(student_id);
create index if not exists ix_internal_marks_student on public.internal_marks(student_id);
create index if not exists ix_psl_parent on public.parent_student_links(parent_id);
create index if not exists ix_psl_student on public.parent_student_links(student_id);
create index if not exists ix_timetable_class on public.timetable(class_id);
