'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from '@/lib/types'
import { STATUS_CONFIG } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function FollowUpCard({ lead }: { lead: Lead }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)

  const daysOverdue = lead.next_follow_up_at ? Math.floor((Date.now() - new Date(lead.next_follow_up_at).getTime()) / 86400000) : 0
  const cfg = STATUS_CONFIG[lead.status]

  async function handleLogContact() {
    setLoading(true)
    try {
      const followUp = new Date(); followUp.setDate(followUp.getDate() + 3)
      await supabase.from('leads').update({ last_contacted_at: new Date().toISOString(), next_follow_up_at: followUp.toISOString() }).eq('id', lead.id)
      toast.success(`Contact logged for ${lead.name}`); router.refresh()
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  async function handleGenerateDraft() {
    setGeneratingDraft(true)
    try {
      const res = await fetch('/api/emails/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id, trigger_type: 'follow_up_due', trigger_context: { days_overdue: daysOverdue } }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Draft created — check Emails to Send'); router.refresh()
    } catch (err) { toast.error((err as Error).message) } finally { setGeneratingDraft(false) }
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a' }}>{lead.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bgColor} ${cfg.color}`}>{cfg.label}</span>
          {daysOverdue > 0 && <span style={{ fontSize: '10px', background: '#f5f5f5', color: '#737373', padding: '1px 7px', borderRadius: '10px', fontWeight: 600 }}>{daysOverdue}d overdue</span>}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ fontSize: '12px', color: '#737373', textDecoration: 'none' }}>📞 {lead.phone}</a>}
          {lead.email && <span style={{ fontSize: '12px', color: '#a3a3a3' }}>✉️ {lead.email}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {lead.email && (
          <button onClick={handleGenerateDraft} disabled={generatingDraft} style={{ padding: '6px 10px', background: 'none', color: '#0a0a0a', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
            {generatingDraft ? '...' : 'Draft'}
          </button>
        )}
        <button onClick={handleLogContact} disabled={loading} style={{ padding: '6px 10px', background: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? '...' : 'Log contact'}
        </button>
      </div>
    </div>
  )
}
