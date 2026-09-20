import { useState } from 'react'
import { ArrowUpRight, ArrowRight, Plus, MoreHorizontal, CalendarDays, Check, Circle, Flag, BookOpen, Pin, ChevronLeft, ChevronRight, ChevronDown, CheckCheck, FolderOpen, ListTodo, Diamond, MessageSquare, LayoutGrid, List, Clock3, Search } from 'lucide-react'
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

export function Overview({ data, onSelect, onEdit, onNavigate, search }) {
  const projects = data.projects.filter(p => p.status !== 'archived' && matches(p, search))
  const ids = new Set(data.projects.filter(p => p.status !== 'archived').map(p => p.id))
  const tasks = data.tasks.filter(t => ids.has(t.project_id))
  const open = tasks.filter(t => t.status !== 'done')
  const due = open.filter(t => t.due_date).sort((a,b) => a.due_date.localeCompare(b.due_date)).slice(0,5)
  const milestones = data.milestones.filter(m => !m.completed && ids.has(m.project_id)).sort((a,b) => a.due_date.localeCompare(b.due_date)).slice(0,4)
  return <>
    <section className="welcome-banner"><div><span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span><h2>Make room for your best work.</h2><p>All your projects, plans, and possibilities. One clear view.</p><button className="text-link" onClick={() => onEdit('projects')}>Start a new project <ArrowRight size={16}/></button></div><div className="banner-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-card"><CheckCheck size={23}/><span/><span/></div><div className="art-dot"/><div className="art-star">✳</div></div></section>
    <div className="stats-grid">{[
      ['Active projects', data.projects.filter(p => p.status === 'active').length, FolderOpen, 'Projects moving forward', () => onNavigate('projects')],
      ['Open tasks', open.length, ListTodo, `${tasks.filter(t => t.status === 'done').length} completed`, () => onNavigate('tasks')],
      ['Due this week', open.filter(t => t.due_date && t.due_date >= today() && t.due_date <= addDays(today(),7)).length, CalendarDays, 'Over the next 7 days', () => onNavigate('tasks','week')],
      ['Overdue', open.filter(overdue).length, Clock3, 'A little attention needed', () => onNavigate('tasks','overdue')],
    ].map(([label, count, Icon, note, click]) => <button className="stat-card" key={label} onClick={click}><span className="stat-label">{label}<Icon size={17}/></span><strong>{count.toString().padStart(2,'0')}</strong><span className="stat-note">{note}</span></button>)}</div>
    <div className="section-heading"><div><h2>Your projects <span className="count">{projects.length}</span></h2><p>Big ideas, moving one step at a time.</p></div><button className="text-link" onClick={() => onNavigate('projects')}>View all projects <ArrowRight size={16}/></button></div>
    {projects.length ? <div className="project-grid">{projects.slice(0,6).map(p => <ProjectCard key={p.id} project={p} data={data} onSelect={onSelect} onEdit={onEdit}/>)}</div> : <Empty title={search ? 'No matching projects' : 'Your next chapter starts here'} text={search ? 'Try another search.' : 'Create your first project, then turn the big picture into small, doable steps.'} action={!search ? () => onEdit('projects') : undefined} label="Create a project"/>}
    <div className="overview-bottom"><section className="panel"><div className="panel-heading"><h2>Coming up</h2><button className="icon-button" aria-label="View all tasks" onClick={() => onNavigate('tasks')}><ArrowUpRight size={18}/></button></div>{due.length ? due.map(task => <button className="upcoming-row" key={task.id} onClick={() => onEdit('tasks',task)}><span className={`task-circle ${task.status}`}><Circle size={17}/></span><div><strong>{task.title}</strong><ProjectName id={task.project_id} projects={data.projects}/></div><span className={overdue(task) ? 'late' : ''}>{formatDate(task.due_date)}</span></button>) : <div className="small-empty"><CalendarDays size={25}/><p>No upcoming deadlines.<br/>Add due dates to see what’s next.</p></div>}</section>
      <section className="panel"><div className="panel-heading"><h2>Milestones</h2><Flag size={17}/></div>{milestones.length ? milestones.map(m => <button className="upcoming-row" key={m.id} onClick={() => onEdit('milestones',m)}><span className="milestone-icon"><Diamond size={18}/></span><div><strong>{m.title}</strong><ProjectName id={m.project_id} projects={data.projects}/></div><span className={m.due_date < today() ? 'late' : ''}>{formatDate(m.due_date)}</span></button>) : <div className="small-empty"><Flag size={25}/><p>Give your projects a few landmarks.<br/>Add milestones in the Gantt chart.</p></div>}</section></div>
  </>
}

export function Projects({ data, search, onEdit, onSelect }) {
  const [status, setStatus] = useState('current')
  const projects = data.projects.filter(p => matches(p,search) && (status === 'all' || status === 'current' ? status === 'all' || p.status !== 'archived' : p.status === status))
  return <><div className="view-toolbar"><div className="filter-tabs">{[['current','Current'],['active','Active'],['completed','Completed'],['archived','Archived'],['all','All']].map(([key,label]) => <button key={key} className={status === key ? 'selected' : ''} onClick={() => setStatus(key)}>{label}</button>)}</div><span className="muted">{projects.length} projects</span></div>{projects.length ? <div className="project-grid">{projects.map(p => <ProjectCard key={p.id} project={p} data={data} onSelect={onSelect} onEdit={onEdit}/>)}</div> : <Empty title="A clean slate" text="No projects match this view. Start something new or change your filters." action={() => onEdit('projects')} label="New project"/>}</>
}

function TaskCard({ task, data, onEdit, onToggle, compact = false }) {
  return <article className={`task-card ${compact ? 'task-row' : ''}`} draggable={!compact} onDragStart={e => { e.dataTransfer.setData('text/plain',task.id); e.dataTransfer.effectAllowed = 'move' }}>
    <div className="task-main"><button className={`complete-button ${task.status === 'done' ? 'checked' : ''}`} aria-label={`${task.status === 'done' ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => onToggle(task)}>{task.status === 'done' && <Check size={13}/>}</button><button className={`task-title ${task.status === 'done' ? 'struck' : ''}`} onClick={() => onEdit('tasks',task)}>{task.title}</button></div>
    {!compact && task.description && <p className="task-description">{task.description}</p>}
    <div className="task-meta"><ProjectName id={task.project_id} projects={data.projects}/>{compact && <Badge value={task.status} labels={TASK_STATUSES}/>}<Badge value={task.priority} labels={PRIORITIES}/>{task.due_date && <span className={`task-date ${overdue(task) ? 'late' : ''}`}><CalendarDays size={12}/>{formatDate(task.due_date)}</span>}</div>
    {(task.labels.length > 0 || task.assignee || task.checklist.length > 0 || data.comments.some(c => c.task_id === task.id)) && <div className="task-extras">{task.labels.filter(Boolean).slice(0,3).map((label,i) => <span className="label" key={i}>{label.trim()}</span>)}{task.checklist.length > 0 && <span><CheckCheck size={13}/>{task.checklist.filter(t => t.done).length}/{task.checklist.length}</span>}{data.comments.some(c => c.task_id === task.id) && <span><MessageSquare size={13}/>{data.comments.filter(c => c.task_id === task.id).length}</span>}{task.assignee && <span className="assignee" title={task.assignee}>{task.assignee}</span>}</div>}
  </article>
}

function InlineTask({ projects, projectId, status, onCreate, onEdit, onClose }) {
  const [title, setTitle] = useState('')
  const [selectedProject, setSelectedProject] = useState(projectId || (projects.length === 1 ? projects[0].id : ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (busy || !title.trim() || !selectedProject) return
    setBusy(true); setError('')
    try {
      await onCreate('tasks', { title: title.trim(), project_id: selectedProject, status, priority: 'medium', description: '', assignee: '', start_date: null, due_date: null, labels: [], checklist: [] })
      onClose()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <form className="inline-task" onSubmit={submit} onKeyDown={event => { if(event.key === 'Escape' && !busy) { event.preventDefault(); onClose() } }}>
    <fieldset disabled={busy}>
      <label className="field"><span>Title</span><input autoFocus required maxLength={240} placeholder="What needs to be done?" value={title} onChange={event => setTitle(event.target.value)}/></label>
      {!projectId && <label className="field"><span>Project</span><select required value={selectedProject} onChange={event => setSelectedProject(event.target.value)}><option value="">Choose a project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="inline-task-actions"><button className="button primary small" disabled={!title.trim() || !selectedProject || busy}>{busy ? 'Adding...' : 'Add task'}</button><button type="button" className="text-link" onClick={onClose}>Cancel</button></div>
      <button type="button" className="text-link" onClick={() => { onEdit('tasks', null, { title, status, project_id: selectedProject }); onClose() }}>Open full task form <ArrowUpRight size={15}/></button>
    </fieldset>
  </form>
}

export function Tasks({ data, projectId, search, onEdit, onSave, onCreate, includeArchived = false, initialFilter = 'all' }) {
  const [layout, setLayout] = useState('board')
  const [priority, setPriority] = useState('all')
  const [dueFilter, setDueFilter] = useState(initialFilter)
  const [projectFilter, setProjectFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [dragOver, setDragOver] = useState('')
  const [adding, setAdding] = useState('')
  const archived = new Set(data.projects.filter(p => p.status === 'archived').map(p => p.id))
  const tasks = data.tasks.filter(t => (!projectId ? (includeArchived || !archived.has(t.project_id)) : t.project_id === projectId) && (projectFilter === 'all' || t.project_id === projectFilter) && matches(t,search) && (priority === 'all' || priority === t.priority) && (dueFilter === 'all' || dueFilter === 'overdue' && overdue(t) || dueFilter === 'week' && t.status !== 'done' && t.due_date >= today() && t.due_date <= addDays(today(),7) || dueFilter === 'undated' && !t.due_date)).sort((a,b) => sort === 'due' ? (a.due_date || '9999').localeCompare(b.due_date || '9999') : sort === 'priority' ? ['urgent','high','medium','low'].indexOf(a.priority) - ['urgent','high','medium','low'].indexOf(b.priority) : b.created_at.localeCompare(a.created_at))
  const toggle = task => onSave('tasks',{status: task.status === 'done' ? 'todo' : 'done'},task)
  return <><div className="view-toolbar task-toolbar"><div className="filters">{!projectId && <select aria-label="Filter project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option value="all">All projects</option>{data.projects.filter(p => includeArchived || p.status !== 'archived').map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select>}<select aria-label="Filter priority" value={priority} onChange={e => setPriority(e.target.value)}><option value="all">All priorities</option>{Object.entries(PRIORITIES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select><select aria-label="Filter due date" value={dueFilter} onChange={e => setDueFilter(e.target.value)}><option value="all">Any date</option><option value="week">Due this week</option><option value="overdue">Overdue</option><option value="undated">No due date</option></select><select aria-label="Sort tasks" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="due">Due date</option><option value="priority">Priority</option></select></div><div className="segmented"><button className={layout === 'board' ? 'selected' : ''} onClick={() => setLayout('board')}><LayoutGrid size={15}/> Board</button><button className={layout === 'list' ? 'selected' : ''} onClick={() => setLayout('list')}><List size={15}/> List</button></div></div>
    {!data.projects.length ? <Empty title="Every task needs a home" text="Create a project first, then break your work into tasks." action={() => onEdit('projects')} label="Create a project"/> : layout === 'board' ? <div className="kanban">{Object.entries(TASK_STATUSES).map(([key,label]) => <section key={key} className={`kanban-column ${dragOver === key ? 'drag-over' : ''}`} onDragOver={e => { e.preventDefault(); setDragOver(key) }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver('') }} onDrop={e => { e.preventDefault(); setDragOver(''); const task = data.tasks.find(t => t.id === e.dataTransfer.getData('text/plain')); if(task && task.status !== key) onSave('tasks',{status:key},task) }}><div className="column-heading"><span className={`status-dot ${key}`}/><h3>{label}</h3><span>{tasks.filter(t => t.status === key).length}</span><button className="icon-button" aria-label={`Add task to ${label}`} onClick={() => setAdding(key)}><Plus size={17}/></button></div><div className="column-tasks">{tasks.filter(t => t.status === key).map(task => <TaskCard key={task.id} task={task} data={data} onEdit={onEdit} onToggle={toggle}/>)}{adding === key ? <InlineTask key={`${key}-${projectFilter}`} projects={data.projects.filter(p => includeArchived || p.status !== 'archived' || p.id === projectId)} projectId={projectId || (projectFilter === 'all' ? null : projectFilter)} status={key} onCreate={onCreate} onEdit={onEdit} onClose={() => setAdding('')}/> : <button className="add-task" onClick={() => setAdding(key)}><Plus size={15}/> Add task</button>}</div></section>)}</div> : tasks.length ? <div className="task-list">{tasks.map(t => <TaskCard key={t.id} task={t} data={data} onEdit={onEdit} onToggle={toggle} compact/>)}</div> : <Empty icon={Search} title="No tasks in this view" text="Try different filters or add a task." action={() => onEdit('tasks')} label="New task"/>}
  </>
}

export function Knowledge({ data, projectId, search, onEdit }) {
  const [category, setCategory] = useState('All')
  const documents = data.documents.filter(d => (!projectId || d.project_id === projectId) && matches(d,search) && (category === 'All' || d.category === category)).sort((a,b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
  const categories = [...new Set(data.documents.filter(d => !projectId || d.project_id === projectId).map(d => d.category))].sort()
  return <><div className="view-toolbar"><div className="filter-tabs"><button className={category === 'All' ? 'selected' : ''} onClick={() => setCategory('All')}>All pages</button>{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><span className="muted">{documents.length} pages</span></div>{documents.length ? <div className="document-grid">{documents.map(d => <button key={d.id} className="document-card" onClick={() => onEdit('documents',d)}><div className="document-card-top"><span className="document-icon"><BookOpen size={22}/></span><span className="label">{d.category}</span>{d.pinned && <Pin size={15}/>}</div><h3>{d.title}</h3><p>{d.content.replace(/[#*`>[\]]/g,'').slice(0,155) || 'No content yet.'}</p><div className="document-card-bottom"><ProjectName id={d.project_id} projects={data.projects}/><span>{formatDate(d.updated_at)}</span></div></button>)}</div> : <Empty icon={BookOpen} title="Good ideas deserve a place" text="Keep plans, decisions, research, and meeting notes connected to your projects." action={() => onEdit('documents')} label="Create a page"/>}</>
}

export function GanttChart({ data, projectId, search, onEdit, onSave, includeArchived = false }) {
  const [start, setStart] = useState(() => addDays(today(), -3))
  const [days, setDays] = useState(30)
  const [collapsed, setCollapsed] = useState(new Set())
  const end = addDays(start, days - 1)
  const projects = data.projects.filter(p => projectId ? p.id === projectId : includeArchived || p.status !== 'archived')
  const ids = new Set(projects.map(p => p.id))
  const groups = projects.map(project => {
    const tasks = data.tasks.filter(task => task.project_id === project.id)
    const children = [...tasks.map(task => ({...task, type: 'tasks'})), ...data.milestones.filter(m => m.project_id === project.id).map(m => ({...m, type: 'milestones'}))]
      .filter(item => matches(project, search) || matches(item, search))
      .sort((a, b) => (a.start_date || a.due_date || '9999').localeCompare(b.start_date || b.due_date || '9999'))
    const dates = [project.start_date, project.due_date, ...children.flatMap(item => [item.start_date, item.due_date])].filter(Boolean).sort()
    return {project, children, summary: {...project, type: 'projects', title: project.name, start_date: dates[0] || null, due_date: dates.at(-1) || null, completion: progress(tasks)}}
  }).filter(group => matches(group.project, search) || group.children.length)
  const milestones = data.milestones.filter(m => ids.has(m.project_id) && matches(m,search)).sort((a,b) => (a.due_date || '').localeCompare(b.due_date || ''))
  const scheduleDates = groups.flatMap(group => [group.summary.start_date, group.summary.due_date]).filter(Boolean).sort()
  function fitSchedule() {
    if (!scheduleDates.length) return
    setStart(addDays(scheduleDates[0], -2))
    setDays(Math.max(14, dayDiff(scheduleDates[0], scheduleDates.at(-1)) + 5))
  }
  function toggleProject(id) {
    setCollapsed(current => { const next = new Set(current); if(next.has(id)) next.delete(id); else next.add(id); return next })
  }
  const cellWidth = days <= 30 ? 36 : days <= 90 ? 18 : 8
  const chartWidth = days * cellWidth
  const monthBands = []
  for (let index = 0; index < days; index++) {
    const date = addDays(start, index)
    const month = date.slice(0, 7)
    const last = monthBands.at(-1)
    if(last?.month === month) last.count++
    else monthBands.push({month, date, count: 1})
  }
  function row(item, project, summary = false) {
    const first = item.start_date || item.due_date
    const last = item.due_date || item.start_date
    const scheduled = Boolean(first && last)
    const visible = scheduled && last >= start && first <= end
    const left = visible ? Math.max(0, dayDiff(start, first)) * cellWidth : 0
    const width = visible ? (dayDiff(first < start ? start : first, last > end ? end : last) + 1) * cellWidth : 0
    const completion = summary ? item.completion : item.status === 'done' || item.completed ? 100 : item.checklist?.length ? Math.round(item.checklist.filter(t => t.done).length / item.checklist.length * 100) : 0
    const record = summary ? project : item
    const dates = scheduled ? `${formatDate(first, true)} - ${formatDate(last, true)}` : 'Unscheduled'
    return <div className={`gantt-row ${summary ? 'gantt-summary' : ''}`} key={`${item.type}-${item.id}`}>
      <div className="gantt-label">
        {summary && <button className="icon-button" aria-label={`${collapsed.has(project.id) ? 'Expand' : 'Collapse'} ${project.name}`} aria-expanded={!collapsed.has(project.id)} onClick={() => toggleProject(project.id)}>{collapsed.has(project.id) ? <ChevronRight size={17}/> : <ChevronDown size={17}/>}</button>}
        <button className="gantt-name" onClick={() => onEdit(item.type, record)}>{summary ? <FolderOpen size={17}/> : item.type === 'milestones' ? <Diamond size={15}/> : <Circle size={13}/>}<span>{item.title}<small>{dates}{summary ? ` · ${completion}% complete` : ''}</small></span></button>
      </div>
      <div className="gantt-lane">
        {today() >= start && today() <= end && <div className="gantt-today" style={{left: (dayDiff(start, today()) + .5) * cellWidth}}/>}
        {visible ? <button className={`gantt-bar ${summary ? 'gantt-summary-bar' : ''} ${item.type === 'milestones' ? 'gantt-milestone' : ''}`} aria-label={`Edit ${item.title}`} title={`${item.title}: ${dates} · ${completion}% complete`} style={{left: item.type === 'milestones' ? left + cellWidth / 2 : left, width: item.type === 'milestones' ? 22 : width, '--project-color': project.color || '#49755f'}} onClick={() => onEdit(item.type, record)}>{item.type === 'milestones' ? <Diamond size={22} fill="currentColor"/> : <><span className="gantt-progress" style={{width: `${completion}%`}}/><span className="gantt-bar-text">{summary ? `${completion}%` : item.title}</span></>}</button> : <span className="gantt-unscheduled">{scheduled ? 'Outside this period' : 'Add dates to schedule'}</span>}
      </div>
    </div>
  }
  return <><div className="view-toolbar"><div className="gantt-nav"><button className="icon-button" aria-label="Previous period" onClick={() => setStart(addDays(start,-days))}><ChevronLeft size={19}/></button><strong>{formatDate(start)} - {formatDate(end,true)}</strong><button className="icon-button" aria-label="Next period" onClick={() => setStart(addDays(start,days))}><ChevronRight size={19}/></button><button className="button secondary small" onClick={() => setStart(addDays(today(),-3))}>Today</button><button className="button secondary small" disabled={!scheduleDates.length} onClick={fitSchedule}>Fit schedule</button></div><div className="filters"><select aria-label="Gantt chart period" value={days} onChange={e => setDays(Number(e.target.value))}><option value={14}>2 weeks</option><option value={30}>30 days</option><option value={90}>90 days</option>{![14,30,90].includes(days) && <option value={days}>Full schedule · {days} days</option>}</select><button className="button secondary" disabled={!projects.length} onClick={() => onEdit('milestones')}><Flag size={16}/> New milestone</button></div></div>
    <div className="gantt-scroll" role="region" aria-label="Gantt chart" tabIndex={0}><div className="gantt-chart" style={{'--chart-width': `${chartWidth}px`, '--day-width': `${cellWidth}px`, '--week-width': `${cellWidth * 7}px`, '--weekend-offset': `${((6 - dateValue(start).getDay() + 7) % 7) * cellWidth}px`}}>
      <div className="gantt-header"><div className="gantt-label">PROJECT / TASK / MILESTONE</div><div className="gantt-scale"><div className="gantt-months">{monthBands.map(month => <span key={month.month} style={{width: month.count * cellWidth}}>{dateValue(month.date).toLocaleDateString(undefined, {month: 'short', year: 'numeric'})}</span>)}</div><div className="gantt-days">{Array.from({length: days}, (_, index) => { const date = dateValue(addDays(start, index)); return <span key={index} className={[0,6].includes(date.getDay()) ? 'weekend' : ''} style={{width: cellWidth}}>{days <= 30 || (days <= 90 ? index % 7 === 0 : index % 14 === 0) ? date.getDate() : ''}</span> })}</div></div></div>
      {groups.length ? groups.map(group => <div className="gantt-group" key={group.project.id}>{row(group.summary, group.project, true)}{!collapsed.has(group.project.id) && group.children.map(item => row(item, group.project))}</div>) : <div className="gantt-empty">No projects match this view.</div>}
    </div></div><p className="gantt-hint"><span className="legend-line"/> Today <span>Bars show duration; darker fill shows completion. Diamonds mark milestones. Click a task or bar to edit its dates.</span></p>
    <div className="section-heading"><div><h2>Milestones</h2><p>The meaningful moments along the way.</p></div></div>{milestones.length ? <div className="milestone-list">{milestones.map(m => <div className="milestone-row" key={m.id}><button className={`complete-button ${m.completed ? 'checked' : ''}`} aria-label={`${m.completed ? 'Reopen' : 'Complete'} ${m.title}`} onClick={() => onSave('milestones',{completed:!m.completed},m)}>{m.completed && <Check size={13}/>}</button><button className={`task-title ${m.completed ? 'struck' : ''}`} onClick={() => onEdit('milestones',m)}>{m.title}</button><ProjectName id={m.project_id} projects={data.projects}/><span className={!m.completed && m.due_date < today() ? 'late' : 'muted'}>{formatDate(m.due_date,true)}</span></div>)}</div> : <Empty icon={Flag} title="Mark your milestones" text="Set a launch date, a review, or a moment worth celebrating." action={projects.length ? () => onEdit('milestones') : () => onEdit('projects')} label={projects.length ? 'Add milestone' : 'Create project'}/>}
  </>
}

