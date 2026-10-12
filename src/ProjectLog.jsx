import { useState } from 'react'

export function ProjectLog({ data, projectId, search, onCreate, onDelete }) {
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const entries = data.documents.filter(entry => entry.category === 'Project log' && entry.project_id === projectId && entry.content.toLowerCase().includes(search.toLowerCase())).sort((a,b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))
  return <section className="project-log" aria-label="Project log">
    <form onSubmit={async event => {
      event.preventDefault(); if (!content.trim() || busy) return
      setBusy(true); setError('')
      try { await onCreate('documents', { project_id: projectId, title: content.trim().slice(0,240), content: content.trim(), category: 'Project log', pinned: false }); setContent('') } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}><label className="field"><span>New log entry</span><textarea aria-label="New log entry" required maxLength={200000} rows={3} value={content} disabled={busy} onChange={event => setContent(event.target.value)}/></label><button className="button primary" disabled={busy || !content.trim()}>{busy ? 'Saving…' : 'Add entry'}</button></form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!entries.length && <p className="muted">No log entries for this project.</p>}
    {entries.map(entry => <article className="log-entry" key={entry.id}><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time><p>{entry.content}</p><button className="text-link danger-text" disabled={busy} onClick={async () => {
      if (!window.confirm('Delete this log entry?')) return
      setBusy(true); setError('')
      try { await onDelete('documents',entry) } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}>Delete entry</button></article>)}
  </section>
}
