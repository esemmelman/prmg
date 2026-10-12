import { useRef, useState } from 'react'

function safeUrl(value) {
  try { const url = new URL(value.trim()); return ['http:','https:'].includes(url.protocol) ? url.href : null } catch { return null }
}

export function ProjectLinks({ data, projectId, search, onSave, onDelete }) {
  const [showEditor, setShowEditor] = useState(false)
  const [editing, setEditing] = useState(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const addRef = useRef(null)
  const links = data.documents.filter(link => link.category === 'Project links' && link.project_id === projectId && `${link.title} ${link.content}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
  function close() { setShowEditor(false); setEditing(null); setTitle(''); setUrl(''); setError(''); addRef.current?.focus() }
  return <section className="project-links" aria-label="Project links">
    {error && <p className="form-error" role="alert">{error}</p>}
    {!links.length && <p className="muted">No links for this project.</p>}
    {links.map(link => <article className="project-link" key={link.id}><div className="project-link-main">{safeUrl(link.content) ? <a href={safeUrl(link.content)} target="_blank" rel="noopener noreferrer">{link.title}</a> : <strong>{link.title}</strong>}</div><div className="log-entry-actions"><button className="text-link" disabled={busy} onClick={() => { setEditing(link); setTitle(link.title); setUrl(link.content); setError(''); setShowEditor(true) }}>Edit</button><button className="text-link danger-text" disabled={busy} onClick={async () => {
      if (!window.confirm('Delete this link?')) return
      setBusy(true); setError('')
      try { await onDelete('documents',link); if (editing?.id === link.id) close() } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}>Delete</button></div></article>)}
    <button ref={addRef} className="button secondary small log-add" disabled={busy || showEditor} onClick={() => { setEditing(null); setTitle(''); setUrl(''); setError(''); setShowEditor(true) }}>Add</button>
    {showEditor && <form className="link-editor" onSubmit={async event => {
      event.preventDefault(); if (busy) return
      const normalized = safeUrl(url)
      if (!normalized) { setError('Enter a complete http:// or https:// URL.'); return }
      if (!title.trim()) { setError('Enter a name for this link.'); return }
      setBusy(true); setError('')
      try { await onSave('documents',{project_id:projectId,title:title.trim(),content:normalized,category:'Project links',pinned:false},editing); close() } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}><label className="field"><span>Name</span><input aria-label="Link name" autoFocus required maxLength={240} value={title} disabled={busy} onChange={event => setTitle(event.target.value)}/></label><label className="field"><span>URL</span><input aria-label="URL" required maxLength={200000} value={url} disabled={busy} onChange={event => setUrl(event.target.value)}/></label><div className="log-editor-actions"><button className="button primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save link' : 'Add link'}</button><button type="button" className="button secondary" disabled={busy} onClick={close}>Cancel</button></div></form>}
  </section>
}
