import { useState } from 'react'

export function ProjectListbox({ projects, projectId, onSelect, onEdit, onDelete }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = projects.find(project => project.id === projectId)
  return <section className="project-picker" aria-label="Project management">
    <label className="field"><span>Projects</span><select size={5} aria-label="Projects" value={projectId || ''} onChange={event => onSelect(event.target.value)}>
      {!projects.length && <option value="" disabled>No projects yet</option>}
      {[...projects].sort((a,b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id)).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
    </select></label>
    <div className="project-picker-actions"><button className="button primary" onClick={() => onEdit('projects')}>Add project</button><button className="button secondary" disabled={!selected || busy} onClick={() => onEdit('projects', selected)}>Edit project</button><button className="button secondary danger-text" disabled={!selected || busy} onClick={async () => {
      if (!window.confirm(`Delete ${selected.name} and all its tasks and entries?`)) return
      setBusy(true); setError('')
      try { await onDelete('projects', selected) } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}>Delete project</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>
}
