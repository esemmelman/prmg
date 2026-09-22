import { useCallback, useEffect, useRef, useState } from 'react'
import { FolderOpen, LayoutGrid, ListTodo, BookOpen, CalendarDays, Search, Plus, Settings2, LogOut, LockKeyhole, ArrowRight, LoaderCircle, ChevronLeft, ChevronRight, X, Download, ShieldCheck, CircleHelp, Sprout, Activity, Check } from 'lucide-react'
import { supabase, loadWorkspace, saveRecord, removeRecord, reorderTask, emptyData } from './data'
import { OWNER_ID, LOGIN_EMAIL } from './config'
import { version } from '../package.json'
import { PROJECT_STATUSES, progress, downloadJson, formatDate } from './utils'
import { Editor, Modal } from './Editor'
import { Projects, Tasks, Knowledge, GanttChart, Badge } from './Views'

const nav = [ ['gantt','Gantt chart',CalendarDays], ['tasks','Tasks',ListTodo], ['knowledge','Knowledge base',BookOpen] ]
const descriptions = { overview: 'A little perspective for everything you’re working on.', tasks: 'Small steps. Meaningful progress.', knowledge: 'Everything you know, right where you need it.', gantt: 'Plan projects and tasks on one schedule.', allProjects: 'Tasks and schedules across all your projects.' }

function Login({ onLogin, error, busy }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  return <main className="login-page"><div className="login-card"><div className="login-illustration"><FolderOpen size={32}/><span className="tiny-check"><Check size={16}/></span></div><span className="eyebrow">YOUR PERSONAL PROJECT SPACE</span><h1>Good work starts<br/>with a clear mind.</h1><p>Projects, tasks, and ideas.<br/>Together in one quiet corner.</p><form onSubmit={e => { e.preventDefault(); onLogin(password) }}><label className="field"><span>Your Supabase app passcode</span><div className="password-input"><LockKeyhole size={17}/><input type={show ? 'text' : 'password'} required autoFocus autoComplete="current-password" aria-label="Passcode" value={password} onChange={e => setPassword(e.target.value)}/><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="button primary login-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : <>Open your workspace <ArrowRight size={17}/></>}</button></form><span className="login-security"><ShieldCheck size={15}/> Private workspace · Remembered for 90 days</span><p className="login-note">Use your existing Supabase app login password.<br/>This is separate from your database password.</p></div><div className="login-footer">v{version}</div></main>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [verified, setVerified] = useState(false)
  const [authError, setAuthError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [data, setData] = useState(emptyData)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState('blank')
  const [projectId, setProjectId] = useState(null)
  const [projectTab, setProjectTab] = useState('tasks')
  const [taskFilter, setTaskFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState(null)
  const [settings, setSettings] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [sidebar, setSidebar] = useState(() => window.matchMedia('(min-width: 651px)').matches)
  const [toast, setToast] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 651px)')
    const resize = event => setSidebar(event.matches)
    desktop.addEventListener('change', resize)
    return () => desktop.removeEventListener('change', resize)
  }, [])
  const closeMobileSidebar = () => { if(window.matchMedia('(max-width: 650px)').matches) setSidebar(false) }
  const searchRef = useRef(null)
  const requestCounter = useRef(0)
  const mutationBusy = useRef(false)
  const sessionRef = useRef(null)
  useEffect(() => { sessionRef.current = session }, [session])

  // Synchronize the authenticated Supabase session with the remote workspace.
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({data, error}) => { if (active) { setSession(data.session); setAuthReady(true); if(error) setAuthError(error.message) } })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setAuthReady(true) })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const refresh = useCallback(async (quiet = false) => {
    if (!sessionRef.current) return
    const request = ++requestCounter.current
    if(!quiet) setLoading(true)
    try {
      const { data: valid, error: validationError } = await supabase.rpc('prmg_session_valid')
      if(validationError) throw validationError
      if(!valid || sessionRef.current?.user.id !== OWNER_ID) {
        setAuthError('Your session has expired or does not have access. Please enter your passcode again.')
        await supabase.auth.signOut({scope:'local'}); setSession(null); return
      }
      const next = await loadWorkspace()
      if (request !== requestCounter.current || !sessionRef.current) return
      setData(next); setVerified(true); setLoaded(true); setError('')
    } catch(err) { if(request === requestCounter.current) setError(err.message || 'Could not reach your workspace. Please retry.') }
    finally { if(request === requestCounter.current) setLoading(false) }
  }, [])

  useEffect(() => {
    if(session) refresh()
    else { requestCounter.current++; setData(emptyData); setVerified(false); setLoaded(false); setEditor(null); setLoading(false); setError(''); setProjectId(null); setView('blank') }
  }, [session, refresh])
  /* oxlint-enable react/set-state-in-effect */

  useEffect(() => {
    const sync = () => { if(document.visibilityState === 'visible' && navigator.onLine && !mutationBusy.current) refresh(true) }
    const connected = () => { setOnline(true); sync() }, disconnected = () => setOnline(false)
    const timer = setInterval(sync,60000)
    window.addEventListener('online',connected); window.addEventListener('offline',disconnected); window.addEventListener('focus',sync)
    return () => { clearInterval(timer); window.removeEventListener('online',connected); window.removeEventListener('offline',disconnected); window.removeEventListener('focus',sync) }
  },[refresh])
  useEffect(() => { if(!toast) return; const timer = setTimeout(() => setToast(''),3500); return () => clearTimeout(timer) },[toast])
  useEffect(() => { const key = e => { if((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() } }; window.addEventListener('keydown',key); return () => window.removeEventListener('keydown',key) },[])

  async function login(password) {
    setLoginBusy(true); setAuthError('')
    try {
      const {error} = await supabase.auth.signInWithPassword({email:LOGIN_EMAIL,password})
      if(error) setAuthError(error.status === 400 ? 'That passcode didn’t match your app login. Try again.' : error.message)
    } catch(err) { setAuthError(err.message) } finally { setLoginBusy(false) }
  }
  async function logout() {
    const {error} = await supabase.auth.signOut({scope:'local'})
    if(error) { setError(error.message); return }
    setSession(null); setSettings(false); setShowActivity(false); setAuthError(''); setSearch('')
  }
  function navigate(next, filter = 'all') { setView(next); setProjectId(null); setTaskFilter(filter); setSearch(''); closeMobileSidebar() }
  function selectProject(id) { setProjectId(id); setView('project'); setProjectTab('tasks'); setSearch(''); closeMobileSidebar() }
  function edit(type, item = null, defaults = {}) {
    if(!online) { setError('You’re offline. Reconnect before making changes.'); return }
    if(type === 'tasks' && !data.projects.length) { setToast('Create a project first.'); type = 'projects'; item = null }
    setEditor({type,item,projectId,defaults})
  }
  async function save(type, values, item) {
    if(mutationBusy.current) throw new Error('Another change is saving. Please try again in a moment.')
    if(!navigator.onLine) throw new Error('You’re offline. Reconnect to save your changes.')
    mutationBusy.current = true
    requestCounter.current++
    try {
      const row = await saveRecord(type,values,item)
      setData(current => ({...current,[type]:item?.id ? current[type].map(r => r.id === item.id ? row : r) : [row,...current[type]]}))
      setToast(item?.id ? 'Changes saved' : `${{projects:'Project',tasks:'Task',documents:'Page',comments:'Comment'}[type]} created`)
      await refresh(true)
      return row
    } finally { mutationBusy.current = false }
  }
  async function reorder(taskId, targetId, after) {
    if(mutationBusy.current) throw new Error('Another change is saving. Please try again in a moment.')
    if(!navigator.onLine) throw new Error('Reconnect to save the task order.')
    mutationBusy.current = true
    requestCounter.current++
    try {
      await reorderTask(taskId, targetId, after)
      await refresh(true)
      setToast('Task order saved')
    } finally { mutationBusy.current = false }
  }
  async function quickSave(type, values, item) { try { await save(type,values,item) } catch(err) { setError(err.message) } }
  async function remove(type,item) {
    if(mutationBusy.current) throw new Error('Another change is saving. Please try again in a moment.')
    mutationBusy.current = true
    requestCounter.current++
    try {
      await removeRecord(type,item)
      setData(current => ({...current,[type]:current[type].filter(r => r.id !== item.id)}))
      if(type === 'projects' && item.id === projectId) navigate('projects')
      setToast('Deleted'); await refresh(true)
    } finally { mutationBusy.current = false }
  }

  const project = data.projects.find(p => p.id === projectId)
  const allProjects = view === 'allProjects'
  const currentView = projectId || allProjects ? projectTab : view
  const title = project?.name || (allProjects ? 'All Projects' : '') || nav.find(n => n[0] === view)?.[1] || (view === 'projects' ? 'Projects' : '')
  const createType = {overview:'projects',projects:'projects',tasks:'tasks',knowledge:'documents'}[currentView]
  const createLabel = {projects:'New project',tasks:'New task',documents:'New page'}[createType]
  const props = {data,search,onEdit:edit,onSelect:selectProject,onNavigate:navigate,onSave:quickSave,onCreate:save,onReorder:reorder,projectId,includeArchived:allProjects}

  if(!authReady) return <div className="app-loading"><Sprout size={30}/><p>Opening your workspace…</p></div>
  if(!session) return <Login onLogin={login} error={authError} busy={loginBusy}/>
  if(!verified || !loaded) return <div className="app-loading"><Sprout size={30}/><h2>{error ? 'Your workspace couldn’t load' : 'Making room for good work…'}</h2>{error ? <><p role="alert">{error}</p><button className="button primary" onClick={() => refresh()}>Try again</button><button className="button secondary" onClick={logout}>Back to sign in</button></> : <LoaderCircle className="spin" size={20}/>}</div>
  return <div className={`app-shell ${sidebar ? 'sidebar-visible' : 'sidebar-hidden'}`}>
    {sidebar && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebar(false)}/>}
    <aside id="workspace-sidebar" className={`sidebar ${sidebar ? 'open' : ''}`} inert={!sidebar}><button className="icon-button sidebar-close" aria-label="Hide navigation" title="Hide sidebar" aria-expanded={sidebar} aria-controls="workspace-sidebar" onClick={() => setSidebar(false)}><ChevronLeft size={20}/></button><div className="sidebar-projects-heading"><button className="icon-button" aria-label="Create project" onClick={() => edit('projects')}><Plus size={15}/></button></div><div className="sidebar-projects"><button className={`sidebar-project ${allProjects ? 'selected' : ''}`} onClick={() => { navigate('allProjects'); setProjectTab('tasks') }}><LayoutGrid size={17}/><span>All Projects</span></button>{data.projects.filter(p => p.status !== 'archived').map(p => <button key={p.id} title={p.name} className={`sidebar-project ${p.id === projectId ? 'selected' : ''}`} onClick={() => selectProject(p.id)}><i style={{background:p.color}}/><span>{p.name}</span></button>)}{!data.projects.length && <p className="sidebar-empty">Your projects will feel<br/>right at home here.</p>}</div><nav className="workspace-nav" aria-label="Workspace">{nav.map(([key,label,Icon]) => <button key={key} className={`nav-link ${view === key ? 'active' : ''}`} onClick={() => navigate(key)}><Icon size={18}/><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><button className="nav-link" onClick={() => setSettings(true)}><Settings2 size={18}/> Workspace settings</button><div className="app-version sidebar-version">v{version}</div><div className="user-profile"><span className="user-avatar">E</span><div><strong>Elliot</strong><span>Personal workspace</span></div><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="topbar-start">{!sidebar && <button className="icon-button sidebar-toggle" aria-label="Open navigation" title="Show sidebar" aria-expanded={sidebar} aria-controls="workspace-sidebar" onClick={() => setSidebar(true)}><ChevronRight size={20}/></button>}</div><div className="topbar-actions"><label className="search-box"><Search size={16}/><input ref={searchRef} aria-label="Search current view" value={search} onChange={e => setSearch(e.target.value)}/>{search ? <button className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}><X size={14}/></button> : <kbd>Ctrl K</kbd>}</label><button className="icon-button activity-button" title="Recent activity" aria-label="Recent activity" onClick={() => setShowActivity(true)}><Activity size={19}/></button><span className="topbar-avatar">E</span></div></header>
      <main className="main-content" aria-busy={loading}>{view !== 'blank' && <div className="page-heading"><div><div className="page-title"><h1>{title}</h1>{project && <Badge value={project.status} labels={PROJECT_STATUSES}/>}</div>{(project || descriptions[view]) && <p>{project ? project.description || '' : descriptions[view]}</p>}</div><div className="heading-actions">{project && <button className="button secondary" onClick={() => edit('projects',project)}><Settings2 size={16}/> Edit project</button>}{createType === 'documents' && <button className="button primary" onClick={() => edit(createType)}><Plus size={17}/>{createLabel}</button>}</div></div>}
      {!online && <div className="error-banner" role="status">You’re offline. Your saved workspace is visible; reconnect to make changes.</div>}
      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => refresh()} className="text-link">Retry</button><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
      {project && <><div className="project-summary"><span><CalendarDays size={15}/>{project.start_date ? formatDate(project.start_date) : 'No start date'} — {project.due_date ? formatDate(project.due_date) : 'No deadline'}</span><span><Check size={15}/>{progress(data.tasks.filter(t => t.project_id === project.id))}% complete</span></div></>}
      {(project || allProjects) && <div className="project-tabs">{[['tasks','Tasks',ListTodo],...(!allProjects ? [['knowledge','Knowledge base',BookOpen]] : []),['gantt','Gantt chart',CalendarDays]].map(([key,label,Icon]) => <button key={key} className={projectTab === key ? 'active' : ''} onClick={() => { setProjectTab(key); setSearch('') }}><Icon size={16}/>{label}</button>)}</div>}
      {currentView === 'projects' && <Projects {...props}/>}{currentView === 'tasks' && <Tasks key={`${projectId || view}-${taskFilter}`} {...props} initialFilter={taskFilter}/>}{currentView === 'knowledge' && <Knowledge key={projectId || 'all'} {...props}/>}{currentView === 'gantt' && <GanttChart key={projectId || 'all'} {...props}/>}

      </main></div>
    {editor && <Editor key={`${editor.type}-${editor.item?.id || 'new'}`} editor={editor} data={data} onSave={save} onDelete={remove} onClose={() => setEditor(null)} onComment={(taskId,content) => save('comments',{task_id:taskId,content})} onDeleteComment={comment => remove('comments',comment)}/>}
    {settings && <Modal title="Workspace settings" onClose={() => setSettings(false)}><div className="settings-body"><div className="settings-section"><ShieldCheck size={23}/><div><h3>Private, by design</h3><p>Only your existing Supabase app account can access this workspace. This browser stays signed in for up to 90 days. Sign out to lock it sooner.</p></div></div><div className="settings-section"><Download size={23}/><div><h3>A copy of your work</h3><p>Download all projects, tasks, pages, comments, and activity as a JSON backup.</p><button className="button secondary" onClick={() => { downloadJson(data); setToast('Backup downloaded') }}><Download size={16}/> Export workspace</button></div></div><div className="settings-section"><CircleHelp size={23}/><div><h3>Make yourself at home</h3><p>Drag tasks between board columns or edit their status. Write knowledge pages in Markdown. Use project dates, and task dates to plan your Gantt chart.</p><p>Assignees are organizational labels in this personal workspace; they do not send invitations or grant access.</p></div></div><button className="button secondary" onClick={logout}><LogOut size={16}/> Sign out of this device</button></div></Modal>}
    {showActivity && <Modal title="Recent activity" onClose={() => setShowActivity(false)}><div className="activity-list">{data.activity.length ? data.activity.slice(0,60).map(a => <div className="activity-item" key={a.id}><span className="activity-dot"/><div><p><strong>{a.title}</strong> was {a.action}</p><span>{a.entity_type.replace('documents','page')} · {new Date(a.created_at).toLocaleString()}</span></div></div>) : <p className="muted">Your workspace’s story starts with your first project.</p>}</div></Modal>}
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </div>
}
