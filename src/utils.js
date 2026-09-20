export const TASK_STATUSES = { todo: 'To do', in_progress: 'In progress', review: 'In review', done: 'Done' }
export const PROJECT_STATUSES = { planning: 'Planning', active: 'Active', on_hold: 'On hold', completed: 'Completed', archived: 'Archived' }
export const PRIORITIES = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }
export const COLORS = ['#49755f', '#6883b3', '#ab775b', '#9474af', '#b49345', '#659ca1']
export function today() { return localDate(new Date()) }
export function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function dateValue(value) { return new Date(`${value}T12:00:00`) }
export function formatDate(value, year = false) { return value ? dateValue(value.slice(0, 10)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) }) : 'No date' }
export function addDays(value, days) { const date = dateValue(value); date.setDate(date.getDate() + days); return localDate(date) }
export function dayDiff(start, end) { return Math.round((dateValue(end) - dateValue(start)) / 86400000) }
export function overdue(task) { return task.status !== 'done' && task.due_date && task.due_date < today() }
export function progress(tasks) { return tasks.length ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0 }
export function matches(item, search) { return !search || [item.name, item.title, item.description, item.content, item.assignee, ...(item.labels || [])].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()) }
export function downloadJson(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, exported_at: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `prmg-backup-${today()}.json`; link.click(); URL.revokeObjectURL(url)
}
