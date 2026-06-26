'use client'

// REPLACES: components/leads/LeadKanban.tsx
// Changes from Phase 1:
//   - Passes last_activity + activity_count to LeadCard
//   - Logs stage_change activity via API on drag-and-drop (auto, no manual entry)
//   - useEffect syncs initialLeads prop after router.refresh()

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus, LeadActivity } from '@/lib/types'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/lib/types'
import LeadCard from './LeadCard'
import toast from 'react-hot-toast'

interface LeadWithActivity extends Lead {
  last_activity?: LeadActivity | null
  activity_count?: number
}

interface Props {
  initialLeads: Lead[]
}

const COLUMN_COLORS: Record<LeadStatus, string> = {
  new: '#6b7280',
  contacted: '#3b82f6',
  nurturing: '#8b5cf6',
  proposal: '#f59e0b',
  closed_won: '#22c55e',
  closed_lost: '#ef4444',
}

export default function LeadKanban({ initialLeads }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [leads, setLeads] = useState<LeadWithActivity[]>(initialLeads)
  const [activities, setActivities] = useState<Record<string, LeadActivity | null>>({})
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<LeadStatus | null>(null)

  // Sync when parent refreshes
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  // Fetch last activity for all leads once mounted
  useEffect(() => {
    if (leads.length === 0) return
    fetchActivities(leads.map(l => l.id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchActivities(leadIds: string[]) {
    if (leadIds.length === 0) return

    // Get the latest activity per lead
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })

    if (!data) return

    const latestMap: Record<string, LeadActivity> = {}
    const countMap: Record<string, number> = {}

    for (const act of data) {
      countMap[act.lead_id] = (countMap[act.lead_id] ?? 0) + 1
      if (!latestMap[act.lead_id]) {
        latestMap[act.lead_id] = act as LeadActivity
      }
    }

    setActivities(latestMap)
    setActivityCounts(countMap)
  }

  // Build columns
  const columns = LEAD_STATUSES.map(status => ({
    status,
    leads: leads.filter(l => l.status === status),
  }))

  // ── Drag handlers ──────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggingId(leadId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('leadId', leadId)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverCol(null)
  }

  function handleDragOver(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(status)
  }

  async function handleDrop(e: React.DragEvent, newStatus: LeadStatus) {
    e.preventDefault()
    setDragOverCol(null)

    const leadId = e.dataTransfer.getData('leadId')
    if (!leadId) return

    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStatus) {
      setDraggingId(null)
      return
    }

    const prevStatus = lead.status

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    setDraggingId(null)

    try {
      // Update lead in DB
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId)

      if (error) throw error

      // Log stage_change activity automatically — no manual entry needed
      const description = `Moved from ${LEAD_STATUS_LABELS[prevStatus]} → ${LEAD_STATUS_LABELS[newStatus]}`
      const res = await fetch(`/api/leads/${leadId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'stage_change',
          description,
          metadata: { from: prevStatus, to: newStatus },
        }),
      })

      if (res.ok) {
        const { activity } = await res.json()
        // Update activity display on the card
        setActivities(prev => ({ ...prev, [leadId]: activity }))
        setActivityCounts(prev => ({ ...prev, [leadId]: (prev[leadId] ?? 0) + 1 }))
      }

      router.refresh()
    } catch {
      // Rollback
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: prevStatus } : l))
      toast.error('Failed to move lead')
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      overflowX: 'auto',
      padding: '0 0 16px',
      alignItems: 'flex-start',
    }}>
      {columns.map(({ status, leads: colLeads }) => (
        <div
          key={status}
          onDragOver={e => handleDragOver(e, status)}
          onDrop={e => handleDrop(e, status)}
          style={{
            minWidth: '220px',
            width: '220px',
            flexShrink: 0,
            background: dragOverCol === status ? 'rgba(212,168,67,0.05)' : '#f8f6f0',
            border: `1px solid ${dragOverCol === status ? '#d4a843' : '#e5e0d3'}`,
            borderRadius: '10px',
            padding: '12px',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          {/* Column header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLUMN_COLORS[status], flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a2f5a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {LEAD_STATUS_LABELS[status]}
              </span>
            </div>
            {colLeads.length > 0 && (
              <span style={{ fontSize: '11px', color: '#9ca3af', background: '#ffffff', border: '1px solid #e5e0d3', borderRadius: '10px', padding: '1px 7px' }}>
                {colLeads.length}
              </span>
            )}
          </div>

          {/* Cards */}
          <div style={{ minHeight: '48px' }}>
            {colLeads.map(lead => (
              <div
                key={lead.id}
                style={{ opacity: draggingId === lead.id ? 0.4 : 1, transition: 'opacity 0.15s' }}
              >
                <LeadCard
                  lead={{
                    ...lead,
                    last_activity: activities[lead.id] ?? null,
                    activity_count: activityCounts[lead.id] ?? 0,
                  }}
                  draggable
                  onDragStart={e => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                />
              </div>
            ))}
            {colLeads.length === 0 && (
              <div style={{
                padding: '16px 0',
                textAlign: 'center',
                fontSize: '11px',
                color: '#d1d5db',
                borderRadius: '6px',
                border: '1px dashed #e5e0d3',
              }}>
                Drop here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
