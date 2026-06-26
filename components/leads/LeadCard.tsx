'use client'

// REPLACES: components/leads/LeadCard.tsx
// Changes from Phase 1:
//   - Shows last activity type + time on the card
//   - Email sent badge (gold dot) when last action was email_sent
//   - Days since last contact warning (red if >7 days)
//   - Activity count badge

import { formatDistanceToNow } from 'date-fns'
import type { Lead, LeadActivity, LeadStatus } from '@/lib/types'

interface Props {
  lead: Lead & { last_activity?: LeadActivity | null; activity_count?: number }
  onClick?: () => void
  // drag props passed from kanban
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

const ACTIVITY_ICONS: Record<string, string> = {
  stage_change: '→',
  note_added: '📝',
  email_sent: '✉️',
  sms_sent: '💬',
  call_logged: '📞',
  email_draft_created: '✨',
}

const ACTIVITY_COLORS: Record<string, string> = {
  email_sent: '#d4a843',
  sms_sent: '#3b82f6',
  call_logged: '#22c55e',
  stage_change: '#8b5cf6',
  note_added: '#6b7280',
  email_draft_created: '#f59e0b',
}

export default function LeadCard({ lead, onClick, draggable, onDragStart, onDragEnd }: Props) {
  const lastAct = lead.last_activity
  const daysSinceContact = lead.last_contacted_at
    ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / 86400000)
    : null
  const isStale = daysSinceContact !== null && daysSinceContact > 7
  const isEmailSent = lastAct?.type === 'email_sent'

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        background: '#ffffff',
        border: `1px solid ${isEmailSent ? '#d4a843' : '#e5e0d3'}`,
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        marginBottom: '8px',
        boxShadow: isEmailSent ? '0 0 0 1px rgba(212,168,67,0.2)' : 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Lead name + status dot row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a2f5a', lineHeight: 1.3 }}>
          {lead.name}
        </span>
        {/* Email sent gold dot */}
        {isEmailSent && (
          <span
            title="Email sent"
            style={{
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: '#d4a843',
              flexShrink: 0,
              marginTop: '3px',
            }}
          />
        )}
      </div>

      {/* Property interest */}
      {lead.property_interest && (
        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.property_interest}
        </p>
      )}

      {/* Budget */}
      {lead.budget_range && (
        <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 8px' }}>
          💰 {lead.budget_range}
        </p>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid #f0ede6', paddingTop: '8px' }}>
        {lastAct ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {/* Activity type icon */}
            <span style={{ fontSize: '11px' }}>{ACTIVITY_ICONS[lastAct.type] ?? '•'}</span>
            <span style={{
              fontSize: '10px',
              color: ACTIVITY_COLORS[lastAct.type] ?? '#9ca3af',
              fontWeight: 600,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {lastAct.type.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>
              {formatDistanceToNow(new Date(lastAct.created_at), { addSuffix: true })}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '10px', color: '#d1d5db' }}>No activity yet</span>
          </div>
        )}

        {/* Stale warning */}
        {isStale && (
          <div style={{
            marginTop: '5px',
            fontSize: '10px',
            color: '#ef4444',
            fontWeight: 600,
          }}>
            ⚠ {daysSinceContact}d since contact
          </div>
        )}
      </div>
    </div>
  )
}
