-- Optional: create your own first Super Admin (the sample data already includes superadmin@kdrtlms.in).
-- Change the email and password before running.
with u as (insert into users(full_name,email,password) values('Super Admin','admin@kdrt.com','ChangeMe123') returning id,full_name,email),
p as (insert into profiles(id,email,full_name) select id,email,full_name from u)
insert into user_roles(user_id,role) select id,'super_admin' from u;

-- 2) Development only: turn off RLS so the browser app can read and write.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('alter table public.%I disable row level security', t);
 end loop; end $$;
