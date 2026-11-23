-- =====================================================================
-- 04 · Cleanup + permission fix + online exams   (run once in the Supabase SQL editor; safe to re-run)
--
--  A. Fixes "permission denied for table …" and "You do not have permission to perform this action"
--  B. Every login gets a profile (fixes "violates foreign key constraint …uploaded_by / teacher_id / created_by")
--  C. Columns for online exams
--  D. Removes DOUBLE data: duplicate rows are merged into one (links are moved to the kept row)
--  E. Stops duplicates coming back (unique indexes)
--  F. Drops duplicate foreign keys and the old tables this LMS never uses
--
--  Take a backup first: Supabase → Database → Backups.
-- =====================================================================

-- ---------- A. permissions -------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on all tables    in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables    to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I disable row level security', t);
  end loop;
end $$;

-- storage buckets used by the app
insert into storage.buckets(id,name,public) values
 ('college-logos','college-logos',true),('student-photos','student-photos',true),('admission-documents','admission-documents',true),
 ('assignments','assignments',true),('study-materials','study-materials',true),('certificates','certificates',true),('result-files','result-files',true)
on conflict(id) do update set public=true;
drop policy if exists "lms_bucket_all" on storage.objects;
create policy "lms_bucket_all" on storage.objects for all to anon,authenticated
 using (bucket_id in ('college-logos','student-photos','admission-documents','assignments','study-materials','certificates','result-files'))
 with check (bucket_id in ('college-logos','student-photos','admission-documents','assignments','study-materials','certificates','result-files'));

-- ---------- B. one profile for every login --------------------------------
insert into public.profiles(id,email,full_name,phone)
select u.id,u.email,u.full_name,u.phone from public.users u
where not exists (select 1 from public.profiles p where p.id=u.id);

create or replace function public.lms_user_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,email,full_name,phone) values (new.id,new.email,new.full_name,new.phone)
  on conflict (id) do update set email=excluded.email, full_name=excluded.full_name, phone=excluded.phone, updated_at=now();
  return new;
end $$;
drop trigger if exists trg_users_profile on public.users;
create trigger trg_users_profile after insert or update of email,full_name,phone on public.users
  for each row execute function public.lms_user_profile();

-- ---------- C. online exams -------------------------------------------------
alter table public.exams add column if not exists mode text default 'written';
alter table public.exams add column if not exists start_time timestamptz;
alter table public.exams add column if not exists end_time timestamptz;
alter table public.exams add column if not exists duration_minutes integer;
alter table public.exams add column if not exists instructions text;
alter table public.exams add column if not exists blueprint jsonb;
alter table public.exams add column if not exists show_result_immediately boolean default false;
alter table public.exams add column if not exists total_questions integer default 0;
alter table public.exams add column if not exists status text default 'draft';
alter table public.exam_results add column if not exists answers jsonb;
alter table public.exam_results add column if not exists submitted_at timestamptz;
alter table public.exam_results add column if not exists college_id uuid;
alter table public.exam_results add column if not exists status text default 'entered';

-- ---------- D. merge duplicate rows -----------------------------------------
-- lms_merge(table, key expression, filter): rows with the same key are merged into the oldest one.
-- Every foreign key that points at a removed duplicate is moved to the kept row first
-- (if that would itself create a duplicate, the extra child row is removed).
create or replace function pg_temp.lms_merge(t text, k text, w text default 'true') returns integer language plpgsql as $$
declare g record; fk record; n integer := 0; keep uuid; dups uuid[];
begin
  if to_regclass('public.'||t) is null then return 0; end if;
  for g in execute format(
    'select array_agg(id order by %s, id) ids from public.%I where %s group by %s having count(*)>1',
    case when exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='created_at') then 'created_at' else 'id' end,
    t, w, k)
  loop
    keep := g.ids[1]; dups := g.ids[2:];
    for fk in
      select c.conrelid::regclass::text tbl, a.attname col
      from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
      where c.contype='f' and c.confrelid=('public.'||t)::regclass and array_length(c.conkey,1)=1
    loop
      begin
        execute format('update %s set %I=$1 where %I = any($2)', fk.tbl, fk.col, fk.col) using keep, dups;
      exception when unique_violation then
        execute format('delete from %s where %I = any($1)', fk.tbl, fk.col) using dups;
      end;
    end loop;
    execute format('delete from public.%I where id = any($1)', t) using dups;
    n := n + array_length(dups,1);
  end loop;
  return n;
end $$;

do $$ declare r record; n integer; total integer := 0; begin
  for r in select * from (values
    -- structure first (parents), then the records that hang off them
    (1,'departments','college_id, lower(trim(name))','true'),
    (2,'academic_years','college_id, trim(name)','true'),
    (3,'programs','college_id, lower(trim(code))','true'),
    (4,'semesters','program_id, semester_number','program_id is not null and semester_number is not null'),
    (5,'classes','program_id, academic_year_id, lower(trim(name))','true'),
    (6,'subjects','college_id, program_id, lower(trim(code))','true'),
    (7,'students','college_id, lower(trim(roll_number))','true'),
    (8,'parents','college_id, lower(trim(email))','email is not null and trim(email)<>'''''),
    (9,'user_roles','user_id, role, college_id','true'),
    (10,'subject_assignments','subject_id, class_id, academic_year_id, teacher_id','true'),
    (11,'parent_student_links','parent_id, student_id','true'),
    (12,'timetable','class_id, semester_id, lower(day), start_time','true'),
    (13,'exams','subject_id, class_id, academic_year_id, lower(trim(name))','true'),
    (14,'exam_results','exam_id, student_id','true'),
    (15,'internal_marks','student_id, subject_id, academic_year_id, max_marks','true'),
    (16,'academic_progression','student_id, academic_year_id','true'),
    (17,'assignments','subject_id, class_id, lower(trim(title))','true'),
    (18,'assignment_submissions','assignment_id, student_id, attempt_number','true'),
    (19,'quizzes','subject_id, class_id, lower(trim(title))','true'),
    (20,'quiz_attempts','quiz_id, student_id','true'),
    (21,'study_materials','subject_id, class_id, lower(trim(title))','true'),
    (22,'announcements','college_id, lower(trim(title)), coalesce(body,''''), (created_at::date)','true'),
    (23,'fee_structures','college_id, lower(trim(title)), academic_year_id, program_id, class_id, semester_id','true'),
    (24,'student_fees','student_id, lower(trim(title)), academic_year_id','true'),
    (25,'hall_tickets','student_id, exam_id','true'),
    (26,'competition_registrations','competition_id, student_id','true'),
    (27,'placements','student_id, lower(coalesce(company,'''')), lower(coalesce(job_role,''''))','true'),
    (28,'certificates','student_id, lower(coalesce(type,'''')), coalesce(certificate_number,'''')','true'),
    (29,'promotions','student_id, from_class_id, to_class_id','true'),
    (30,'library_books','college_id, lower(trim(title)), lower(coalesce(author,''''))','true'),
    (31,'clubs','college_id, lower(trim(name))','true'),
    (32,'competitions','college_id, lower(trim(title)), event_date','true'),
    (33,'feedback_forms','college_id, lower(trim(title)), class_id, semester_id, subject_id','true'),
    (34,'enquiries','college_id, lower(trim(full_name)), coalesce(mobile,'''')','true')
  ) v(o,t,k,w) order by o loop
    begin n := pg_temp.lms_merge(r.t, r.k, r.w);
    exception when undefined_column or undefined_table then raise notice 'Skipped % (column not in this database)', r.t; n := 0; end;
    if n > 0 then raise notice 'Removed % duplicate row(s) from %', n, r.t; end if;
    total := total + n;
  end loop;
  raise notice 'Duplicate rows removed in total: %', total;
end $$;

-- ---------- E. keep duplicates from coming back -----------------------------
do $$ declare q text; begin
  foreach q in array array[
    $q$create unique index if not exists ux_user_roles        on public.user_roles (user_id, role, coalesce(college_id,'00000000-0000-0000-0000-000000000000'::uuid))$q$,
    $q$create unique index if not exists ux_programs_code     on public.programs (college_id, lower(code))$q$,
    $q$create unique index if not exists ux_semesters         on public.semesters (program_id, semester_number) where program_id is not null and semester_number is not null$q$,
    $q$create unique index if not exists ux_students_roll     on public.students (college_id, lower(roll_number))$q$,
    $q$create unique index if not exists ux_subject_alloc     on public.subject_assignments (subject_id, class_id, academic_year_id, teacher_id)$q$,
    $q$create unique index if not exists ux_parent_links      on public.parent_student_links (parent_id, student_id)$q$,
    $q$create unique index if not exists ux_exam_results      on public.exam_results (exam_id, student_id)$q$,
    $q$create unique index if not exists ux_progression       on public.academic_progression (student_id, academic_year_id)$q$,
    $q$create unique index if not exists ux_hall_tickets      on public.hall_tickets (student_id, exam_id)$q$,
    $q$create unique index if not exists ux_comp_reg          on public.competition_registrations (competition_id, student_id)$q$
  ] loop
    begin execute q; exception when others then raise notice 'Index not created (%): %', sqlerrm, left(q,80); end;
  end loop;
end $$;

-- ---------- F. duplicate foreign keys + unused tables -----------------------
-- students.user_id and announcements.class_id each had two identical links
alter table public.students      drop constraint if exists students_user_id_fk;
alter table public.announcements drop constraint if exists announcements_class_id_fk;

-- Tables from an older exam/LMS product that this app never reads or writes.
-- (club_memberships was replaced by club_enrollments; otp_verifications is not used by the login.)
drop table if exists public.exam_attempts, public.exam_assignments, public.exam_questions, public.question_media,
  public.questions, public.results, public.syllabus_imports, public.topics, public.chapters, public.exam_categories,
  public.assignment_attachments, public.assignment_batches, public.submission_files, public.batch_members, public.batches,
  public.activity_events, public.activities, public.engagement_status, public.notifications, public.app_sessions,
  public.organizations, public.club_memberships, public.otp_verifications cascade;

-- refresh the API so the changes are visible immediately
notify pgrst, 'reload schema';

-- what is left: tables and row counts
select c.relname as table_name, c.reltuples::bigint as approx_rows
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by 1;
