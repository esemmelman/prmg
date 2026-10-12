import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'

const clean = html => DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p','div','br','b','strong','i','em','u','s','ul','ol','li','blockquote','h2','h3'], ALLOWED_ATTR: [] })
function entryHtml(content) {
  try { const value = JSON.parse(content); if (value.format === 'richtext') return clean(value.html) } catch { /* Existing plain-text entries. */ }
  const node = document.createElement('div'); node.textContent = content; return node.innerHTML.replace(/\n/g,'<br>')
}
function plain(html) { const node = document.createElement('div'); node.innerHTML = clean(html); return node.textContent.trim() }

export function ProjectLog({ data, projectId, search, onCreate, onDelete, kind = 'log' }) {
  const pages = kind === 'pages'
  const category = pages ? 'Project pages' : 'Project log'
  const [title, setTitle] = useState('')
  const editorRef = useRef(null)
  const addRef = useRef(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editing, setEditing] = useState(null)
  const [hasText, setHasText] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!showEditor) return
    editorRef.current.innerHTML = editing ? entryHtml(editing.content) : ''
    editorRef.current.focus()
  }, [showEditor, editing])
  const entries = data.documents.filter(entry => entry.category === category && entry.project_id === projectId && `${entry.title} ${plain(entryHtml(entry.content))}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))
  function reset() { setShowEditor(false); setEditing(null); setTitle(''); setHasText(false); setError(''); addRef.current?.focus() }
  function format(command) { editorRef.current.focus(); document.execCommand('styleWithCSS', false, false); document.execCommand(command); setHasText(!!plain(editorRef.current.innerHTML)) }
  return <section className="project-log" aria-label={pages ? 'Project pages' : 'Project log'}>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!entries.length && <p className="muted">{pages ? 'No pages for this project.' : 'No log entries for this project.'}</p>}
    {entries.map(entry => <article className="log-entry" key={entry.id}><div className="log-entry-header">{pages && <h2 className="topic-title">{entry.title}</h2>}<time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time><div className="log-entry-actions"><button className="text-link" disabled={busy} onClick={() => {
      setEditing(entry); setTitle(entry.title); setShowEditor(true); setError(''); setHasText(!!plain(entryHtml(entry.content)))
    }}>Edit</button><button className="text-link danger-text" disabled={busy} onClick={async () => {
      if (!window.confirm(pages ? 'Delete this page?' : 'Delete this log entry?')) return
      setBusy(true); setError('')
      try { await onDelete('documents',entry); if (editing?.id === entry.id) reset() } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}>Delete</button></div></div><div className="log-entry-content" dangerouslySetInnerHTML={{__html:entryHtml(entry.content)}}/></article>)}
    <button ref={addRef} className="button secondary small log-add" disabled={busy || showEditor} onClick={() => { setEditing(null); setTitle(''); setHasText(false); setError(''); setShowEditor(true) }}>Add</button>
    {showEditor && <form onSubmit={async event => {
      event.preventDefault(); if (busy) return
      const html = clean(editorRef.current.innerHTML), text = plain(html)
      if (!text) { setError(pages ? 'Enter some text for this page.' : 'Enter some text for this log entry.'); return }
      const content = JSON.stringify({format:'richtext',html})
      if (content.length > 200000) { setError('This entry is too long. Shorten it before saving.'); return }
      setBusy(true); setError('')
      try { await onCreate('documents', { project_id: projectId, title: pages ? title.trim() : text.slice(0,240), content, category, pinned: false }, editing); reset() } catch (err) { setError(err.message) } finally { setBusy(false) }
    }}>
      {pages && <label className="field page-title-field"><span>Topic</span><input aria-label="Topic" required maxLength={240} value={title} onChange={event => setTitle(event.target.value)} disabled={busy}/></label>}
      <span className="log-editor-label" id="log-editor-label">{pages ? 'Page content' : editing ? 'Edit log entry' : 'New log entry'}</span>
      <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">{[['bold','Bold','B'],['italic','Italic','I'],['underline','Underline','U'],['insertUnorderedList','Bulleted list','• List'],['insertOrderedList','Numbered list','1. List'],['removeFormat','Clear formatting','Clear']].map(([command,label,text]) => <button type="button" key={command} aria-label={label} title={label} disabled={busy} onMouseDown={event => event.preventDefault()} onClick={() => format(command)}>{text}</button>)}</div>
      <div ref={editorRef} className="rich-text-editor" role="textbox" aria-labelledby="log-editor-label" aria-multiline="true" contentEditable={!busy} suppressContentEditableWarning onInput={() => setHasText(!!plain(editorRef.current.innerHTML))} onPaste={event => {
        event.preventDefault(); const html = event.clipboardData.getData('text/html')
        if (html) document.execCommand('insertHTML',false,clean(html))
        else document.execCommand('insertText',false,event.clipboardData.getData('text/plain'))
        setHasText(!!plain(editorRef.current.innerHTML))
      }}/>
      <div className="log-editor-actions"><button className="button primary" disabled={busy || !hasText || pages && !title.trim()}>{busy ? 'Saving…' : pages ? editing ? 'Save page' : 'Add page' : editing ? 'Save entry' : 'Add entry'}</button><button type="button" className="button secondary" disabled={busy} onClick={reset}>Cancel</button></div>
    </form>}

  </section>
}
