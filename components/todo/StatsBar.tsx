'use client'

interface Stats { total_active: number; proposals: number; pending_emails: number; follow_ups_due: number }

export default function StatsBar({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Active leads', value: stats.total_active, urgent: false },
    { label: 'Proposals out', value: stats.proposals, urgent: false },
    { label: 'Emails to send', value: stats.pending_emails, urgent: stats.pending_emails > 0 },
    { label: 'Follow-ups due', value: stats.follow_ups_due, urgent: stats.follow_ups_due > 0 },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
      {items.map(item => (
        <div key={item.label} style={{ background: '#ffffff', border: `1px solid ${item.urgent ? '#0a0a0a' : '#1f1f1f'}`, borderRadius: '12px', padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0a0a0a', lineHeight: 1 }}>{item.value}</div>
          <div style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}
