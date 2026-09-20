-- Isolated project-manager tables; existing apps and auth settings are untouched.
create schema if not exists prmg_private;
revoke all on schema prmg_private from public, anon;
grant usage on schema prmg_private to authenticated;

create table prmg_private.owners (user_id uuid primary key references auth.users(id));
alter table prmg_private.owners enable row level security;
insert into prmg_private.owners(user_id) select id from auth.users where email = 'esemmoc@gmail.com';

-- A real, unrevoked owner session must be younger than 90 days on every request.
-- SECURITY DEFINER is necessary to check the private auth.sessions table.
create function prmg_private.can_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from prmg_private.owners o join auth.sessions s on s.user_id = o.user_id
    where o.user_id = auth.uid()
      and s.id::text = (auth.jwt() ->> 'session_id')
      and s.created_at > now() - interval '90 days'
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function prmg_private.can_access() from public, anon;
grant execute on function prmg_private.can_access() to authenticated;

create function public.prmg_session_valid() returns boolean
language sql stable security invoker set search_path = '' as $$
  select prmg_private.can_access();
$$;
revoke all on function public.prmg_session_valid() from public, anon;
grant execute on function public.prmg_session_valid() to authenticated;

create table public.prmg_projects (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 160),
 description text not null default '' check (length(description) <= 20000),
 status text not null default 'active' check (status in ('planning','active','on_hold','completed','archived')),
 color text not null default '#49755f' check (color ~ '^#[0-9a-fA-F]{6}$'),
 start_date date, due_date date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (start_date is null or due_date is null or due_date >= start_date)
);
create table public.prmg_tasks (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.prmg_projects(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 240),
 description text not null default '' check (length(description) <= 50000),
 status text not null default 'todo' check (status in ('todo','in_progress','review','done')),
 priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
 assignee text not null default '' check (length(assignee) <= 160),
 start_date date, due_date date,
 labels text[] not null default '{}' check (cardinality(labels) <= 20),
 checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (start_date is null or due_date is null or due_date >= start_date)
);
create table public.prmg_documents (
 id uuid primary key default gen_random_uuid(),
 project_id uuid references public.prmg_projects(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 240),
 content text not null default '' check (length(content) <= 200000),
 category text not null default 'Notes' check (length(category) between 1 and 80),
 pinned boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.prmg_milestones (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.prmg_projects(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 240),
 description text not null default '' check (length(description) <= 20000),
 due_date date not null,
 completed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.prmg_comments (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.prmg_tasks(id) on delete cascade,
 content text not null check (length(trim(content)) between 1 and 10000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.prmg_activity (
 id uuid primary key default gen_random_uuid(),
 entity_id uuid not null,
 entity_type text not null,
 title text not null,
 action text not null check (action in ('created','updated','deleted')),
 created_at timestamptz not null default now()
);

create index prmg_tasks_project_idx on public.prmg_tasks(project_id);
create index prmg_tasks_due_idx on public.prmg_tasks(due_date) where status <> 'done';
create index prmg_documents_project_idx on public.prmg_documents(project_id);
create index prmg_milestones_project_idx on public.prmg_milestones(project_id);
create index prmg_comments_task_idx on public.prmg_comments(task_id);
create index prmg_activity_created_idx on public.prmg_activity(created_at desc);

create function prmg_private.touch_record() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 new.created_at := old.created_at;
 new.updated_at := clock_timestamp();
 return new;
end;
$$;
create function prmg_private.record_activity() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare item jsonb;
begin
 item := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.prmg_activity(entity_id, entity_type, title, action)
 values ((item->>'id')::uuid, replace(tg_table_name, 'prmg_', ''),
 coalesce(item->>'name', item->>'title', 'Task comment'),
 case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end);
 return coalesce(new, old);
end;
$$;
revoke all on function prmg_private.touch_record(), prmg_private.record_activity() from public, anon;
grant execute on function prmg_private.touch_record(), prmg_private.record_activity() to authenticated;

do $$
declare t text;
begin
 foreach t in array array['projects','tasks','documents','milestones','comments','activity'] loop
  execute format('alter table public.prmg_%I enable row level security', t);
  execute format('revoke all on public.prmg_%I from anon, authenticated', t);
  execute format('grant select, insert, update, delete on public.prmg_%I to authenticated', t);
  execute format('create policy owner_access on public.prmg_%I for all to authenticated using ((select prmg_private.can_access())) with check ((select prmg_private.can_access()))', t);
  if t <> 'activity' then
   execute format('create trigger touch_record before update on public.prmg_%I for each row execute function prmg_private.touch_record()', t);
   execute format('create trigger record_activity after insert or update or delete on public.prmg_%I for each row execute function prmg_private.record_activity()', t);
  end if;
 end loop;
end;
$$;
