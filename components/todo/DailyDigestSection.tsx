'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DailyDigest, PriorityLead } from '@/lib/types'
import toast from 'react-hot-toast'

const SESSION_KEY = 'crm_actioned_leads'

function loadActionedLeads(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveActionedLeads(ids: Set<string>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

interface Props {
  digest: DailyDigest | null
  loading: boolean
  onLoad: () => void
  onRefresh: () => void
  onTodosCreated?: () => void
}

const URGENCY_COLORS = {
  high: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', text: 'High' },
  medium: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', text: 'Medium' },
  low: { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e', text: 'Low' },
}

export default function DailyDigestSection({ digest, loading, onLoad, onRefresh, onTodosCreated }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(!!digest)
  const [addingToList, setAddingToList] = useState(false)
  const [addedToList, setAddedToList] = useState(false)
  const [actionedLeadIds, setActionedLeadIds] = useState<Set<string>>(() => loadActionedLeads())

  function markLeadActioned(id: string) {
    setActionedLeadIds(prev => {
      const next = new Set([...prev, id])
      saveActionedLeads(next)
      return next
    })
  }

  async function handleLoad() {
    setHasLoaded(true)
    await onLoad()
  }

  async function handleAddAllToList() {
    if (!digest) return
    setAddingToList(true)
    try {
      const items = digest.content.action_items ?? []
      const leads = digest.content.priority_leads ?? []

      const allTodos = [
        // Action items → manual todos
        ...items.map((item, i) => ({
          title: item,
          type: 'digest_action' as const,
          sort_order: i,
        })),
        // Priority leads with "email" suggested action → email_task todos
        ...leads
          .filter(l => l.suggested_action?.toLowerCase().includes('email'))
          .map((l, i) => ({
            title: `Email ${l.lead_name}`,
            description: l.reason,
            type: 'email_task' as const,
            linked_lead_id: l.lead_id,
            sort_order: items.length + i,
          })),
        // Priority leads with "call" suggested action → follow_up_task
        ...leads
          .filter(l => !l.suggested_action?.toLowerCase().includes('email'))
          .map((l, i) => ({
            title: `${l.suggested_action}: ${l.lead_name}`,
            description: l.reason,
            type: 'follow_up_task' as const,
            linked_lead_id: l.lead_id,
            sort_order: items.length + leads.length + i,
          })),
      ]

      // Batch create todos
      await Promise.all(
        allTodos.map(todo =>
          fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todo),
          })
        )
      )

      setAddedToList(true)
      toast.success(`${allTodos.length} items added to your list`)
      onTodosCreated?.()
    } catch {
      toast.error('Failed to add items to list')
    } finally {
      setAddingToList(false)
    }
  }

  return (
    <section style={{ marginBottom: '28px' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>☀️</span>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a2f5a', margin: 0 }}>
            Daily Briefing
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {digest && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Regenerate briefing"
              style={{
                fontSize: '11px',
                color: '#9ca3af',
                background: 'none',
                border: '1px solid #e5e0d3',
                borderRadius: '4px',
                padding: '3px 8px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Regenerating...' : '↻ Refresh'}
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Not yet loaded */}
          {!hasLoaded && !digest && (
            <div style={{
              background: '#f8f6f0',
              border: '1px solid #e5e0d3',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px' }}>
                Your AI briefing for today hasn&apos;t been generated yet.
              </p>
              <button
                onClick={handleLoad}
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  background: '#d4a843',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Generating briefing...' : 'Generate briefing'}
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && !digest && (
            <div style={{
              background: '#f8f6f0',
              border: '1px solid #e5e0d3',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '13px',
            }}>
              Generating your briefing...
            </div>
          )}

          {/* Digest content */}
          {digest && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e5e0d3',
              borderRadius: '10px',
              overflow: 'hidden',
            }}>
              {/* Greeting + summary */}
              <div style={{
                background: 'linear-gradient(135deg, #1a2f5a 0%, #243d6e 100%)',
                padding: '16px 18px',
              }}>
                <p style={{ color: '#e8c06a', fontSize: '13px', margin: '0 0 4px', fontWeight: 500 }}>
                  {digest.content.greeting}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                  {digest.content.summary}
                </p>
              </div>

              {/* Action items — now with "Add all to list" */}
              {digest.content.action_items?.length > 0 && (
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #f0ede6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      Action items
                    </p>
                    {!addedToList && (
                      <button
                        onClick={handleAddAllToList}
                        disabled={addingToList}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#ffffff',
                          background: '#d4a843',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 10px',
                          cursor: addingToList ? 'not-allowed' : 'pointer',
                          opacity: addingToList ? 0.7 : 1,
                        }}
                      >
                        {addingToList ? 'Adding...' : '+ Add all to list'}
                      </button>
                    )}
                    {addedToList && (
                      <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>✓ Added to list</span>
                    )}
                  </div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {digest.content.action_items.map((item, i) => (
                      <li key={i} style={{ fontSize: '13px', color: '#4b5563' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Priority leads */}
              {digest.content.priority_leads?.length > 0 && (
                <div style={{ padding: '12px 18px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                    Priority leads today
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {digest.content.priority_leads.map(lead => (
                      <PriorityLeadRow
                        key={lead.lead_id}
                        lead={lead}
                        isActioned={actionedLeadIds.has(lead.lead_id)}
                        onActioned={markLeadActioned}
                      />
                    ))}
                  </div>
                  {actionedLeadIds.size > 0 && actionedLeadIds.size === digest.content.priority_leads.length && (
                    <p style={{ fontSize: '12px', color: '#22c55e', textAlign: 'center', margin: '12px 0 0', fontWeight: 600 }}>
                      ✓ All leads actioned today
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function PriorityLeadRow({ lead, isActioned, onActioned }: { lead: PriorityLead; isActioned?: boolean; onActioned?: (leadId: string) => void }) {
  const router = useRouter()
  const urgency = URGENCY_COLORS[lead.urgency]
  const [expanded, setExpanded] = useState(false)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const isEmailAction = lead.suggested_action?.toLowerCase().includes('email')

  async function handleAction() {
    onActioned?.(lead.lead_id)
    if (isEmailAction) {
      // Create the draft first, then navigate — so the emails page always has something to show
      setCreatingDraft(true)
      try {
        await fetch('/api/emails/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: lead.lead_id, trigger_type: 'manual' }),
        })
      } catch {
        // Best-effort — navigate regardless so user isn't blocked
      } finally {
        setCreatingDraft(false)
      }
      router.push(`/crm/emails?lead_id=${lead.lead_id}`)
    } else {
      router.push(`/crm/leads/${lead.lead_id}`)
    }
  }

  return (
    <div style={{
      background: urgency.bg,
      border: `1px solid ${urgency.border}`,
      borderRadius: '8px',
      padding: '10px 12px',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: urgency.dot, flexShrink: 0, display: 'inline-block',
              }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a2f5a' }}>
                {lead.lead_name}
              </span>
              <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'capitalize' }}>
                {lead.current_status}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0 16px' }}>
              {lead.reason}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
            {isActioned ? (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                background: '#22c55e',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: '10px',
              }}>
                ✓ Done
              </span>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); handleAction() }}
                disabled={creatingDraft}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  background: isEmailAction ? '#0a0a0a' : urgency.dot,
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: creatingDraft ? 'not-allowed' : 'pointer',
                  opacity: creatingDraft ? 0.6 : 1,
                }}
              >
                {creatingDraft ? 'Drafting...' : lead.suggested_action}
              </button>
            )}
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: `1px solid ${urgency.border}`,
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
            Suggested message
          </p>
          <p style={{
            fontSize: '13px', color: '#374151', margin: 0,
            background: 'rgba(255,255,255,0.6)', padding: '8px 10px',
            borderRadius: '6px', lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            &ldquo;{lead.suggested_message}&rdquo;
          </p>
          {(lead.lead_phone || lead.lead_email) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {lead.lead_phone && (
                <a
                  href={`tel:${lead.lead_phone}`}
                  style={{
                    fontSize: '12px', color: '#1a2f5a',
                    textDecoration: 'none', background: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px',
                    padding: '3px 10px',
                  }}
                >
                  📞 {lead.lead_phone}
                </a>
              )}
              {lead.lead_email && (
                <a
                  href={`mailto:${lead.lead_email}`}
                  style={{
                    fontSize: '12px', color: '#1a2f5a',
                    textDecoration: 'none', background: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px',
                    padding: '3px 10px',
                  }}
                >
                  ✉️ {lead.lead_email}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
