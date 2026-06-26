'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { timeAgo } from '@/lib/utils'

interface Memory {
  id: string; type: string; title: string; content: string; lead_id: string | null; source: string | null; created_at: string; lead?: { name: string } | null
}
interface Props { memories: Memory[]; onUpdate: (memories: Memory[]) => void }

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  style_correction: { label: 'Style', color: '#737373' },
  lead_fact: { label: 'Lead fact', color: '#0a0a0a' },
  company_knowledge: { label: 'Company', color: '#525252' },
  pattern: { label: 'Pattern', color: '#262626' },
}

const MEMORY_TYPES = ['style_correction', 'lead_fact', 'company_knowledge', 'pattern']

export default function MemoryLog({ memories, onUpdate }: Props) {
  const [filter, setFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState('company_knowledge')
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = filter ? memories.filter(m => m.type === filter) : memories

  async function deleteMemory(id: string) {
    const res = await fetch(`/api/ai/memory?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      onUpdate(memories.filter(m => m.id !== id))
      toast.success('Memory removed')
    }
  }

  async function addMemory() {
    if (!newTitle.trim() || !newContent.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/ai/memory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, title: newTitle, content: newContent, source: 'manual' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpdate([data.memory, ...memories])
      setShowAdd(false); setNewTitle(''); setNewContent('')
      toast.success('Memory added')
    } catch (err) { toast.error((err as Error).message) } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setFilter(null)} style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '20px', border: `1px solid ${!filter ? '#0a0a0a' : '#e5e5e5'}`, background: !filter ? '#0a0a0a' : 'none', color: !filter ? '#fff' : '#737373', cursor: 'pointer' }}>All ({memories.length})</button>
          {MEMORY_TYPES.map(t => {
            const count = memories.filter(m => m.type === t).length
            if (count === 0) return null
            const cfg = TYPE_CONFIG[t]
            return (
              <button key={t} onClick={() => setFilter(t === filter ? null : t)} style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '20px', border: `1px solid ${filter === t ? '#0a0a0a' : '#e5e5e5'}`, background: filter === t ? '#0a0a0a' : 'none', color: filter === t ? '#fff' : '#737373', cursor: 'pointer' }}>
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>
        <button onClick={() => setShowAdd(s => !s)} style={{ padding: '7px 14px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          + Add memory
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#ffffff', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)} style={{ width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #e5e5e5', borderRadius: '6px', outline: 'none' }}>
                  {MEMORY_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Short label..." style={{ width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #e5e5e5', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Content</label>
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={3} placeholder="What should the AI know or do differently?" style={{ width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #e5e5e5', borderRadius: '6px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={addMemory} disabled={saving || !newTitle.trim() || !newContent.trim()} style={{ padding: '7px 16px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save memory'}
              </button>
              <button onClick={() => setShowAdd(false)} style={{ padding: '7px 12px', background: 'none', border: '1px solid #e5e5e5', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', color: '#737373' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#a3a3a3', fontSize: '14px' }}>
            {filter ? `No ${TYPE_CONFIG[filter]?.label} memories yet.` : 'No memories yet. The AI will start learning as you use the CRM.'}
          </div>
        )}
        {filtered.map(mem => {
          const cfg = TYPE_CONFIG[mem.type] ?? { label: mem.type, color: '#737373' }
          return (
            <div key={mem.id} style={{ background: '#ffffff', border: '1px solid #1f1f1f', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, background: '#f5f5f5', color: cfg.color, padding: '1px 7px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {cfg.label}
                    </span>
                    {mem.lead?.name && <span style={{ fontSize: '11px', color: '#a3a3a3' }}>re: {mem.lead.name}</span>}
                    {mem.source && <span style={{ fontSize: '11px', color: '#a3a3a3' }}>· {mem.source.replace('_', ' ')}</span>}
                    <span style={{ fontSize: '11px', color: '#a3a3a3', marginLeft: 'auto' }}>{timeAgo(mem.created_at)}</span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 2px' }}>{mem.title}</p>
                  <p style={{ fontSize: '13px', color: '#737373', margin: 0, lineHeight: 1.5 }}>{mem.content}</p>
                </div>
                <button onClick={() => deleteMemory(mem.id)} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>✕</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
