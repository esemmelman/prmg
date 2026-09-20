-- Execute as database administrator. Every test change is rolled back.
begin;
do $$
declare owner_id uuid; session_id uuid := gen_random_uuid();
begin
 select user_id into strict owner_id from prmg_private.owners;
 insert into auth.sessions(id,user_id,created_at,updated_at)
 values(session_id,owner_id,now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'session_id',session_id,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
declare project_id uuid; task_id uuid; original_stamp timestamptz; new_stamp timestamptz; changed integer;
begin
 if not public.prmg_session_valid() then raise exception 'Owner session rejected'; end if;
 insert into public.prmg_projects(name) values('Temporary verification project') returning id into project_id;
 insert into public.prmg_tasks(project_id,title) values(project_id,'Temporary verification task') returning id,updated_at into task_id,original_stamp;
 update public.prmg_tasks set status='done' where id=task_id and updated_at=original_stamp returning updated_at into new_stamp;
 if new_stamp = original_stamp then raise exception 'Concurrency timestamp did not advance'; end if;
 update public.prmg_tasks set status='todo' where id=task_id and updated_at=original_stamp;
 get diagnostics changed = row_count;
 if changed <> 0 then raise exception 'Stale write not blocked'; end if;
 insert into public.prmg_documents(project_id,title,content) values(project_id,'Temporary page','# Test');
 insert into public.prmg_milestones(project_id,title,due_date) values(project_id,'Temporary milestone',current_date);
 insert into public.prmg_comments(task_id,content) values(task_id,'Temporary comment');
 if not exists(select 1 from public.prmg_activity where entity_id=task_id) then raise exception 'Activity trigger failed'; end if;
 begin
  insert into public.prmg_tasks(project_id,title,start_date,due_date) values(project_id,'Bad dates',current_date,current_date-1);
  raise exception 'Invalid date range accepted';
 exception when check_violation then null;
 end;
 delete from public.prmg_projects where id=project_id;
 if exists(select 1 from public.prmg_tasks where id=task_id) then raise exception 'Cascade delete failed'; end if;
end $$;
reset role;
update auth.sessions set created_at=now()-interval '91 days' where id=(current_setting('request.jwt.claims')::jsonb->>'session_id')::uuid;
set local role authenticated;
do $$
begin
 if public.prmg_session_valid() then raise exception 'Expired session accepted'; end if;
 if exists(select 1 from public.prmg_activity) then raise exception 'Expired session can read'; end if;
 begin
  insert into public.prmg_projects(name) values('Must fail');
  raise exception 'Expired session can write';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'session_id',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.prmg_session_valid() then raise exception 'Non-owner accepted'; end if;
 if exists(select 1 from public.prmg_activity) then raise exception 'Non-owner can read'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform 1 from public.prmg_projects;
  raise exception 'Anonymous table access permitted';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'PASS: owner CRUD, activity, stale writes, dates, cascade, 90-day expiry, non-owner and anonymous access' as verification;
rollback;
