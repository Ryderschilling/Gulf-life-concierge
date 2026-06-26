'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface ContextFile {
  id: string; name: string; description: string | null; content: string; is_active: boolean; sort_order: number
}
interface Props { files: ContextFile[]; onUpdate: (files: ContextFile[]) => void }

export default function BrainFiles({ files, onUpdate }: Props) {
  const [selected, setSelected] = useState<ContextFile | null>(files[0] ?? null)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiEditing, setAiEditing] = useState(false)

  function startEdit(file: ContextFile) {
    setSelected(file); setEditing(true)
    setEditContent(file.content); setEditName(file.name); setEditDesc(file.description ?? '')
  }

  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/ai/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, name: editName, description: editDesc, content: editContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpdate(files.map(f => f.id === selected.id ? data.file : f))
      setSelected(data.file); setEditing(false)
      toast.success('Saved')
    } catch (err) { toast.error((err as Error).message) } finally { setSaving(false) }
  }

  async function toggleActive(file: ContextFile) {
    const res = await fetch('/api/ai/context', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: file.id, is_active: !file.is_active }),
    })
    const data = await res.json()
    if (res.ok) onUpdate(files.map(f => f.id === file.id ? data.file : f))
  }

  async function deleteFile(id: string) {
    if (!confirm('Delete this brain file?')) return
    const res = await fetch(`/api/ai/context?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      onUpdate(files.filter(f => f.id !== id))
      if (selected?.id === id) setSelected(files.find(f => f.id !== id) ?? null)
    }
  }

  async function addFile() {
    if (!newName.trim()) return
    const res = await fetch('/api/ai/context', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc, content: '', sort_order: files.length }),
    })
    const data = await res.json()
    if (res.ok) {
      onUpdate([...files, data.file])
      setSelected(data.file); setShowAddForm(false); setNewName(''); setNewDesc('')
      startEdit(data.file)
      toast.success('File created')
    }
  }

  async function editWithAI() {
    if (!aiPrompt.trim() || !selected) return
    setAiEditing(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are editing a brain file called "${selected.name}". Here is the current content:\n\n${editContent}\n\n---\nInstruction: ${aiPrompt}\n\nReturn ONLY the updated file content (no explanation, no markdown code blocks, just the raw content).`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditContent(data.reply)
      setAiPrompt('')
      toast.success('AI updated the file — review and save')
    } catch (err) { toast.error((err as Error).message) } finally { setAiEditing(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', height: 'calc(100vh - 220px)', minHeight: '500px' }}>
      {/* File list */}
      <div style={{ background: '#ffffff', border: '1px solid #1f1f1f', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Knowledge Files</span>
          <button onClick={() => setShowAddForm(true)} style={{ fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer', color: '#a3a3a3', lineHeight: 1 }}>+</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {showAddForm && (
            <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '8px' }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="File name" style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #e5e5e5', borderRadius: '6px', marginBottom: '6px', boxSizing: 'border-box', outline: 'none' }} />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #e5e5e5', borderRadius: '6px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={addFile} style={{ flex: 1, padding: '5px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>Create</button>
                <button onClick={() => setShowAddForm(false)} style={{ padding: '5px 8px', background: 'none', border: '1px solid #e5e5e5', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', color: '#737373' }}>✕</button>
              </div>
            </div>
          )}
          {files.map(file => (
            <div key={file.id} onClick={() => { setSelected(file); setEditing(false) }}
              style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '2px', cursor: 'pointer', background: selected?.id === file.id ? '#f5f5f5' : 'transparent', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '9px', width: '7px', height: '7px', borderRadius: '50%', background: file.is_active ? '#0a0a0a' : '#e5e5e5', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', fontWeight: selected?.id === file.id ? 600 : 400, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                </div>
                {file.description && <p style={{ fontSize: '11px', color: '#a3a3a3', margin: '2px 0 0 13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <div style={{ background: '#ffffff', border: '1px solid #1f1f1f', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* File header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              {editing ? (
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: '15px', fontWeight: 600, border: 'none', outline: 'none', color: '#0a0a0a', width: '100%' }} />
              ) : (
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0a0a0a', margin: 0 }}>{selected.name}</h2>
              )}
              <p style={{ fontSize: '12px', color: '#a3a3a3', margin: '2px 0 0' }}>
                {selected.is_active ? '● Active — AI reads this' : '○ Inactive — AI ignores this'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => toggleActive(selected)} style={{ padding: '5px 10px', fontSize: '12px', border: '1px solid #e5e5e5', borderRadius: '6px', background: 'none', cursor: 'pointer', color: '#737373' }}>
                {selected.is_active ? 'Disable' : 'Enable'}
              </button>
              {!editing ? (
                <button onClick={() => startEdit(selected)} style={{ padding: '5px 12px', fontSize: '12px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
              ) : (
                <>
                  <button onClick={() => setEditing(false)} style={{ padding: '5px 10px', fontSize: '12px', border: '1px solid #e5e5e5', borderRadius: '6px', background: 'none', cursor: 'pointer', color: '#737373' }}>Cancel</button>
                  <button onClick={saveEdit} disabled={saving} style={{ padding: '5px 12px', fontSize: '12px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
              <button onClick={() => deleteFile(selected.id)} style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #e5e5e5', borderRadius: '6px', background: 'none', cursor: 'pointer', color: '#a3a3a3' }}>✕</button>
            </div>
          </div>

          {/* AI edit bar */}
          {editing && (
            <div style={{ padding: '10px 18px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: '8px', background: '#fafafa' }}>
              <input
                value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                placeholder="Tell AI to update this file... (e.g. 'Add info about our pet policy')"
                onKeyDown={e => { if (e.key === 'Enter') editWithAI() }}
                style={{ flex: 1, padding: '7px 10px', fontSize: '12px', border: '1px solid #e5e5e5', borderRadius: '6px', outline: 'none' }}
              />
              <button onClick={editWithAI} disabled={aiEditing || !aiPrompt.trim()} style={{ padding: '7px 12px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: !aiPrompt.trim() ? 0.4 : 1 }}>
                {aiEditing ? 'Editing...' : '✨ Edit with AI'}
              </button>
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {editing ? (
              <textarea
                value={editContent} onChange={e => setEditContent(e.target.value)}
                style={{ width: '100%', height: '100%', padding: '18px', fontSize: '13px', border: 'none', outline: 'none', resize: 'none', fontFamily: 'ui-monospace, monospace', lineHeight: 1.7, boxSizing: 'border-box', color: '#0a0a0a' }}
              />
            ) : (
              <div style={{ padding: '18px', height: '100%', overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '13px', fontFamily: 'ui-monospace, monospace', lineHeight: 1.7, color: '#0a0a0a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selected.content || <span style={{ color: '#a3a3a3' }}>Empty file — click Edit to add content.</span>}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #1f1f1f', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a3a3a3', fontSize: '14px' }}>
          Select a file to view or edit
        </div>
      )}
    </div>
  )
}
