import { Circle, CheckCircle2, Plus } from 'lucide-react'
import { TASK_STATUSES } from './utils'

export function SidebarProjects({ projects, tasks, projectId, onSelect, onEdit }) {
  const visible = projects.filter(project => project.status !== 'archived')
  return <div className="sidebar-projects">
    {visible.map(project => <section key={project.id} aria-label={`${project.name} tasks`} className="sidebar-project-group">
      <div className="sidebar-project-heading">
        <button title={project.name} className={`sidebar-project ${project.id === projectId ? 'selected' : ''}`} onClick={() => onSelect(project.id)}><i style={{background:project.color}}/><span>{project.name}</span></button>
        <button className="icon-button" aria-label={`Add task to ${project.name}`} title="Add task" onClick={() => onEdit('tasks', null, {project_id:project.id})}><Plus size={14}/></button>
      </div>
      <ul className="sidebar-task-list">
        {tasks.filter(task => task.project_id === project.id).sort((a,b) => a.sort_order == null && b.sort_order == null ? b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id) : a.sort_order == null ? -1 : b.sort_order == null ? 1 : a.sort_order - b.sort_order).map(task => <li key={task.id}>
          <button className={`sidebar-task ${task.status === 'done' ? 'completed' : ''}`} aria-label={`Edit task: ${task.title}`} title={`${task.title} · ${TASK_STATUSES[task.status] || task.status}`} onClick={() => onEdit('tasks', task)}>
            {task.status === 'done' ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
            <span>{task.title}</span>
          </button>
        </li>)}
      </ul>
    </section>)}
    {!visible.length && <p className="sidebar-empty">Your projects will feel<br/>right at home here.</p>}
  </div>
}
