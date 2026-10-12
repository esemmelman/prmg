import { Plus } from 'lucide-react'

export function ProjectListbox({ projects, projectId, onSelect, onEdit }) {
  return <section className="project-picker" aria-label="Project management">
    <div className="field"><button className="icon-button project-add" aria-label="Create project" title="Create project" onClick={() => onEdit('projects')}><Plus size={18}/></button><select size={5} aria-label="Projects" value={projectId || ''} onChange={event => onSelect(event.target.value)}>
      {!projects.length && <option value="" disabled>No projects yet</option>}
      {[...projects].sort((a,b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id)).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
    </select></div>
  </section>
}
