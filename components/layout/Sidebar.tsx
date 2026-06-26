'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/lib/types'

interface NavItem {
  href: string
  label: string
  badge?: number
}

interface Props {
  profile: Profile | null
  pendingTodoCount?: number
}

export default function Sidebar({ profile, pendingTodoCount = 0 }: Props) {
  const pathname = usePathname()

  const rawName = profile?.full_name ?? profile?.email ?? ''
  const displayName = rawName.includes('@')
    ? rawName.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : rawName || 'User'

  const navItems: NavItem[] = [
    { href: '/crm',           label: 'Dashboard' },
    { href: '/crm/todo',      label: 'To-Do', badge: pendingTodoCount > 0 ? pendingTodoCount : undefined },
    { href: '/crm/emails',    label: 'Emails' },
    { href: '/crm/leads',     label: 'Pipeline' },
    { href: '/crm/ai',        label: 'AI Brain' },
    { href: '/crm/sequences', label: 'Sequences' },
    { href: '/crm/settings',  label: 'Settings' },
  ]

  function isActive(href: string) {
    return href === '/crm' ? pathname === '/crm' : pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="sidebar-desktop"
        style={{
          width: '200px',
          minHeight: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          borderRight: '1px solid #1f1f1f',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid #1f1f1f' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Gulf Life
          </p>
          <p style={{ fontSize: '10px', color: '#525252', margin: '2px 0 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            CRM
          </p>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {navItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  marginBottom: '1px',
                  background: active ? '#ffffff' : 'transparent',
                  textDecoration: 'none',
                  color: active ? '#0a0a0a' : '#737373',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span style={{
                    minWidth: '18px',
                    height: '18px',
                    background: active ? '#0a0a0a' : '#262626',
                    color: active ? '#ffffff' : '#a3a3a3',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                  }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid #1f1f1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#262626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: '#a3a3a3', flexShrink: 0,
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <p style={{
              fontSize: '12px', color: '#737373', margin: 0, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </p>
          </div>
        </div>
      </aside>

      {/* Spacer so main content doesn't sit under fixed sidebar */}
      <div className="sidebar-desktop" style={{ width: '200px', flexShrink: 0 }} />

      {/* Mobile bottom nav */}
      <nav
        className="sidebar-mobile"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: '#0a0a0a',
          borderTop: '1px solid #1f1f1f',
          zIndex: 100,
          padding: '6px 0 max(6px, env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {navItems.slice(0, 5).map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '4px 12px',
                  textDecoration: 'none',
                  color: active ? '#ffffff' : '#525252',
                  position: 'relative',
                  minWidth: '50px',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>{item.label}</span>
                {item.badge !== undefined && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '8px',
                    minWidth: '14px', height: '14px',
                    background: '#ffffff', color: '#0a0a0a',
                    fontSize: '9px', fontWeight: 700,
                    borderRadius: '7px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                  }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: block !important; }
        }
      `}</style>
    </>
  )
}
