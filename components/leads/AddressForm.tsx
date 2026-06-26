'use client'

import { useState } from 'react'
import type { LeadAddress } from '@/lib/types'

const ADDRESS_LABELS = ['Property', 'Vacation Home', 'Investment Property', 'Primary Residence', 'Rental Property', 'Other']

interface FormData { label: string; street: string; city: string; state: string; zip: string; notes: string; is_primary: boolean }
interface Props { initial?: LeadAddress; onSave: (data: Omit<LeadAddress, 'id' | 'lead_id' | 'created_at' | 'updated_at'>) => void; onCancel: () => void; loading: boolean }

const inp: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #e5e5e5', borderRadius: '6px', background: '#ffffff', color: '#0a0a0a', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }

export default function AddressForm({ initial, onSave, onCancel, loading }: Props) {
  const [form, setForm] = useState<FormData>({ label: initial?.label ?? 'Property', street: initial?.street ?? '', city: initial?.city ?? '', state: initial?.state ?? 'FL', zip: initial?.zip ?? '', notes: initial?.notes ?? '', is_primary: initial?.is_primary ?? false })

  function set(field: keyof FormData, value: string | boolean) { setForm(prev => ({ ...prev, [field]: value })) }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ label: form.label, street: form.street || null, city: form.city || null, state: form.state || null, zip: form.zip || null, notes: form.notes || null, is_primary: form.is_primary }) }} style={{ background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '14px' }}>
      <div style={{ display: 'grid', gap: '10px' }}>
        <div><label style={lbl}>Type</label><select value={form.label} onChange={e => set('label', e.target.value)} style={inp}>{ADDRESS_LABELS.map(l => <option key={l}>{l}</option>)}</select></div>
        <div><label style={lbl}>Street</label><input type="text" placeholder="123 Rosemary Ave" value={form.street} onChange={e => set('street', e.target.value)} style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
          <div><label style={lbl}>City</label><input type="text" placeholder="Rosemary Beach" value={form.city} onChange={e => set('city', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>State</label><input type="text" placeholder="FL" value={form.state} onChange={e => set('state', e.target.value)} style={inp} maxLength={2} /></div>
          <div><label style={lbl}>Zip</label><input type="text" placeholder="32461" value={form.zip} onChange={e => set('zip', e.target.value)} style={inp} maxLength={10} /></div>
        </div>
        <div><label style={lbl}>Notes</label><input type="text" placeholder="Gulf-front, 4BR, sleeps 10" value={form.notes} onChange={e => set('notes', e.target.value)} style={inp} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#737373' }}>
          <input type="checkbox" checked={form.is_primary} onChange={e => set('is_primary', e.target.checked)} style={{ width: '14px', height: '14px' }} />
          Set as primary
        </label>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button type="submit" disabled={loading} style={{ flex: 1, padding: '8px', background: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Saving...' : initial ? 'Update' : 'Add address'}
        </button>
        <button type="button" onClick={onCancel} disabled={loading} style={{ padding: '8px 14px', background: 'none', color: '#737373', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  )
}
