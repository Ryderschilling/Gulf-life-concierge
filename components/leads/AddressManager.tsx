'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LeadAddress } from '@/lib/types'
import AddressForm from './AddressForm'
import toast from 'react-hot-toast'

interface Props {
  leadId: string
  addresses: LeadAddress[]
  onUpdate: (addresses: LeadAddress[]) => void
}

export default function AddressManager({ leadId, addresses, onUpdate }: Props) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<LeadAddress | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSave(data: Omit<LeadAddress, 'id' | 'lead_id' | 'created_at' | 'updated_at'>) {
    setLoading(true)
    try {
      if (editingAddress) {
        const { data: updated, error } = await supabase.from('lead_addresses').update(data).eq('id', editingAddress.id).select().single()
        if (error) throw error
        onUpdate(addresses.map(a => a.id === editingAddress.id ? updated : a))
        toast.success('Address updated')
      } else {
        if (data.is_primary && addresses.some(a => a.is_primary)) {
          await supabase.from('lead_addresses').update({ is_primary: false }).eq('lead_id', leadId).eq('is_primary', true)
        }
        const { data: created, error } = await supabase.from('lead_addresses').insert({ ...data, lead_id: leadId }).select().single()
        if (error) throw error
        onUpdate([...addresses, created])
        toast.success('Address added')
      }
      setShowForm(false); setEditingAddress(null)
    } catch { toast.error('Failed to save address') } finally { setLoading(false) }
  }

  async function handleDelete(addressId: string) {
    if (!confirm('Remove this address?')) return
    setLoading(true)
    try {
      const { error } = await supabase.from('lead_addresses').delete().eq('id', addressId)
      if (error) throw error
      onUpdate(addresses.filter(a => a.id !== addressId))
      toast.success('Address removed')
    } catch { toast.error('Failed to remove') } finally { setLoading(false) }
  }

  async function handleSetPrimary(addressId: string) {
    setLoading(true)
    try {
      await supabase.from('lead_addresses').update({ is_primary: false }).eq('lead_id', leadId)
      const { error } = await supabase.from('lead_addresses').update({ is_primary: true }).eq('id', addressId)
      if (error) throw error
      onUpdate(addresses.map(a => ({ ...a, is_primary: a.id === addressId })))
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }

  const sorted = [...addresses].sort((a, b) => a.is_primary ? -1 : b.is_primary ? 1 : 0)

  return (
    <div>
      {sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
          {sorted.map(addr => (
            <div key={addr.id} style={{ background: '#f5f5f5', border: `1px solid ${addr.is_primary ? '#1f1f1f' : '#e5e5e5'}`, borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a3a3a3' }}>{addr.label}</span>
                    {addr.is_primary && <span style={{ fontSize: '10px', background: '#0a0a0a', color: '#ffffff', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>Primary</span>}
                  </div>
                  {addr.street && <div style={{ fontSize: '14px', color: '#0a0a0a', fontWeight: 500 }}>{addr.street}</div>}
                  {(addr.city || addr.state || addr.zip) && <div style={{ fontSize: '13px', color: '#737373' }}>{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</div>}
                  {addr.notes && <div style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '3px', fontStyle: 'italic' }}>{addr.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginLeft: '12px', flexShrink: 0 }}>
                  {!addr.is_primary && (
                    <button onClick={() => handleSetPrimary(addr.id)} disabled={loading} style={{ fontSize: '11px', color: '#737373', background: 'none', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer' }}>
                      Set primary
                    </button>
                  )}
                  <button onClick={() => { setEditingAddress(addr); setShowForm(true) }} disabled={loading} style={{ fontSize: '12px', color: '#a3a3a3', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px' }}>✏️</button>
                  <button onClick={() => handleDelete(addr.id)} disabled={loading} style={{ fontSize: '12px', color: '#a3a3a3', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px' }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!sorted.length && !showForm && <p style={{ fontSize: '13px', color: '#a3a3a3', marginBottom: '10px' }}>No addresses on file.</p>}

      {showForm ? (
        <AddressForm initial={editingAddress ?? undefined} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingAddress(null) }} loading={loading} />
      ) : (
        <button onClick={() => setShowForm(true)} style={{ fontSize: '13px', color: '#0a0a0a', background: 'none', border: '1px dashed #e5e5e5', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', width: '100%' }}>
          + Add address
        </button>
      )}
    </div>
  )
}
