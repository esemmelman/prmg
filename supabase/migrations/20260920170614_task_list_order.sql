alter table public.prmg_tasks add column sort_order bigint;
create function public.prmg_reorder_task(p_task_id uuid, p_target_id uuid, p_after boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare ordered_ids uuid[]; insert_at integer;
begin
  if not public.prmg_session_valid() then raise exception 'Your session has expired. Sign in again.' using errcode='42501'; end if;
  if p_task_id = p_target_id then return; end if;
  -- Serialize moves, preserving normal row permissions and unrelated task fields.
  perform id from public.prmg_tasks order by id for update;
  select array_agg(id order by sort_order nulls first, created_at desc, id) into ordered_ids from public.prmg_tasks;
  if not (p_task_id = any(ordered_ids)) or not (p_target_id = any(ordered_ids)) or ordered_ids is null then
    raise exception 'A task was removed or is no longer accessible. Reload and try again.';
  end if;
  ordered_ids := array_remove(ordered_ids, p_task_id);
  insert_at := array_position(ordered_ids, p_target_id) + case when p_after then 1 else 0 end;
  ordered_ids := coalesce(ordered_ids[1:insert_at-1], '{}'::uuid[]) || array[p_task_id] || coalesce(ordered_ids[insert_at:cardinality(ordered_ids)], '{}'::uuid[]);
  update public.prmg_tasks t set sort_order = positions.ordinality
  from unnest(ordered_ids) with ordinality as positions(id, ordinality)
  where t.id = positions.id and t.sort_order is distinct from positions.ordinality;
end;
$$;
revoke all on function public.prmg_reorder_task(uuid, uuid, boolean) from public, anon;
grant execute on function public.prmg_reorder_task(uuid, uuid, boolean) to authenticated;
