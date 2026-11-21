-- =====================================================================
-- 03 · Linked updates and deletes (run once, after 00/01/02; safe to re-run)
-- Makes add / edit / delete keep every linked table in step automatically:
--   * deleting a student, subject, exam, quiz, assignment, fee, book, club,
--     competition, parent or feedback form removes its child rows (CASCADE)
--   * deleting a staff profile clears optional "by/teacher" links (SET NULL)
--   * a class can be deleted only when no student is in it; its timetable,
--     allocations, materials, exams etc. go with it
--   * colleges, departments, courses, semesters and academic years stay
--     protected: the app shows what still uses them
--   * student / parent edits are copied to their login (users + profiles);
--     deleting a student / parent removes a login nobody else uses
-- =====================================================================
do $$
declare r record; rule text; nn boolean;
begin
  for r in
    select c.oid, c.conname, c.conrelid::regclass::text as tbl, a.attname as col,
           c.confrelid::regclass::text as ref, a.attnotnull, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
    join pg_namespace n on n.oid=c.connamespace
    where c.contype='f' and n.nspname='public' and array_length(c.conkey,1)=1
      and c.confdeltype in ('a','r')
  loop
    rule := null; nn := r.attnotnull;
    if r.ref in ('students','subjects','exams','quizzes','assignments','student_fees','library_books',
                 'clubs','competitions','parents','feedback_forms') then
      rule := 'CASCADE';
    elsif r.ref in ('admission_applications') then
      rule := case when nn then null else 'SET NULL' end;
    elsif r.ref in ('profiles','users') then
      rule := case when r.tbl in ('user_roles') then 'CASCADE' when nn then null else 'SET NULL' end;
    elsif r.ref = 'classes' then
      rule := case when r.tbl='students' then null
                   when r.tbl in ('promotions','announcements','feedback_forms','tpo_records') and not nn then 'SET NULL'
                   else 'CASCADE' end;
    elsif r.ref in ('semesters','programs','departments') and r.tbl in ('announcements','feedback_forms','tpo_records','enquiries','admission_applications') and not nn then
      rule := 'SET NULL';
    end if;
    if rule is not null then
      execute format('alter table %I drop constraint %I', r.tbl, r.conname);
      execute format('alter table %I add constraint %I %s on delete %s not valid', r.tbl, r.conname,
                     regexp_replace(r.def,'\s+(ON DELETE \w+( \w+)?|NOT VALID)','','gi'), rule);
    end if;
  end loop;
end $$;

-- keep the login in step with student / parent records
create or replace function lms_sync_login() returns trigger language plpgsql security definer set search_path=public as $$
declare ph text;
begin
  if new.user_id is null then return new; end if;
  ph := case when tg_table_name='students' then new.mobile else new.mobile end;
  update users set full_name=coalesce(new.full_name,full_name), email=coalesce(new.email,email),
         phone=coalesce(ph,phone), updated_at=now() where id=new.user_id;
  update profiles set full_name=coalesce(new.full_name,full_name), email=coalesce(new.email,email),
         phone=coalesce(ph,phone), updated_at=now() where id=new.user_id;
  return new;
end $$;
drop trigger if exists trg_students_sync_login on students;
create trigger trg_students_sync_login after update of full_name,email,mobile on students
  for each row execute function lms_sync_login();
drop trigger if exists trg_parents_sync_login on parents;
create trigger trg_parents_sync_login after update of full_name,email,mobile on parents
  for each row execute function lms_sync_login();

-- remove the login of a deleted student / parent when nothing else uses it
create or replace function lms_drop_login() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.user_id is null then return old; end if;
  delete from user_roles where user_id=old.user_id and role in ('student','parent');
  if not exists (select 1 from user_roles where user_id=old.user_id)
     and not exists (select 1 from students where user_id=old.user_id)
     and not exists (select 1 from parents where user_id=old.user_id) then
    delete from profiles where id=old.user_id;
    delete from users where id=old.user_id;
  end if;
  return old;
end $$;
drop trigger if exists trg_students_drop_login on students;
create trigger trg_students_drop_login after delete on students for each row execute function lms_drop_login();
drop trigger if exists trg_parents_drop_login on parents;
create trigger trg_parents_drop_login after delete on parents for each row execute function lms_drop_login();
