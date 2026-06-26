'use client'

import { useState } from 'react'
import type { EmailDraft } from '@/lib/types'
import toast from 'react-hot-toast'

interface Props { draft: EmailDraft; onSent: (id: string) => void; onDismissed: (id: string) => void }

export default function EmailDraftCard({ draft, onSent, onDismissed }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [sending, setSending] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  // Track if rep edited the draft
  const wasEdited = subject !== draft.subject || body !== draft.body

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id, subject, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`Sent to ${draft.lead?.name ?? draft.to_email}`)
      onSent(draft.id)

      // If draft was edited, trigger learning in the background
      if (wasEdited) {
        fetch('/api/ai/learn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_id: draft.id }),
        }).catch(() => {}) // silent — learning is non-blocking
      }
    } catch (err) { toast.error((err as Error).message) } finally { setSending(false) }
  }

  async function handleDismiss() {
    setDismissing(true)
    try {
      const res = await fetch('/api/emails/dismiss', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id }),
      })
      if (!res.ok) throw new Error('Failed')
      onDismissed(draft.id)
    } catch { toast.error('Failed to dismiss') } finally { setDismissing(false) }
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #1f1f1f', borderRadius: '12px', overflow: 'hidden' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a' }}>{draft.lead?.name ?? draft.to_name ?? draft.to_email}</span>
            <span style={{ fontSize: '10px', background: '#f5f5f5', color: '#737373', padding: '1px 7px', borderRadius: '10px' }}>AI draft</span>
          </div>
          <p style={{ fontSize: '13px', color: '#737373', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={handleSend} disabled={sending || !draft.to_email} title={!draft.to_email ? 'No email on file' : 'Send'} style={{ padding: '6px 14px', background: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: (sending || !draft.to_email) ? 'not-allowed' : 'pointer', opacity: !draft.to_email ? 0.4 : 1 }}>
            {sending ? 'Sending...' : 'Send'}
          </button>
          <span style={{ fontSize: '12px', color: '#a3a3a3', padding: '6px 4px', cursor: 'pointer' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #f5f5f5', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '10px' }}>
            To: <span style={{ color: '#0a0a0a' }}>{draft.to_email || '(no email on file)'}</span>
            {wasEdited && <span style={{ marginLeft: '10px', color: '#737373', fontStyle: 'italic' }}>· edited — AI will learn from your changes</span>}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #e5e5e5', borderRadius: '6px', color: '#0a0a0a', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} style={{ width: '100%', padding: '10px', fontSize: '13px', border: '1px solid #e5e5e5', borderRadius: '6px', color: '#0a0a0a', outline: 'none', resize: 'vertical', lineHeight: 1.7, boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <button onClick={handleDismiss} disabled={dismissing} style={{ padding: '7px 14px', background: 'none', color: '#a3a3a3', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              {dismissing ? 'Dismissing...' : 'Dismiss'}
            </button>
            <button onClick={handleSend} disabled={sending || !draft.to_email} style={{ padding: '8px 24px', background: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: (sending || !draft.to_email) ? 'not-allowed' : 'pointer', opacity: !draft.to_email ? 0.4 : 1 }}>
              {sending ? 'Sending...' : wasEdited ? 'Send edited email' : 'Send email'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
