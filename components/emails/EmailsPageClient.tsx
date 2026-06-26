'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailDraft } from '@/lib/types'
import toast from 'react-hot-toast'

interface Props {
  pendingDrafts: EmailDraft[]
  sentDrafts: EmailDraft[]
  focusLeadId: string | null
  initialTab: 'pending' | 'sent'
}

export default function EmailsPageClient({
  pendingDrafts: initialPending,
  sentDrafts,
  focusLeadId,
  initialTab,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'pending' | 'sent'>(initialTab)
  const [pending, setPending] = useState<EmailDraft[]>(initialPending)
  const focusRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to the focused lead's draft
  useEffect(() => {
    if (focusLeadId && focusRef.current) {
      setTimeout(() => focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [focusLeadId])

  function handleSent(draftId: string) {
    setPending(prev => prev.filter(d => d.id !== draftId))
    router.refresh()
  }

  function handleDismissed(draftId: string) {
    setPending(prev => prev.filter(d => d.id !== draftId))
  }

  const draftsToShow = tab === 'pending' ? pending : sentDrafts

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '26px',
          fontFamily: 'Cormorant Garamond, serif',
          fontWeight: 700,
          color: '#1a2f5a',
          margin: '0 0 4px',
        }}>
          Emails
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          {pending.length > 0
            ? `${pending.length} draft${pending.length !== 1 ? 's' : ''} waiting to be reviewed and sent`
            : 'All caught up — no drafts pending'}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['pending', 'sent'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              borderRadius: '20px',
              border: `1px solid ${tab === t ? '#d4a843' : '#e5e0d3'}`,
              background: tab === t ? '#d4a843' : 'transparent',
              color: tab === t ? '#ffffff' : '#6b7280',
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === 'pending'
              ? `Drafts${pending.length > 0 ? ` (${pending.length})` : ''}`
              : 'Sent'}
          </button>
        ))}
      </div>

      {/* Draft list */}
      {draftsToShow.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#9ca3af',
          fontSize: '14px',
          background: '#f8f6f0',
          borderRadius: '12px',
          border: '1px solid #e5e0d3',
        }}>
          {tab === 'pending' ? 'No drafts waiting. You\'re all caught up.' : 'No sent emails yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {draftsToShow.map(draft => (
            <div
              key={draft.id}
              ref={draft.lead_id === focusLeadId ? focusRef : undefined}
            >
              <FullEmailDraftCard
                draft={draft}
                isFocused={draft.lead_id === focusLeadId}
                isSent={tab === 'sent'}
                onSent={handleSent}
                onDismissed={handleDismissed}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Full email draft card with inline editor
// ─────────────────────────────────────────────────────────────
function FullEmailDraftCard({
  draft,
  isFocused,
  isSent,
  onSent,
  onDismissed,
}: {
  draft: EmailDraft
  isFocused: boolean
  isSent: boolean
  onSent: (id: string) => void
  onDismissed: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(isFocused)
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const lead = draft.lead

  const triggerLabel: Record<string, string> = {
    follow_up_due: 'Follow-up due',
    stage_change: 'Stage change',
    manual: 'Manual',
    sequence: 'Sequence',
  }

  async function handleSend() {
    if (!draft.to_email) {
      toast.error('This lead has no email address')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id, subject, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      toast.success(`Email sent to ${lead?.name ?? draft.to_email}`)
      onSent(draft.id)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function handleDismiss() {
    setDismissing(true)
    try {
      const res = await fetch('/api/emails/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id }),
      })
      if (!res.ok) throw new Error('Failed to dismiss')
      onDismissed(draft.id)
    } catch {
      toast.error('Failed to dismiss')
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${isFocused ? '#d4a843' : '#e5e0d3'}`,
      borderRadius: '10px',
      overflow: 'hidden',
      boxShadow: isFocused ? '0 0 0 2px rgba(212,168,67,0.2)' : 'none',
    }}>
      {/* Card header */}
      <div
        onClick={() => { if (!isSent) setExpanded(e => !e) }}
        style={{
          padding: '14px 16px',
          cursor: isSent ? 'default' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          background: isSent ? '#fafaf9' : '#ffffff',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a2f5a' }}>
              {lead?.name ?? draft.to_name ?? draft.to_email}
            </span>
            {draft.to_email && (
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{draft.to_email}</span>
            )}
            {draft.trigger_type && (
              <span style={{
                fontSize: '10px',
                background: '#f0ede6',
                color: '#9ca3af',
                padding: '1px 7px',
                borderRadius: '10px',
              }}>
                {triggerLabel[draft.trigger_type] ?? draft.trigger_type}
              </span>
            )}
            {isSent && (
              <span style={{
                fontSize: '10px',
                background: '#dcfce7',
                color: '#16a34a',
                padding: '1px 7px',
                borderRadius: '10px',
                fontWeight: 600,
              }}>
                Sent
              </span>
            )}
          </div>
          <p style={{
            fontSize: '13px',
            color: '#4b5563',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {draft.subject}
          </p>
          {isSent && draft.sent_at && (
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>
              Sent {new Date(draft.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>

        {!isSent && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={handleSend}
              disabled={sending || !draft.to_email}
              title={!draft.to_email ? 'No email on file' : 'Send email'}
              style={{
                padding: '6px 14px',
                background: '#d4a843',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: (sending || !draft.to_email) ? 'not-allowed' : 'pointer',
                opacity: !draft.to_email ? 0.4 : 1,
              }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
            <span style={{ fontSize: '12px', color: '#9ca3af', padding: '6px 4px', cursor: 'pointer' }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        )}
      </div>

      {/* Expanded editor — only for pending drafts */}
      {expanded && !isSent && (
        <div style={{ borderTop: '1px solid #f0ede6', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', display: 'flex', gap: '8px' }}>
            <span>To:</span>
            <span style={{ color: '#4b5563' }}>{draft.to_email || '(no email on file)'}</span>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
              Subject
            </label>
            <input
              value={subject}
              onChange={e => { setSubject(e.target.value); setEditing(true) }}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid #e5e0d3',
                borderRadius: '6px',
                color: '#1a2f5a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Message
              </label>
              {draft.ai_generated && (
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>✨ AI draft</span>
              )}
            </div>
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setEditing(true) }}
              rows={8}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                border: '1px solid #e5e0d3',
                borderRadius: '6px',
                color: '#1a2f5a',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.7,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              style={{
                padding: '7px 14px',
                background: 'none',
                color: '#9ca3af',
                border: '1px solid #e5e0d3',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {dismissing ? 'Dismissing...' : 'Dismiss'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !draft.to_email}
              style={{
                padding: '8px 24px',
                background: '#d4a843',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: (sending || !draft.to_email) ? 'not-allowed' : 'pointer',
                opacity: !draft.to_email ? 0.4 : 1,
              }}
            >
              {sending ? 'Sending...' : editing ? 'Send edited email' : 'Send email'}
            </button>
          </div>
        </div>
      )}

      {/* Sent — read-only body preview */}
      {expanded && isSent && (
        <div style={{ borderTop: '1px solid #f0ede6', padding: '14px 16px', background: '#fafaf9' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px' }}>
            <strong style={{ color: '#4b5563' }}>Subject:</strong> {draft.subject}
          </p>
          <pre style={{
            fontSize: '13px',
            color: '#4b5563',
            margin: 0,
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            lineHeight: 1.7,
          }}>
            {draft.body}
          </pre>
        </div>
      )}
    </div>
  )
}
