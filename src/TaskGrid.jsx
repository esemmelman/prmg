import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { TASK_STATUSES, PRIORITIES } from './utils'

function Cell({ task, field, label, type = 'text', options, onSave, disabled }) {
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const saving = useRef(false)
  const value = draft ?? task[field] ?? ''
  async function commit(next) {
    if(saving.current || next === (task[field] ?? '')) return
    if(field === 'title' && !next.trim()) { setError('A task needs a title.'); return }
    const start = field === 'start_date' ? next : task.start_date
    const end = field === 'due_date' ? next : task.due_date
    if(start && end && end < start) { setError('End date must be on or after start date.'); return }
    saving.current = true; setError('')
    try { await onSave('tasks', {[field]: type === 'date' ? next || null : next.trim()}, task, true); setDraft(null) }
    catch(err) { setError(err.message || 'Could not save this cell.') }
    finally { saving.current = false }
  }
  const props = {
    'aria-label': `${label} for ${task.title}`, 'aria-invalid': !!error,
    value, disabled,
    onKeyDown: event => {
      if(event.key === 'Escape') { setDraft(null); setError(''); event.stopPropagation() }
      if(event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void commit(value) }
    },
  }
  return <td className={error ? 'grid-cell-error' : ''}>
    {options ? <select {...props} onChange={event => { setDraft(event.target.value); void commit(event.target.value) }}>{Object.entries(options).map(([key,text]) => <option key={key} value={key}>{text}</option>)}</select>
      : <input {...props} type={type} maxLength={field === 'title' ? 240 : 120} onChange={event => { setDraft(event.target.value); setError('') }} onBlur={() => void commit(value)}/>}
    {error && <span className="grid-cell-message" role="alert">{error}</span>}
  </td>
}

export function TaskGrid({ tasks, data, projectId, onSave, onEdit }) {
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  async function save(...args) {
    if(pending.current) throw new Error('Another cell is saving. Please retry.')
    pending.current = true; setBusy(true)
    try { return await onSave(...args) }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="task-grid-scroll" role="region" aria-label="Task spreadsheet" tabIndex={0}>
    <table className="task-grid" aria-label="Tasks" aria-busy={busy}>
      <thead><tr><th scope="col">#</th><th scope="col">Task</th>{!projectId && <th scope="col">Project</th>}<th scope="col">Status</th><th scope="col">Start date</th><th scope="col">End date</th><th scope="col">Priority</th><th scope="col">Assignee</th><th scope="col">Details</th></tr></thead>
      <tbody>{tasks.map((task,index) => <tr key={task.id}>
        <th scope="row">{index + 1}</th>
        <Cell task={task} field="title" label="Title" onSave={save} disabled={busy}/>
        {!projectId && <td className="grid-project">{data.projects.find(project => project.id === task.project_id)?.name}</td>}
        <Cell task={task} field="status" label="Status" options={TASK_STATUSES} onSave={save} disabled={busy}/>
        <Cell task={task} field="start_date" label="Start date" type="date" onSave={save} disabled={busy}/>
        <Cell task={task} field="due_date" label="End date" type="date" onSave={save} disabled={busy}/>
        <Cell task={task} field="priority" label="Priority" options={PRIORITIES} onSave={save} disabled={busy}/>
        <Cell task={task} field="assignee" label="Assignee" onSave={save} disabled={busy}/>
        <td><button className="icon-button" aria-label={`Open details for ${task.title}`} onClick={() => onEdit('tasks',task)}><ArrowUpRight size={15}/></button></td>
      </tr>)}</tbody>
    </table>
    {!tasks.length && <p className="grid-empty">No tasks match this view. Add a task below.</p>}
  </div>
}
