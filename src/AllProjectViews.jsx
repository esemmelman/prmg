import { ProjectLog } from './ProjectLog'
import { ProjectLinks } from './ProjectLinks'
import { Tasks, Knowledge, GanttChart } from './Views'

export function AllProjectViews({ currentView, data, onEdit, ...props }) {
  const projects = [...data.projects].sort((a,b) => a.name.localeCompare(b.name,undefined,{sensitivity:'base',numeric:true}) || a.id.localeCompare(b.id))
  if (currentView === 'gantt') return <GanttChart {...props} data={data} projectId={null} onEdit={onEdit} includeArchived combined/>
  return <div className="all-project-groups">
    {!projects.length && <p className="muted">No projects yet.</p>}
    {projects.map(project => {
      const scoped = {...props,data,projectId:project.id,includeArchived:true,taskFocusRequest:0,autoFocus:/Android/i.test(navigator.userAgent) && project.id === projects.find(candidate => data.tasks.some(task => task.project_id === candidate.id))?.id,onEdit:(type,item,defaults={}) => onEdit(type,item,{...defaults,project_id:project.id})}
      return <section className="all-project-group" aria-label={`${project.name} project`} key={project.id}><h2 className="all-project-heading">{project.name}</h2>
        {currentView === 'log' && <ProjectLog {...scoped}/>}
        {currentView === 'pages' && <ProjectLog {...scoped} kind="pages"/>}
        {currentView === 'links' && <ProjectLinks {...scoped} onSave={scoped.onCreate}/>}
        {currentView === 'tasks' && <Tasks {...scoped}/>}
        {currentView === 'gantt' && <GanttChart {...scoped}/>}
        {currentView === 'knowledge' && <><button className="button secondary small" onClick={() => scoped.onEdit('documents')}>Add page</button><Knowledge {...scoped}/></>}
      </section>
    })}
    {currentView === 'knowledge' && data.documents.some(document => !document.project_id && !['Project log','Project pages','Project links'].includes(document.category)) && <section className="all-project-group" aria-label="Workspace pages"><h2 className="all-project-heading">Workspace</h2><Knowledge {...props} data={{...data,documents:data.documents.filter(document=>!document.project_id)}} onEdit={onEdit}/></section>}
  </div>
}
