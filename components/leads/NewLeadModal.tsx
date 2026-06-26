'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus } from '@/lib/types'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface AddressEntry {
  label: string
  street: string
  city: string
  state: string
  zip: string
  notes: string
  is_primary: boolean
}

const emptyAddress = (): AddressEntry => ({
  label: 'Property',
  street: '',
  city: '',
  state: 'FL',
  zip: '',
  notes: '',
  is_primary: false,
})

const ADDRESS_LABELS = ['Property', 'Vacation Home', 'Investment Property', 'Primary Residence', 'Rental Property', 'Other']

interface Props {
  onClose: () => void
  onLeadCreated?: (lead: Lead) => void
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '13px',
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  background: '#ffffff',
  color: '#0a0a0a',
  outline: 'none',
  boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#a3a3a3',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '5px',
  display: 'block',
}

export default function NewLeadModal({ onClose, onLeadCreated }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [addresses, setAddresses] = useState<AddressEntry[]>([{ ...emptyAddress(), is_primary: true }])

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    status: 'new' as LeadStatus,
    budget_range: '',
    move_in_timeline: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addAddress() {
    if (addresses.length >= 5) return
    setAddresses(prev => [...prev, emptyAddress()])
  }

  function removeAddress(index: number) {
    setAddresses(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length > 0 && !next.some(a => a.is_primary)) next[0].is_primary = true
      return next
    })
  }

  function setAddressField(index: number, field: keyof AddressEntry, value: string | boolean) {
    setAddresses(prev => {
      const next = [...prev]
      if (field === 'is_primary' && value === true) {
        next.forEach((a, i) => { a.is_primary = i === index })
      } else {
        next[index] = { ...next[index], [field]: value }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setLoading(true)
    try {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          source: form.source || null,
          status: form.status,
          budget_range: form.budget_range.trim() || null,
          move_in_timeline: form.move_in_timeline.trim() || null,
        })
        .select()
        .single()

      if (leadError || !lead) throw new Error(leadError?.message ?? 'Failed to create lead')

      const validAddresses = addresses.filter(a => a.street || a.city)
      if (validAddresses.length > 0) {
        await supabase.from('lead_addresses').insert(
          validAddresses.map(a => ({
            lead_id: lead.id,
            label: a.label,
            street: a.street || null,
            city: a.city || null,
            state: a.state || null,
            zip: a.zip || null,
            notes: a.notes || null,
            is_primary: a.is_primary,
          }))
        )
      }

      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        type: 'stage_change',
        description: `Lead created`,
        metadata: null,
        created_by: null,
      })

      toast.success(`${form.name} added`)
      onLeadCreated?.(lead as Lead)
      resetForm()
      onClose()
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setForm({ name: '', email: '', phone: '', company: '', source: '', status: 'new', budget_range: '', move_in_timeline: '' })
    setAddresses([{ ...emptyAddress(), is_primary: true }])
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '40px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: '14px', width: '100%',
          maxWidth: '500px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: '1px solid #e5e5e5',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0a0a0a', margin: 0 }}>Add New Lead</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#a3a3a3', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '12px' }}>

            <div>
              <label style={lbl}>Name *</label>
              <input type="text" placeholder="Sarah Johnson" value={form.name} onChange={e => set('name', e.target.value)} style={input} required autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" placeholder="sarah@email.com" value={form.email} onChange={e => set('email', e.target.value)} style={input} />
              </div>
              <div>
                <label style={lbl}>Phone</label>
                <input type="tel" placeholder="(850) 555-0000" value={form.phone} onChange={e => set('phone', e.target.value)} style={input} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>Source</label>
                <select value={form.source} onChange={e => set('source', e.target.value)} style={input}>
                  <option value="">Select source</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social Media</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Stage</label>
                <select value={form.status} onChange={e => set('status', e.target.value as LeadStatus)} style={input}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="nurturing">Nurturing</option>
                  <option value="proposal">Proposal</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>Budget range</label>
                <input type="text" placeholder="$5,000–$8,000/wk" value={form.budget_range} onChange={e => set('budget_range', e.target.value)} style={input} />
              </div>
              <div>
                <label style={lbl}>Timeline</label>
                <input type="text" placeholder="Summer 2025" value={form.move_in_timeline} onChange={e => set('move_in_timeline', e.target.value)} style={input} />
              </div>
            </div>

            {/* Addresses */}
            <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: '14px' }}>
              <label style={lbl}>Property addresses</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {addresses.map((addr, i) => (
                  <div key={i} style={{ background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <select
                        value={addr.label}
                        onChange={e => setAddressField(i, 'label', e.target.value)}
                        style={{ ...input, width: 'auto', padding: '4px 8px', fontSize: '12px', background: '#ffffff' }}
                      >
                        {ADDRESS_LABELS.map(l => <option key={l}>{l}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ fontSize: '12px', color: '#737373', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input type="radio" name="primary_address" checked={addr.is_primary} onChange={() => setAddressField(i, 'is_primary', true)} />
                          Primary
                        </label>
                        <button type="button" onClick={() => removeAddress(i)} style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <input type="text" placeholder="Street address" value={addr.street} onChange={e => setAddressField(i, 'street', e.target.value)} style={{ ...input, fontSize: '12px', padding: '6px 9px' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px' }}>
                        <input type="text" placeholder="City" value={addr.city} onChange={e => setAddressField(i, 'city', e.target.value)} style={{ ...input, fontSize: '12px', padding: '6px 9px' }} />
                        <input type="text" placeholder="State" value={addr.state} onChange={e => setAddressField(i, 'state', e.target.value)} style={{ ...input, fontSize: '12px', padding: '6px 9px' }} maxLength={2} />
                        <input type="text" placeholder="Zip" value={addr.zip} onChange={e => setAddressField(i, 'zip', e.target.value)} style={{ ...input, fontSize: '12px', padding: '6px 9px' }} maxLength={10} />
                      </div>
                      <input type="text" placeholder="Notes (e.g. Gulf-front, sleeps 10)" value={addr.notes} onChange={e => setAddressField(i, 'notes', e.target.value)} style={{ ...input, fontSize: '12px', padding: '6px 9px' }} />
                    </div>
                  </div>
                ))}
                {addresses.length < 5 && (
                  <button type="button" onClick={addAddress} style={{ padding: '7px', background: 'none', border: '1px dashed #e5e5e5', borderRadius: '6px', fontSize: '12px', color: '#a3a3a3', cursor: 'pointer' }}>
                    + Add another address
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Adding...' : 'Add to pipeline'}
            </button>
            <button type="button" onClick={() => { resetForm(); onClose() }} style={{ padding: '10px 16px', background: 'none', color: '#737373', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
