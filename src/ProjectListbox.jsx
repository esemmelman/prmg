import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'

export function ProjectListbox({ projects, projectId, onSelect, onEdit, onDelete }) {
  const [menu, setMenu] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const menuRef = useRef(null)
  const sorted = [...projects].sort((a,b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id))
  useEffect(() => {
    if (!menu) return
    menuRef.current?.querySelector('button')?.focus()
    const close = event => { if (!menuRef.current?.contains(event.target)) setMenu(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])
  function openMenu(event, project) { event.preventDefault(); setMenu(project) }
  return <section className="project-picker" aria-label="Project management">
    <button className="icon-button project-add" aria-label="Create project" title="Create project" onClick={() => onEdit('projects')}><Plus size={18}/></button>
    <div className="project-listbox" role="listbox" aria-label="Projects">
      {!sorted.length && <span className="muted">No projects yet</span>}
      {sorted.map((project,index) => <div key={project.id} role="option" aria-selected={project.id === projectId} tabIndex={project.id === projectId || !projectId && index === 0 ? 0 : -1} onClick={() => onSelect(project.id)} onContextMenu={event => openMenu(event,project)} onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(project.id) }
        if (event.key === 'ContextMenu' || event.shiftKey && event.key === 'F10') openMenu(event,project)
        if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
          event.preventDefault()
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? sorted.length-1 : Math.max(0,Math.min(sorted.length-1,index+(event.key === 'ArrowDown' ? 1 : -1)))
          onSelect(sorted[next].id); event.currentTarget.parentElement.children[next]?.focus()
        }
      }}>{project.name}</div>)}
    </div>
    {menu && <div className="project-context-menu" role="menu" aria-label={`Actions for ${menu.name}`} ref={menuRef} onKeyDown={event => {
      if (event.key === 'Escape') { setMenu(null); document.querySelector('.project-listbox [aria-selected="true"]')?.focus() }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const buttons = [...menuRef.current.querySelectorAll('button')]; buttons[(buttons.indexOf(document.activeElement)+1)%buttons.length]?.focus() }
    }}><button role="menuitem" disabled={busy} onClick={() => { onEdit('projects',menu); setMenu(null) }}>Edit</button><button role="menuitem" disabled={busy} onClick={async () => {
      if (!window.confirm(`Delete ${menu.name} and all its tasks and entries?`)) return
      setBusy(true); setError('')
      try { await onDelete('projects',menu); setMenu(null) } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}>Delete</button></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>
}
