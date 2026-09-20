import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from './config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storageKey: 'prmg-auth-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
export const tables = ['projects', 'tasks', 'documents', 'comments', 'activity']
export const emptyData = Object.fromEntries(tables.map(t => [t, []]))

export async function loadWorkspace() {
  const entries = await Promise.all(tables.map(async table => {
    let rows = [], offset = 0
    let hasMore = true
    while (hasMore) {
      const { data, error } = await supabase.from(`prmg_${table}`).select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 999)
      if (error) throw error
      rows = rows.concat(data)
      hasMore = data.length === 1000
      offset += 1000
    }
    return [table, table === 'activity' ? rows.filter(row => tables.includes(row.entity_type)) : rows]
  }))
  return Object.fromEntries(entries)
}

export async function saveRecord(table, values, original) {
  let query
  if (original?.id) {
    query = supabase.from(`prmg_${table}`).update(values).eq('id', original.id).eq('updated_at', original.updated_at)
  } else query = supabase.from(`prmg_${table}`).insert(values)
  const { data, error } = await query.select().single()
  if (error?.code === 'PGRST116') throw new Error('This item changed on another device. Close this editor, refresh, and try again.')
  if (error) throw error
  return data
}

export async function removeRecord(table, original) {
  let query = supabase.from(`prmg_${table}`).delete().eq('id', original.id)
  if (original.updated_at) query = query.eq('updated_at', original.updated_at)
  const { data, error } = await query.select('id').single()
  if (error?.code === 'PGRST116') throw new Error('This item changed on another device. Refresh before deleting it.')
  if (error) throw error
  return data
}

export async function reorderTask(taskId, targetId, after) {
  const {error} = await supabase.rpc('prmg_reorder_task', {p_task_id:taskId, p_target_id:targetId, p_after:after})
  if(error) throw error
}
