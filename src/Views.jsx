import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Plus, MoreHorizontal, CalendarDays, Check, Circle, BookOpen, Pin, ChevronLeft, ChevronRight, ChevronDown, CheckCheck, FolderOpen, MessageSquare, LayoutGrid, List, Search, GripVertical } from 'lucide-react'
import { TASK_STATUSES, PROJECT_STATUSES, PRIORITIES, today, addDays, dayDiff, dateValue, formatDate, progress, overdue, matches } from './utils'

export function Empty({ icon: Icon = FolderOpen, title, text, action, label }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={27}/></div><h3>{title}</h3><p>{text}</p>{action && <button className="button primary" onClick={action}><Plus size={16}/>{label}</button>}</div>
}
export function Badge({ value, labels }) { return <span className={`badge ${value}`}>{labels?.[value] || value}</span> }
function ProjectName({ id, projects }) { const project = projects.find(p => p.id === id); return <span className="project-name"><i style={{ background: project?.color || '#829086' }}/>{project?.name || 'Workspace'}</span> }

export function ProjectCard({ project, data, onSelect, onEdit }) {
  const tasks = data.tasks.filter(t => t.project_id === project.id), percent = progress(tasks)
  const late = tasks.filter(overdue).length
  return <article className="project-card" style={{ '--project-color': project.color }}>
    <div className="project-card-top"><span className="project-symbol"><FolderOpen size={21}/></span><Badge value={project.status} labels={PROJECT_STATUSES}/><button className="icon-button" aria-label={`Edit ${project.name}`} onClick={() => onEdit('projects', project)}><MoreHorizontal size={20}/></button></div>
    <button className="card-title" onClick={() => onSelect(project.id)}>{project.name}<ArrowUpRight size={19}/></button>
    <p className="project-description">{project.description || 'A little space for your next big thing.'}</p>
    <div className="progress-label"><span>{tasks.filter(t => t.status === 'done').length} of {tasks.length} tasks done</span><strong>{percent}%</strong></div><div className="progress-track"><span style={{ width: `${percent}%` }}/></div>
    <div className="project-card-footer"><span><CalendarDays size={14}/>{project.due_date ? formatDate(project.due_date) : 'No deadline'}</span>{late ? <span className="late">{late} overdue</span> : <span>{data.documents.filter(d => d.project_id === project.id).length} pages</span>}</div>
  </article>
}

export function Projects({ data, search, onEdit, onSelect }) {
  const [status, setStatus] = useState('current')
  const projects = data.projects.filter(p => matches(p,search) && (status === 'all' || status === 'current' ? status === 'all' || p.status !== 'archived' : p.status === status))
  return <><div className="view-toolbar"><div className="filter-tabs">{[['current','Current'],['active','Active'],['completed','Completed'],['archived','Archived'],['all','All']].map(([key,label]) => <button key={key} className={status === key ? 'selected' : ''} onClick={() => setStatus(key)}>{label}</button>)}</div></div>{projects.length ? <div className="project-grid">{projects.map(p => <ProjectCard key={p.id} project={p} data={data} onSelect={onSelect} onEdit={onEdit}/>)}</div> : <Empty title="A clean slate" text="No projects match this view. Use the + in the sidebar to create a project, or change your filters."/>}</>
}

function TaskCard({ task, data, onEdit, onToggle, compact = false }) {
  return <article className={`task-card ${compact ? 'task-row' : ''}`} draggable={compact ? undefined : true} onDragStart={e => { if(compact) return; e.dataTransfer.setData('text/plain',task.id); e.dataTransfer.effectAllowed = 'move' }}>
    <div className="task-main"><button className={`complete-button ${task.status === 'done' ? 'checked' : ''}`} aria-label={`${task.status === 'done' ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => onToggle(task)}>{task.status === 'done' && <Check size={13}/>}</button><button className={`task-title ${task.status === 'done' ? 'struck' : ''}`} onClick={() => onEdit('tasks',task)}>{task.title}</button></div>
    {!compact && task.description && <p className="task-description">{task.description}</p>}
    <div className="task-meta">{compact && <Badge value={task.status} labels={TASK_STATUSES}/>}{task.due_date && <span className={`task-date ${overdue(task) ? 'late' : ''}`}><CalendarDays size={12}/>{formatDate(task.due_date)}</span>}</div>
    {(task.labels.length > 0 || task.assignee || task.checklist.length > 0 || data.comments.some(c => c.task_id === task.id)) && <div className="task-extras">{task.labels.filter(Boolean).slice(0,3).map((label,i) => <span className="label" key={i}>{label.trim()}</span>)}{task.checklist.length > 0 && <span><CheckCheck size={13}/>{task.checklist.filter(t => t.done).length}/{task.checklist.length}</span>}{data.comments.some(c => c.task_id === task.id) && <span><MessageSquare size={13}/>{data.comments.filter(c => c.task_id === task.id).length}</span>}{task.assignee && <span className="assignee" title={task.assignee}>{task.assignee}</span>}</div>}
  </article>
}

function InlineTask({ projects, projectId, status, onCreate, onEdit, taskFocusRequest, focusOnOpen = false }) {
  const [title, setTitle] = useState('')
  const titleRef = useRef(null)
  const restoreFocus = useRef(false)
  const [startDate, setStartDate] = useState(today)
  const [dueDate, setDueDate] = useState(today)
  const [taskStatus, setTaskStatus] = useState(status)
  const [selectedProject, setSelectedProject] = useState(projectId || (projects.length === 1 ? projects[0].id : ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if(focusOnOpen) titleRef.current?.focus() }, [focusOnOpen, taskFocusRequest])
  useEffect(() => { if(!busy && restoreFocus.current) { restoreFocus.current = false; titleRef.current?.focus() } }, [busy])
  async function submit(event) {
    event.preventDefault()
    if (busy || !title.trim() || !selectedProject) return
    setBusy(true); setError('')
    try {
      await onCreate('tasks', { title: title.trim(), project_id: selectedProject, status: taskStatus, priority: 'medium', description: '', assignee: '', start_date: startDate || null, due_date: dueDate || null, labels: [], checklist: [] })
      setTitle(''); setStartDate(today()); setDueDate(today()); setTaskStatus(status); restoreFocus.current = true
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <form className="inline-task" onSubmit={submit}>
    <fieldset disabled={busy}>
      <div className="inline-task-entry"><input ref={titleRef} aria-label="Title" required maxLength={240} value={title} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if(event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit() } }}/><label className="inline-task-date"><span>Start date</span><input type="date" value={startDate} max={dueDate || undefined} onChange={event => setStartDate(event.target.value)}/></label><label className="inline-task-date"><span>End date</span><input type="date" value={dueDate} min={startDate || undefined} onChange={event => setDueDate(event.target.value)}/></label><select aria-label="Status" value={taskStatus} onChange={event => setTaskStatus(event.target.value)}>{Object.entries(TASK_STATUSES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><button type="button" className="icon-button" aria-label="Open full task form" title="Open full task form" onClick={() => { onEdit('tasks', null, { title, status: taskStatus, start_date: startDate, due_date: dueDate, project_id: selectedProject }) }}><ArrowUpRight size={18}/></button></div>
      {!projectId && <label className="field"><span>Project</span><select required value={selectedProject} onChange={event => setSelectedProject(event.target.value)}><option value="">Choose a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {busy && <span className="muted" role="status">Saving...</span>}
    </fieldset>
  </form>
}

function TaskList({tasks, data, onEdit, onToggle, onReorder, manual}) {
  const moving = useRef(null)
  const [pointerActive, setPointerActive] = useState(false)
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  function destination(event) {
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-list-task]')
    if(!row || row.dataset.listTask === moving.current?.id) return null
    const rect = row.getBoundingClientRect()
    return {id:row.dataset.listTask, after:event.clientY > rect.top + rect.height / 2}
  }
  async function saveMove(from, to) {
    if(!from || !to || busy) return
    setBusy(true); setError(''); setTarget(null); moving.current = null
    try { await onReorder(from, to.id, to.after) }
    catch(err) { setError(`Could not save task order: ${err.message}`) }
    finally { setBusy(false) }
  }
  function pointerMove(event) {
    const current = moving.current
    if(!current?.pointer) return
    if(!current.moved && Math.hypot(event.clientX-current.x,event.clientY-current.y)<5) return
    current.moved = true; event.preventDefault()
    current.target = destination(event); setTarget(current.target)
    if(event.clientY > window.innerHeight-50) window.scrollBy(0,16)
    else if(event.clientY<50) window.scrollBy(0,-16)
  }
  function pointerEnd(event, cancel = false) {
    const current = moving.current
    moving.current = null; setTarget(null); setPointerActive(false)
    if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if(!cancel && current?.moved && current.target) void saveMove(current.id,current.target)
  }
  return <>{error && <p className="error-banner" role="alert">{error}</p>}{busy && <p role="status">Saving task order...</p>}<div className="task-list" aria-busy={busy}>
    {tasks.map((task,index) => <div key={task.id} data-list-task={task.id} className={`list-order-row ${target?.id === task.id ? target.after ? 'drop-after' : 'drop-before' : ''}`} draggable={manual && !busy && !pointerActive}
      onDragStart={event => { if(event.defaultPrevented || !manual || busy) { event.preventDefault(); return } moving.current={id:task.id}; event.dataTransfer.effectAllowed='move'; event.dataTransfer.setData('text/plain',task.id) }}
      onDragOver={event => { if(!moving.current || moving.current.pointer) return; event.preventDefault(); event.dataTransfer.dropEffect='move'; setTarget(destination(event)) }}
      onDrop={event => { event.preventDefault(); const to=destination(event); if(moving.current) void saveMove(moving.current.id,to) }}
      onDragEnd={() => {moving.current=null;setTarget(null)}}>
      <button className="icon-button task-drag-handle" aria-label={`Reorder ${task.title}`} title={manual ? 'Drag to reorder; Alt + Up/Down also moves this task' : 'Choose Manual order to rearrange tasks'} disabled={!manual || busy} draggable={false}
        onDragStart={event => event.preventDefault()}
        onPointerDown={event => { if(!event.isPrimary || event.button!==0 || busy || !manual) return; event.preventDefault(); event.currentTarget.focus(); setPointerActive(true); moving.current={id:task.id,pointer:true,x:event.clientX,y:event.clientY,moved:false}; event.currentTarget.setPointerCapture(event.pointerId) }}
        onPointerMove={pointerMove} onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event,true)}
        onKeyDown={event => { if(event.key==='Escape') {moving.current=null;setTarget(null);setPointerActive(false)} else if(event.altKey && ['ArrowUp','ArrowDown'].includes(event.key)) {event.preventDefault();const adjacent=tasks[index+(event.key==='ArrowUp'?-1:1)];if(adjacent) void saveMove(task.id,{id:adjacent.id,after:event.key==='ArrowDown'})} }}><GripVertical size={19}/></button>
      <TaskCard task={task} data={data} onEdit={onEdit} onToggle={onToggle} compact/>
    </div>)}
  </div></>
}

export function Tasks({ data, projectId, taskFocusRequest, search, onEdit, onSave, onCreate, onReorder, includeArchived = false, initialFilter = 'all' }) {
  const [layout, setLayout] = useState('list')
  const [priority, setPriority] = useState('all')
  const [dueFilter, setDueFilter] = useState(initialFilter)
  const [projectFilter, setProjectFilter] = useState('all')
  const [sort, setSort] = useState('manual')
  const [dragOver, setDragOver] = useState('')
  const archived = new Set(data.projects.filter(p => p.status === 'archived').map(p => p.id))
  const tasks = data.tasks.filter(t => (!projectId ? (includeArchived || !archived.has(t.project_id)) : t.project_id === projectId) && (projectFilter === 'all' || t.project_id === projectFilter) && matches(t,search) && (priority === 'all' || priority === t.priority) && (dueFilter === 'all' || dueFilter === 'overdue' && overdue(t) || dueFilter === 'week' && t.status !== 'done' && t.due_date >= today() && t.due_date <= addDays(today(),7) || dueFilter === 'undated' && !t.due_date)).sort((a,b) => sort === 'manual' ? (a.sort_order == null && b.sort_order == null ? b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id) : a.sort_order == null ? -1 : b.sort_order == null ? 1 : a.sort_order - b.sort_order) : sort === 'due' ? (a.due_date || '9999').localeCompare(b.due_date || '9999') : sort === 'priority' ? ['urgent','high','medium','low'].indexOf(a.priority) - ['urgent','high','medium','low'].indexOf(b.priority) : b.created_at.localeCompare(a.created_at))
  const toggle = task => onSave('tasks',{status: task.status === 'done' ? 'todo' : 'done'},task)
  return <><div className="view-toolbar task-toolbar"><div className="filters">{!projectId && <select aria-label="Filter project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option value="all">All projects</option>{data.projects.filter(p => includeArchived || p.status !== 'archived').map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select>}<select aria-label="Filter priority" value={priority} onChange={e => setPriority(e.target.value)}><option value="all">All priorities</option>{Object.entries(PRIORITIES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select><select aria-label="Filter due date" value={dueFilter} onChange={e => setDueFilter(e.target.value)}><option value="all">Any date</option><option value="week">Due this week</option><option value="overdue">Overdue</option><option value="undated">No due date</option></select><select aria-label="Sort tasks" value={sort} onChange={e => setSort(e.target.value)}><option value="manual">Manual order</option><option value="newest">Newest first</option><option value="due">Due date</option><option value="priority">Priority</option></select></div><div className="segmented"><button className={layout === 'board' ? 'selected' : ''} onClick={() => setLayout('board')}><LayoutGrid size={15}/> Board</button><button className={layout === 'list' ? 'selected' : ''} onClick={() => setLayout('list')}><List size={15}/> List</button></div></div>
    {!data.projects.length ? <Empty title="Every task needs a home" text="Create a project first, then break your work into tasks." action={() => onEdit('projects')} label="Create a project"/> : layout === 'board' ? <div className="kanban">{Object.entries(TASK_STATUSES).map(([key,label]) => <section key={key} className={`kanban-column ${dragOver === key ? 'drag-over' : ''}`} onDragOver={e => { e.preventDefault(); setDragOver(key) }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver('') }} onDrop={e => { e.preventDefault(); setDragOver(''); const task = data.tasks.find(t => t.id === e.dataTransfer.getData('text/plain')); if(task && task.status !== key) onSave('tasks',{status:key},task) }}><div className="column-heading"><span className={`status-dot ${key}`}/><h3>{label}</h3><span>{tasks.filter(t => t.status === key).length}</span></div><div className="column-tasks">{tasks.filter(t => t.status === key).map(task => <TaskCard key={task.id} task={task} data={data} onEdit={onEdit} onToggle={toggle}/>)}<InlineTask key={`${key}-${projectFilter}`} projects={data.projects.filter(p => includeArchived || p.status !== 'archived' || p.id === projectId)} projectId={projectId || (projectFilter === 'all' ? null : projectFilter)} status={key} taskFocusRequest={taskFocusRequest} focusOnOpen={!!projectId && key === 'todo'} onCreate={onCreate} onEdit={onEdit}/></div></section>)}</div> : <>{tasks.length ? <TaskList tasks={tasks} data={data} onEdit={onEdit} onToggle={toggle} onReorder={onReorder} manual={sort === 'manual'}/> : <Empty icon={Search} title="No tasks in this view" text="Try different filters or add a task."/>}<div className="list-task-entry"><InlineTask key={`list-${projectFilter}`} projects={data.projects.filter(p => includeArchived || p.status !== 'archived' || p.id === projectId)} projectId={projectId || (projectFilter === 'all' ? null : projectFilter)} status="todo" taskFocusRequest={taskFocusRequest} focusOnOpen={!!projectId} onCreate={onCreate} onEdit={onEdit}/></div></>}
  </>
}

export function Knowledge({ data, projectId, search, onEdit }) {
  const [category, setCategory] = useState('All')
  const documents = data.documents.filter(d => (!projectId || d.project_id === projectId) && matches(d,search) && (category === 'All' || d.category === category)).sort((a,b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
  const categories = [...new Set(data.documents.filter(d => !projectId || d.project_id === projectId).map(d => d.category))].sort()
  return <><div className="view-toolbar"><div className="filter-tabs"><button className={category === 'All' ? 'selected' : ''} onClick={() => setCategory('All')}>All pages</button>{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><span className="muted">{documents.length} pages</span></div>{documents.length ? <div className="document-grid">{documents.map(d => <button key={d.id} className="document-card" onClick={() => onEdit('documents',d)}><div className="document-card-top"><span className="document-icon"><BookOpen size={22}/></span><span className="label">{d.category}</span>{d.pinned && <Pin size={15}/>}</div><h3>{d.title}</h3><p>{d.content.replace(/[#*`>[\]]/g,'').slice(0,155) || 'No content yet.'}</p><div className="document-card-bottom"><ProjectName id={d.project_id} projects={data.projects}/><span>{formatDate(d.updated_at)}</span></div></button>)}</div> : <Empty icon={BookOpen} title="Good ideas deserve a place" text="Keep plans, decisions, research, and meeting notes connected to your projects." action={() => onEdit('documents')} label="Create a page"/>}</>
}

export function GanttChart({ data, projectId, search, onEdit, onReorder, onCreate: saveDates, includeArchived = false }) {
  const [start, setStart] = useState(() => addDays(today(), -3))
  const [days, setDays] = useState(30)
  const [collapsed, setCollapsed] = useState(new Set())
  const orderDrag = useRef(null)
  const [orderTarget, setOrderTarget] = useState(null)
  const statusColors = {todo: '#64748b', in_progress: '#2563eb', review: '#b7791f', done: '#15803d'}
  const resize = useRef(null)
  const [resizePreview, setResizePreview] = useState(null)
  const drag = useRef(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [moveError, setMoveError] = useState('')
  const end = addDays(start, days - 1)
  const projects = data.projects.filter(p => projectId ? p.id === projectId : includeArchived || p.status !== 'archived')
  const groups = projects.map(project => {
    const tasks = data.tasks.filter(task => task.project_id === project.id)
    const children = tasks.map(task => ({...task, type: 'tasks'}))
      .filter(item => matches(project, search) || matches(item, search))
      .sort((a,b) => a.sort_order == null && b.sort_order == null ? b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id) : a.sort_order == null ? -1 : b.sort_order == null ? 1 : a.sort_order - b.sort_order)
    const dates = [project.start_date, project.due_date, ...children.flatMap(item => [item.start_date, item.due_date])].filter(Boolean).sort()
    return {project, children, summary: {...project, type: 'projects', title: project.name, start_date: dates[0] || null, due_date: dates.at(-1) || null, completion: progress(tasks)}}
  }).filter(group => matches(group.project, search) || group.children.length)
  const scheduleDates = groups.flatMap(group => [group.summary.start_date, group.summary.due_date]).filter(Boolean).sort()
  function fitSchedule() {
    if (!scheduleDates.length) return
    setStart(addDays(scheduleDates[0], -2))
    setDays(Math.max(14, dayDiff(scheduleDates[0], scheduleDates.at(-1)) + 5))
  }
  function toggleProject(id) {
    setCollapsed(current => { const next = new Set(current); if(next.has(id)) next.delete(id); else next.add(id); return next })
  }
  async function saveOrder(item, target, after) {
    if(saving || item.id === target.id || item.project_id !== target.project_id) return
    setSaving(true); setMoveError(''); setOrderTarget(null); orderDrag.current = null
    try { await onReorder(item.id, target.id, after) }
    catch(error) { setMoveError(`Could not reorder ${item.title}: ${error.message}`) }
    finally { setSaving(false) }
  }
  function orderRowProps(item) {
    return {
      onDragOver: event => {
        const source = orderDrag.current
        if(!source || source.id === item.id || source.project_id !== item.project_id) return
        event.preventDefault(); event.dataTransfer.dropEffect = 'move'
        const rect = event.currentTarget.getBoundingClientRect()
        setOrderTarget({id:item.id, after:event.clientY > rect.top + rect.height / 2})
      },
      onDrop: event => {
        const source = orderDrag.current
        if(!source) return
        event.preventDefault(); event.stopPropagation()
        const rect = event.currentTarget.getBoundingClientRect()
        void saveOrder(source, item, event.clientY > rect.top + rect.height / 2)
      }
    }
  }

  const cellWidth = days <= 30 ? 36 : days <= 90 ? 18 : 8
  const chartWidth = days * cellWidth
  function beginDrag(event, item, fromBar = false) {
    if (saving) { event.preventDefault(); return }
    const first = item.start_date || item.due_date
    const lane = event.currentTarget.closest('.gantt-row').querySelector('.gantt-lane')
    const offset = fromBar && first ? Math.floor((event.clientX - lane.getBoundingClientRect().left) / cellWidth) - dayDiff(start, first) : 0
    drag.current = {item, offset}
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.title)
    setMoveError('')
  }
  function destination(event) {
    const lane = event.target.closest('.gantt-lane')
    if (!lane || !drag.current) return null
    const day = Math.max(0, Math.min(days - 1, Math.floor((event.clientX - lane.getBoundingClientRect().left) / cellWidth)))
    return addDays(start, day - drag.current.offset)
  }
  async function moveTask(item, date) {
    const first = item.start_date || item.due_date
    const shift = first ? dayDiff(first, date) : 0
    if (first && !shift) return
    const values = first ? {start_date: item.start_date ? addDays(item.start_date, shift) : null, due_date: item.due_date ? addDays(item.due_date, shift) : null} : {start_date: date, due_date: date}
    setSaving(true); setMoveError('')
    try { await saveDates('tasks', values, item) }
    catch (error) { setMoveError(`Could not move ${item.title}: ${error.message}`) }
    finally { setSaving(false) }
  }
  function dropTask(event) {
    const date = destination(event)
    if (!date || !drag.current) return
    event.preventDefault()
    const {item} = drag.current
    drag.current = null; setPreview(null)
    void moveTask(item, date)
  }
  function dragOver(event) {
    const date = destination(event)
    if (!date) return
    event.preventDefault(); event.dataTransfer.dropEffect = 'move'
    setPreview({id: drag.current.item.id, title: drag.current.item.title, date})
  }
  function keyboardMove(event, item) {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key) || saving) return
    event.preventDefault()
    void moveTask(item, addDays(item.start_date || item.due_date || today(), event.key === 'ArrowRight' ? 1 : -1))
  }
  function dragProps(item, fromBar = false) {
    return {draggable: !saving, onDragStart: event => beginDrag(event, item, fromBar), onDragEnd: () => { drag.current = null; setPreview(null) }, onKeyDown: event => keyboardMove(event, item), 'aria-describedby': 'gantt-drag-help'}
  }

  async function resizeTask(item, edge, date) {
    const first = item.start_date || item.due_date
    const last = item.due_date || item.start_date
    const next = edge === 'start_date' ? (date > last ? last : date) : (date < first ? first : date)
    if(next === item[edge] || saving) return
    setSaving(true); setMoveError('')
    try { await saveDates('tasks', {[edge]: next}, item) }
    catch(error) { setMoveError(`Could not resize ${item.title}: ${error.message}`) }
    finally { setSaving(false) }
  }
  function resizeProps(item, edge) {
    return {
      disabled: saving,
      onClick: event => event.stopPropagation(),
      onPointerDown: event => {
        if(saving || event.button !== 0 || !event.isPrimary) return
        event.preventDefault(); event.stopPropagation()
        event.currentTarget.focus()
        const date = item[edge] || item.start_date || item.due_date
        resize.current = {item, edge, date, origin: date, x: event.clientX}
        event.currentTarget.setPointerCapture(event.pointerId)
        setMoveError('')
      },
      onPointerMove: event => {
        const current = resize.current
        if(!current) return
        const date = addDays(current.origin, Math.round((event.clientX - current.x) / cellWidth))
        const first = item.start_date || item.due_date, last = item.due_date || item.start_date
        current.date = edge === 'start_date' ? (date > last ? last : date) : (date < first ? first : date)
        setResizePreview({id: item.id, [edge]: current.date})
      },
      onPointerUp: event => {
        const current = resize.current
        resize.current = null; setResizePreview(null)
        if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        if(current && current.date !== current.origin) void resizeTask(current.item, current.edge, current.date)
      },
      onPointerCancel: () => { resize.current = null; setResizePreview(null) },
      onLostPointerCapture: () => { resize.current = null; setResizePreview(null) },
      onKeyDown: event => {
        if(event.key === 'Escape') { resize.current = null; setResizePreview(null); return }
        if(!['ArrowLeft','ArrowRight'].includes(event.key) || saving) return
        event.preventDefault()
        void resizeTask(item, edge, addDays(item[edge] || item.start_date || item.due_date, event.key === 'ArrowRight' ? 1 : -1))
      }
    }
  }

  const monthBands = []
  for (let index = 0; index < days; index++) {
    const date = addDays(start, index)
    const month = date.slice(0, 7)
    const last = monthBands.at(-1)
    if(last?.month === month) last.count++
    else monthBands.push({month, date, count: 1})
  }
  function row(item, project, summary = false) {
    const displayed = resizePreview?.id === item.id ? {...item, ...resizePreview} : item
    const first = displayed.start_date || displayed.due_date
    const last = displayed.due_date || displayed.start_date
    const scheduled = Boolean(first && last)
    const visible = scheduled && last >= start && first <= end
    const left = visible ? Math.max(0, dayDiff(start, first)) * cellWidth : 0
    const width = visible ? (dayDiff(first < start ? start : first, last > end ? end : last) + 1) * cellWidth : 0
    const bubbleLeft = Math.max(8, Math.min(left, chartWidth - 288))
    const completion = summary ? item.completion : item.status === 'done' ? 100 : item.checklist?.length ? Math.round(item.checklist.filter(t => t.done).length / item.checklist.length * 100) : 0
    const record = summary ? project : item
    const startsIn = displayed.start_date ? dayDiff(today(), displayed.start_date) : null
    const startDistance = startsIn === null ? 'No start date' : startsIn === 0 ? 'Starts today' : startsIn > 0 ? `Starts in ${startsIn} ${startsIn === 1 ? 'day' : 'days'}` : `Started ${-startsIn} ${startsIn === -1 ? 'day' : 'days'} ago`
    const duration = displayed.start_date && displayed.due_date ? dayDiff(displayed.start_date, displayed.due_date) + 1 : null
    const barColor = summary ? project.color || '#49755f' : statusColors[item.status] || statusColors.todo
    const dates = scheduled ? `${formatDate(first, true)} - ${formatDate(last, true)}` : 'Unscheduled'
    return <div className={`gantt-row ${summary ? 'gantt-summary' : ''} ${orderTarget?.id === item.id ? orderTarget.after ? 'order-after' : 'order-before' : ''}`} key={`${item.type}-${item.id}`} {...(!summary ? orderRowProps(item) : {})}>
      <div className="gantt-label">
        {!summary && <button className="icon-button gantt-order-handle" aria-label={`Reorder ${item.title}`} title="Drag to reorder tasks; Alt + Up/Down also moves this task" draggable={!saving} disabled={saving} onDragStart={event => { orderDrag.current = item; drag.current = null; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain',item.id) }} onDragEnd={() => { orderDrag.current = null; setOrderTarget(null) }} onKeyDown={event => { if(event.altKey && ['ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); const tasks = groups.find(group => group.project.id === item.project_id)?.children || []; const target = tasks[tasks.findIndex(task => task.id === item.id) + (event.key === 'ArrowUp' ? -1 : 1)]; if(target) void saveOrder(item,target,event.key === 'ArrowDown') } }}><GripVertical size={18}/></button>}
        {summary && <button className="icon-button" aria-label={`${collapsed.has(project.id) ? 'Expand' : 'Collapse'} ${project.name}`} aria-expanded={!collapsed.has(project.id)} onClick={() => toggleProject(project.id)}>{collapsed.has(project.id) ? <ChevronRight size={17}/> : <ChevronDown size={17}/>}</button>}
        <button className="gantt-name" {...(!summary ? dragProps(item) : {})} onClick={() => onEdit(item.type, record)}>{summary ? <FolderOpen size={17}/> : <Circle size={13}/>}<span><span className="gantt-title-text">{item.title}</span><small>{dates}{summary ? ` · ${completion}% complete` : ''}</small>{!summary && <small className="gantt-duration">{startDistance}{' · '}{duration === null ? 'Duration not set' : `${duration} ${duration === 1 ? 'day' : 'days'} long`}</small>}</span></button>
      </div>
      <div style={{'--task-color': barColor}} className={`gantt-lane ${!summary && visible ? 'gantt-with-balloon' : ''}`} onDragOver={dragOver} onDrop={dropTask}>
        {preview?.id === item.id && <div className="gantt-drop-marker" style={{left: Math.max(0, dayDiff(start, preview.date)) * cellWidth}}><span>{formatDate(preview.date)}</span></div>}
        {today() >= start && today() <= end && <div className="gantt-today" style={{left: (dayDiff(start, today()) + .5) * cellWidth}}/>}
        {visible && !summary && <button className="gantt-task-balloon" {...dragProps(item)} style={{marginLeft: bubbleLeft, '--balloon-color': barColor, '--balloon-tip': `${Math.max(14, Math.min(260, left - bubbleLeft + 12))}px`}} onClick={() => onEdit(item.type, record)}>{item.title}</button>}
        {visible ? <button className={`gantt-bar ${summary ? 'gantt-summary-bar' : ''}`} aria-label={`Edit ${item.title}`} {...(!summary ? dragProps(item, true) : {})} title={`${item.title}: ${dates} · ${completion}% complete`} style={{left, width, '--project-color': barColor}} onClick={() => onEdit(item.type, record)}><><span className="gantt-progress" style={{width: `${completion}%`}}/><span className="gantt-bar-text">{summary ? `${completion}%` : ''}</span></></button> : <span className="gantt-unscheduled">{scheduled ? 'Outside this period' : 'Add dates to schedule'}</span>}
        {visible && !summary && <>{first >= start && <button className="gantt-resize-handle" aria-label={`Change start date for ${item.title}`} title={`Start date: ${formatDate(first, true)}`} style={{left, width: Math.min(10, width / 2)}} {...resizeProps(item, 'start_date')}/ >}{last <= end && <button className="gantt-resize-handle" aria-label={`Change end date for ${item.title}`} title={`End date: ${formatDate(last, true)}`} style={{left: left + width - Math.min(10, width / 2), width: Math.min(10, width / 2)}} {...resizeProps(item, 'due_date')}/>}</>}
      </div>
    </div>
  }
  return <>{moveError && <div className="error-banner" role="alert">{moveError}</div>}<div className="gantt-move-status" role="status">{saving ? 'Saving changes...' : preview ? `Move ${preview.title} to ${formatDate(preview.date, true)}` : ''}</div><div className="view-toolbar"><div className="gantt-nav"><button className="icon-button" aria-label="Previous period" onClick={() => setStart(addDays(start,-days))}><ChevronLeft size={19}/></button><strong>{formatDate(start)} - {formatDate(end,true)}</strong><button className="icon-button" aria-label="Next period" onClick={() => setStart(addDays(start,days))}><ChevronRight size={19}/></button><button className="button secondary small" onClick={() => setStart(addDays(today(),-3))}>Today</button><button className="button secondary small" disabled={!scheduleDates.length} onClick={fitSchedule}>Fit schedule</button></div><div className="filters"><select aria-label="Gantt chart period" value={days} onChange={e => setDays(Number(e.target.value))}><option value={14}>2 weeks</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={120}>120 days</option><option value={150}>150 days</option>{![14,30,90,120,150].includes(days) && <option value={days}>Full schedule · {days} days</option>}</select></div></div>
    <div className="gantt-scroll" role="region" aria-label="Gantt chart" tabIndex={0}><div className="gantt-chart" style={{'--chart-width': `${chartWidth}px`, '--day-width': `${cellWidth}px`, '--week-width': `${cellWidth * 7}px`, '--weekend-offset': `${((6 - dateValue(start).getDay() + 7) % 7) * cellWidth}px`}}>
      <div className="gantt-header"><div className="gantt-label">PROJECT / TASK</div><div className="gantt-scale"><div className="gantt-months">{monthBands.map(month => <span key={month.month} style={{width: month.count * cellWidth}}>{dateValue(month.date).toLocaleDateString(undefined, {month: 'short', year: 'numeric'})}</span>)}</div><div className="gantt-days gantt-weekdays">{Array.from({length: days}, (_, index) => { const date = dateValue(addDays(start, index)); return <span key={index} className={[0,6].includes(date.getDay()) ? 'weekend' : ''} style={{width: cellWidth, fontSize: cellWidth < 18 ? 9 : 14}} title={date.toLocaleDateString(undefined, {weekday: 'long'})}>{'SMTWTFS'[date.getDay()]}</span> })}</div><div className="gantt-days">{Array.from({length: days}, (_, index) => { const date = dateValue(addDays(start, index)); return <span key={index} className={[0,6].includes(date.getDay()) ? 'weekend' : ''} style={{width: cellWidth}}>{days <= 30 || (days <= 90 ? index % 7 === 0 : index % 14 === 0) ? date.getDate() : ''}</span> })}</div></div></div>
      {groups.length ? groups.map(group => <div className="gantt-group" key={group.project.id}>{row(group.summary, group.project, true)}{!collapsed.has(group.project.id) && group.children.map(item => row(item, group.project))}</div>) : <div className="gantt-empty">No projects match this view.</div>}
    </div></div><div className="gantt-status-legend">{Object.entries(TASK_STATUSES).map(([status,label]) => <span key={status}><i style={{background: statusColors[status]}}/>{label}</span>)}</div><p className="gantt-hint" id="gantt-drag-help"><span className="legend-line"/> Today <span>Bars show duration; darker fill shows completion. Drag a grip beside a task to reorder it within its project. Durations include both start and end dates. Drag a task title or bar to a date to reschedule it. Drag either end of a task bar to change its start or end date; focus an end handle and press Left/Right to adjust one day. Click to edit, or focus a task and press Alt + Left/Right to move it one day.</span></p>
  </>
}

