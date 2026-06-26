'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadNote, LeadActivity, LeadAddress, LeadStatus } from '@/lib/types'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/lib/types'
import { STATUS_CONFIG, formatDate, timeAgo } from '@/lib/utils'
import AddressManager from './AddressManager'
import toast from 'react-hot-toast'

interface Props {
  lead: Lead
  notes: LeadNote[]
  activities: LeadActivity[]
  addresses: LeadAddress[]
  twilioEnabled: boolean
}

const ACTIVITY_ICONS: Record<string, string> = {
  stage_change: '→', note_added: '📝', email_sent: '✉️',
  sms_sent: '💬', call_logged: '📞', email_draft_created: '✨',
}

const card: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '20px 22px',
}

export default function LeadDetailClient({ lead, notes: initialNotes, activities: initialActivities, addresses: initialAddresses, twilioEnabled }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [activities, setActivities] = useState(initialActivities)
  const [addresses, setAddresses] = useState(initialAddresses)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [movingStage, setMovingStage] = useState(false)
  const [loggingContact, setLoggingContact] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [smsBody, setSmsBody] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'addresses'>('overview')

  async function handleStageChange(newStatus: LeadStatus) {
    if (newStatus === status) return
    setMovingStage(true)
    try {
      await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id)
      const { data: act } = await supabase.from('lead_activities').insert({
        lead_id: lead.id, type: 'stage_change',
        description: `Moved from ${LEAD_STATUS_LABELS[status]} → ${LEAD_STATUS_LABELS[newStatus]}`,
        metadata: { from: status, to: newStatus }, created_by: null,
      }).select().single()
      if (act) setActivities(prev => [act, ...prev])
      setStatus(newStatus)
      toast.success(`Moved to ${LEAD_STATUS_LABELS[newStatus]}`)
      router.refresh()
    } catch { toast.error('Failed to update stage') } finally { setMovingStage(false) }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const { data: note } = await supabase.from('lead_notes').insert({ lead_id: lead.id, content: newNote.trim(), created_by: null }).select().single()
      if (note) { setNotes(prev => [note, ...prev]) }
      setNewNote('')
      toast.success('Note saved')
    } catch { toast.error('Failed to save note') } finally { setSavingNote(false) }
  }

  async function handleLogContact() {
    setLoggingContact(true)
    try {
      const followUp = new Date(); followUp.setDate(followUp.getDate() + 3)
      await supabase.from('leads').update({ last_contacted_at: new Date().toISOString(), next_follow_up_at: followUp.toISOString() }).eq('id', lead.id)
      toast.success('Contact logged'); router.refresh()
    } catch { toast.error('Failed') } finally { setLoggingContact(false) }
  }

  async function handleGenerateDraft() {
    if (!lead.email) { toast.error('No email on file'); return }
    setGeneratingDraft(true)
    try {
      const res = await fetch('/api/emails/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id, trigger_type: 'manual' }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Draft created — check To-Do')
    } catch (err) { toast.error((err as Error).message) } finally { setGeneratingDraft(false) }
  }

  async function handleSendSms() {
    if (!smsBody.trim() || !lead.phone) return
    setSendingSms(true)
    try {
      const res = await fetch('/api/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id, body: smsBody.trim() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSmsBody(''); toast.success('SMS sent')
    } catch (err) { toast.error((err as Error).message) } finally { setSendingSms(false) }
  }

  const cfg = STATUS_CONFIG[status]

  const btn = (onClick: () => void, label: string, disabled: boolean, primary = true): React.ReactElement => (
    <button onClick={onClick} disabled={disabled} style={{ padding: '7px 14px', background: primary ? '#0a0a0a' : 'none', color: primary ? '#ffffff' : '#0a0a0a', border: primary ? 'none' : '1px solid #e5e5e5', borderRadius: '8px', fontSize: '13px', fontWeight: primary ? 600 : 400, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>{label}</button>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px' }}>{lead.name}</h1>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {lead.phone && <a href={`tel:${lead.phone}`} style={{ fontSize: '13px', color: '#737373', textDecoration: 'none' }}>📞 {lead.phone}</a>}
            {lead.email && <a href={`mailto:${lead.email}`} style={{ fontSize: '13px', color: '#737373', textDecoration: 'none' }}>✉️ {lead.email}</a>}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.bgColor} ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {lead.phone && <a href={`tel:${lead.phone}`} style={{ padding: '7px 14px', background: '#0a0a0a', color: '#ffffff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>Call</a>}
        {lead.email && btn(handleGenerateDraft, generatingDraft ? 'Drafting...' : 'Draft Email', generatingDraft)}
        {btn(handleLogContact, loggingContact ? 'Logging...' : 'Log Contact', loggingContact, false)}
      </div>

      <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '1px solid #e5e5e5' }}>
        {(['overview', 'addresses', 'activity'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 16px', fontSize: '13px', border: 'none', background: 'none', cursor: 'pointer', color: activeTab === tab ? '#0a0a0a' : '#a3a3a3', fontWeight: activeTab === tab ? 600 : 400, borderBottom: activeTab === tab ? '2px solid #0a0a0a' : '2px solid transparent', marginBottom: '-1px', textTransform: 'capitalize' }}>
            {tab}{tab === 'addresses' && addresses.length > 0 ? ` (${addresses.length})` : ''}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={card}>
            {[
              { label: 'Source', value: lead.source },
              { label: 'Budget', value: lead.budget_range },
              { label: 'Timeline', value: lead.move_in_timeline },
              { label: 'Company', value: lead.company },
              { label: 'Last contacted', value: lead.last_contacted_at ? timeAgo(lead.last_contacted_at) : 'Never' },
              { label: 'Follow-up due', value: lead.next_follow_up_at ? formatDate(lead.next_follow_up_at) : 'Not set' },
              { label: 'Added', value: formatDate(lead.created_at) },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: '13px', color: '#0a0a0a', textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Move stage</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {LEAD_STATUSES.map(s => (
                <button key={s} onClick={() => handleStageChange(s)} disabled={movingStage || s === status} style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px', border: `1px solid ${s === status ? '#0a0a0a' : '#e5e5e5'}`, background: s === status ? '#0a0a0a' : 'transparent', color: s === status ? '#ffffff' : '#737373', cursor: s === status ? 'default' : 'pointer', fontWeight: s === status ? 600 : 400 }}>
                  {LEAD_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {twilioEnabled && lead.phone && (
            <div style={card}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Send SMS</p>
              <textarea value={smsBody} onChange={e => setSmsBody(e.target.value)} placeholder={`Hi ${lead.name.split(' ')[0]}...`} rows={3} style={{ width: '100%', padding: '10px', fontSize: '13px', border: '1px solid #e5e5e5', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={handleSendSms} disabled={sendingSms || !smsBody.trim()} style={{ padding: '7px 16px', background: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !smsBody.trim() ? 0.4 : 1 }}>
                  {sendingSms ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            </div>
          )}

          <div style={card}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Notes</p>
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." rows={3} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote() }} style={{ width: '100%', padding: '10px', fontSize: '13px', border: '1px solid #e5e5e5', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={handleAddNote} disabled={savingNote || !newNote.trim()} style={{ padding: '7px 16px', background: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !newNote.trim() ? 0.4 : 1 }}>
                {savingNote ? 'Saving...' : 'Save note'}
              </button>
            </div>
            {notes.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notes.map(note => (
                  <div key={note.id} style={{ background: '#f5f5f5', borderRadius: '6px', padding: '10px 12px' }}>
                    <p style={{ fontSize: '13px', color: '#0a0a0a', margin: '0 0 4px', lineHeight: 1.5 }}>{note.content}</p>
                    <span style={{ fontSize: '11px', color: '#a3a3a3' }}>{timeAgo(note.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'addresses' && (
        <div style={card}>
          <AddressManager leadId={lead.id} addresses={addresses} onUpdate={setAddresses} />
        </div>
      )}

      {activeTab === 'activity' && (
        <div style={card}>
          {activities.length === 0 ? <p style={{ fontSize: '13px', color: '#a3a3a3', margin: 0 }}>No activity yet.</p> : (
            <div>
              {activities.map((act, i) => (
                <div key={act.id} style={{ display: 'flex', gap: '12px', paddingBottom: i < activities.length - 1 ? '12px' : '0', marginBottom: i < activities.length - 1 ? '12px' : '0', borderBottom: i < activities.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                  <div style={{ width: '24px', height: '24px', background: '#f5f5f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>{ACTIVITY_ICONS[act.type] ?? '•'}</div>
                  <div>
                    <p style={{ fontSize: '13px', color: '#0a0a0a', margin: '0 0 2px' }}>{act.description}</p>
                    <span style={{ fontSize: '11px', color: '#a3a3a3' }}>{timeAgo(act.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
