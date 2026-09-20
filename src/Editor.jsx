import { useEffect, useRef, useState } from 'react'
import { X, Trash2, Plus, Check, Send, Eye, Pencil, BookOpen } from 'lucide-react'
import Markdown from 'react-markdown'
import { COLORS, TASK_STATUSES, PROJECT_STATUSES, PRIORITIES, today, formatDate } from './utils'

export function Modal({ title, children, onClose, wide = false }) {
  const dialog = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const node = dialog.current
    const previous = document.activeElement
    node.showModal()
    const cancel = event => { event.preventDefault(); onCloseRef.current() }
    node.addEventListener('cancel', cancel)
    return () => { node.removeEventListener('cancel', cancel); node.close(); previous?.focus() }
  }, [])
  return <dialog ref={dialog} className={`modal ${wide ? 'wide' : ''}`} aria-label={title}>
    <div className="modal-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>
    {children}
  </dialog>
}

function Field({ label, children, className = '' }) { return <label className={`field ${className}`}><span>{label}</span>{children}</label> }
function SelectOptions({ values }) { return Object.entries(values).map(([key, value]) => <option key={key} value={key}>{value}</option>) }

export function Editor({ editor, data, onSave, onDelete, onClose, onComment, onDeleteComment }) {
  const { type, item } = editor
  const singular = { projects: 'project', tasks: 'task', documents: 'page', milestones: 'milestone' }[type]
  const [values, setValues] = useState(() => ({
    name: '', title: '', description: '', content: '', project_id: editor.projectId || data.projects.find(p => p.status !== 'archived')?.id || '',
    status: type === 'projects' ? 'active' : 'todo', color: COLORS[0], priority: 'medium',
    assignee: '', start_date: '', due_date: type === 'milestones' ? today() : '', labels: [], checklist: [],
    category: 'Notes', pinned: false, completed: false, ...editor.defaults, ...item,
    ...(type === 'documents' && !item && !editor.projectId ? { project_id: '' } : {}),
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(Boolean(item && type === 'documents'))
  const [subtask, setSubtask] = useState('')
  const [comment, setComment] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const update = (key, value) => setValues(v => ({ ...v, [key]: value }))
  const dirty = useRef(false)
  function close() {
    if (busy || commentBusy) return
    if (dirty.current && !window.confirm('Discard your unsaved changes?')) return
    onClose()
  }
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true)
    const fields = {
      projects: ['name','description','status','color','start_date','due_date'],
      tasks: ['project_id','title','description','status','priority','assignee','start_date','due_date','labels','checklist'],
      documents: ['project_id','title','content','category','pinned'],
      milestones: ['project_id','title','description','due_date','completed'],
    }[type]
    const payload = Object.fromEntries(fields.map(key => [key, ['project_id','start_date','due_date'].includes(key) ? values[key] || null : typeof values[key] === 'string' ? values[key].trim() : values[key]]))
    if (payload.start_date && payload.due_date && payload.due_date < payload.start_date) { setError('The due date must be on or after the start date.'); setBusy(false); return }
    try { await onSave(type, payload, item); dirty.current = false; onClose() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function deleteItem() {
    setBusy(true); setError('')
    try { await onDelete(type, item); onClose() } catch (err) { setError(err.message); setConfirmDelete(false) } finally { setBusy(false) }
  }
  const title = item ? `${type === 'documents' && preview ? 'Knowledge base' : 'Edit ' + singular}` : `New ${singular}`
  return <Modal title={title} onClose={close} wide={type === 'documents' || type === 'tasks'}>
    <form onSubmit={submit} onChange={() => { dirty.current = true }}>
      <fieldset disabled={busy} className="editor-body">
        {type === 'documents' && <div className="segmented editor-tabs"><button type="button" className={!preview ? 'selected' : ''} onClick={() => setPreview(false)}><Pencil size={15}/> Write</button><button type="button" className={preview ? 'selected' : ''} onClick={() => setPreview(true)}><Eye size={15}/> Preview</button></div>}
        {type === 'documents' && preview ? <article className="markdown document-preview"><div className="eyebrow"><BookOpen size={14}/> {values.category}</div><h1>{values.title || 'Untitled page'}</h1><Markdown>{values.content || '*No content yet. Switch to Write to start your page.*'}</Markdown></article> : <>
          <Field label={type === 'projects' ? 'Project name' : 'Title'}><input autoFocus required maxLength={type === 'projects' ? 160 : 240} value={type === 'projects' ? values.name : values.title} placeholder={type === 'projects' ? 'What are you working on?' : `Give this ${singular} a name`} onChange={e => update(type === 'projects' ? 'name' : 'title', e.target.value)}/></Field>
          {type !== 'projects' && <Field label="Project"><select required={type !== 'documents'} value={values.project_id || ''} onChange={e => update('project_id', e.target.value)}>{type === 'documents' && <option value="">Workspace · all projects</option>}{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.status === 'archived' ? ' (archived)' : ''}</option>)}</select></Field>}
          <Field label={type === 'documents' ? 'Content · Markdown supported' : 'Description'}><textarea rows={type === 'documents' ? 14 : 3} maxLength={type === 'documents' ? 200000 : type === 'tasks' ? 50000 : 20000} value={type === 'documents' ? values.content : values.description} placeholder={type === 'documents' ? '# Start with an idea\n\nAdd notes, decisions, links, and everything worth remembering.' : 'Add context, goals, or useful details…'} onChange={e => update(type === 'documents' ? 'content' : 'description', e.target.value)}/></Field>
          {['projects','tasks'].includes(type) && <div className="form-grid"><Field label="Status"><select value={values.status} onChange={e => update('status', e.target.value)}><SelectOptions values={type === 'projects' ? PROJECT_STATUSES : TASK_STATUSES}/></select></Field>{type === 'tasks' ? <Field label="Priority"><select value={values.priority} onChange={e => update('priority', e.target.value)}><SelectOptions values={PRIORITIES}/></select></Field> : <Field label="Project color"><div className="color-picker">{COLORS.map(color => <button key={color} type="button" aria-label={`Color ${color}`} aria-pressed={values.color === color} style={{ background: color }} onClick={() => { dirty.current = true; update('color', color) }}>{values.color === color && <Check size={16}/>}</button>)}</div></Field>}</div>}
          {type !== 'documents' && <div className="form-grid">{type !== 'milestones' && <Field label="Start date"><input type="date" value={values.start_date || ''} onChange={e => update('start_date', e.target.value)}/></Field>}<Field label="Due date"><input type="date" required={type === 'milestones'} min={values.start_date || undefined} value={values.due_date || ''} onChange={e => update('due_date', e.target.value)}/></Field></div>}
          {type === 'milestones' && <label className="checkbox-line"><input type="checkbox" checked={values.completed} onChange={e => update('completed', e.target.checked)}/> Milestone completed</label>}
          {type === 'documents' && <div className="form-grid"><Field label="Category"><input required maxLength={80} list="categories" value={values.category} onChange={e => update('category', e.target.value)}/><datalist id="categories">{['Notes','Plan','Research','Decision','Reference','Meeting'].map(c => <option key={c}>{c}</option>)}</datalist></Field><label className="checkbox-line"><input type="checkbox" checked={values.pinned} onChange={e => update('pinned', e.target.checked)}/> Pin this page</label></div>}
          {type === 'tasks' && <><div className="form-grid"><Field label="Assignee"><input maxLength={160} placeholder="Name (optional)" value={values.assignee} onChange={e => update('assignee', e.target.value)}/></Field><Field label="Labels · comma separated"><input placeholder="Design, planning…" value={values.labels.join(',')} onChange={e => update('labels', e.target.value.split(',').slice(0,20))}/></Field></div>
            <div className="subtask-heading"><h3>Subtasks</h3><span>{values.checklist.filter(t => t.done).length}/{values.checklist.length}</span></div>
            <div className="checklist">{values.checklist.map((task, index) => <div key={task.id} className="checklist-item"><input type="checkbox" aria-label={`Complete ${task.text}`} checked={task.done} onChange={e => update('checklist', values.checklist.map((t, i) => i === index ? { ...t, done: e.target.checked } : t))}/><span className={task.done ? 'struck' : ''}>{task.text}</span><button type="button" className="icon-button" aria-label={`Remove ${task.text}`} onClick={() => { dirty.current = true; update('checklist', values.checklist.filter((_, i) => i !== index)) }}><X size={15}/></button></div>)}</div>
            <div className="inline-input"><input aria-label="New subtask" placeholder="Add a subtask…" maxLength={240} value={subtask} onChange={e => setSubtask(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); if(subtask.trim() && values.checklist.length < 100) { update('checklist', [...values.checklist,{ id: crypto.randomUUID(), text: subtask.trim(), done: false }]); setSubtask(''); dirty.current = true } } }}/><button type="button" className="button subtle" disabled={!subtask.trim() || values.checklist.length >= 100} onClick={() => { update('checklist', [...values.checklist,{ id: crypto.randomUUID(), text: subtask.trim(), done: false }]); setSubtask(''); dirty.current = true }}><Plus size={16}/> Add</button></div>
          </>}
        </>}
        {error && <div className="form-error" role="alert">{error}</div>}
      </fieldset>
      <div className="modal-footer">{item && <button type="button" className="button danger-text" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 size={16}/> Delete</button>}<div className="footer-actions"><button type="button" className="button secondary" disabled={busy} onClick={close}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : item ? 'Save changes' : `Create ${singular}`}</button></div></div>
    </form>
    {type === 'tasks' && item && <section className="comments"><h3>Updates & comments</h3>{data.comments.filter(c => c.task_id === item.id).sort((a,b) => a.created_at.localeCompare(b.created_at)).map(c => <div className="comment" key={c.id}><div className="comment-meta"><strong>You</strong><span>{formatDate(c.created_at)} · {new Date(c.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span><button className="icon-button" disabled={commentBusy} aria-label="Delete comment" onClick={async () => { if (!window.confirm('Delete this comment?')) return; setCommentBusy(true); try { await onDeleteComment(c) } catch(e) { setError(e.message) } finally { setCommentBusy(false) } }}><Trash2 size={14}/></button></div><p>{c.content}</p></div>)}<form className="inline-input" onSubmit={async e => { e.preventDefault(); if(!comment.trim()) return; setCommentBusy(true); setError(''); try { await onComment(item.id, comment.trim()); setComment('') } catch(err) { setError(err.message) } finally { setCommentBusy(false) } }}><input aria-label="New comment" required maxLength={10000} placeholder="Add an update or a note…" value={comment} onChange={e => setComment(e.target.value)}/><button className="button secondary" disabled={commentBusy || !comment.trim()} aria-label="Post comment"><Send size={17}/></button></form></section>}
    {confirmDelete && <div className="delete-confirm" role="alert"><strong>Delete this {singular}?</strong><p>{type === 'projects' ? 'This permanently deletes the project and all its tasks, pages, comments, and milestones. Archive it instead to keep its history.' : 'This action cannot be undone.'}</p><button className="button secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep it</button><button className="button danger" disabled={busy} onClick={deleteItem}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div>}
  </Modal>
}
