'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailDraft, Lead, DailyDigest, Todo } from '@/lib/types'
import StatsBar from './StatsBar'
import DailyDigestSection from './DailyDigestSection'

interface Stats {
  total_active: number
  proposals: number
  pending_emails: number
  follow_ups_due: number
}

interface Props {
  initialDrafts: EmailDraft[]
  followUpLeads: Lead[]
  initialDigest: DailyDigest | null
  stats: Stats
}

export default function TodoPageClient({
  initialDrafts,
  followUpLeads,
  initialDigest,
  stats,
}: Props) {
  const router = useRouter()
  const [drafts] = useState<EmailDraft[]>(initialDrafts)
  const [digest, setDigest] = useState<DailyDigest | null>(initialDigest)
  const [digestLoading, setDigestLoading] = useState(false)

  // Real todo list state
  const [todos, setTodos] = useState<Todo[]>([])
  const [todosLoading, setTodosLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

  // Add-todo form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newTodoDesc, setNewTodoDesc] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)

  // Load todos on mount and when tab changes
  useEffect(() => {
    loadTodos()
  }, [activeTab])

  async function loadTodos() {
    setTodosLoading(true)
    try {
      const res = await fetch(`/api/todos?archived=${activeTab === 'archived'}`)
      const data = await res.json()
      setTodos(data.todos ?? [])
    } finally {
      setTodosLoading(false)
    }
  }

  // Digest actions
  async function loadDigest() {
    if (digest) return
    setDigestLoading(true)
    try {
      const res = await fetch('/api/digest')
      const data = await res.json()
      if (data.digest) setDigest(data.digest)
    } finally {
      setDigestLoading(false)
    }
  }

  async function refreshDigest() {
    setDigestLoading(true)
    try {
      const res = await fetch('/api/digest', { method: 'POST' })
      const data = await res.json()
      if (data.digest) setDigest(data.digest)
    } finally {
      setDigestLoading(false)
    }
  }

  // Called from DailyDigestSection when action items are added as todos
  async function handleDigestTodosCreated() {
    await loadTodos()
  }

  // Check off a todo
  async function completeTodo(todo: Todo) {
    // Optimistic
    setTodos(prev => prev.filter(t => t.id !== todo.id))

    // If it's an email task, create draft + navigate to emails page for that lead
    if (todo.type === 'email_task' && todo.linked_lead_id) {
      // Best-effort draft creation so the emails page has something to show
      fetch('/api/emails/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: todo.linked_lead_id, trigger_type: 'manual' }),
      }).catch(() => {})
      router.push(`/crm/emails?lead_id=${todo.linked_lead_id}`)
      return
    }

    try {
      await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true }),
      })
    } catch {
      // Re-load on failure
      loadTodos()
    }
  }

  // Add a manual todo
  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!newTodoTitle.trim()) return
    setAddingTodo(true)
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          description: newTodoDesc.trim() || null,
          type: 'manual',
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      setNewTodoTitle('')
      setNewTodoDesc('')
      setShowAddForm(false)
      await loadTodos()
    } finally {
      setAddingTodo(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const activeTodos = todos.filter(t => !t.is_archived)
  const archivedTodos = todos.filter(t => t.is_archived)
  const displayTodos = activeTab === 'active' ? activeTodos : archivedTodos

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
          {today}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h1 style={{
            fontSize: '26px',
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 700,
            color: '#1a2f5a',
            margin: 0,
          }}>
            Today&apos;s To-Do
          </h1>
          <button
            onClick={() => setShowAddForm(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: showAddForm ? '#f0ede6' : '#1a2f5a',
              color: showAddForm ? '#1a2f5a' : '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{showAddForm ? '✕' : '+'}</span>
            Add Todo
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
          {activeTodos.length > 0
            ? `${activeTodos.length} item${activeTodos.length !== 1 ? 's' : ''} on your list`
            : 'All caught up ✓ · ✨ Generate drafts for all leads'}
        </p>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Add todo form */}
      {showAddForm && (
        <form
          onSubmit={handleAddTodo}
          style={{
            background: '#ffffff',
            border: '1px solid #d4a843',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 0 0 2px rgba(212,168,67,0.15)',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a2f5a', margin: '0 0 10px' }}>New Todo</p>
          <input
            autoFocus
            value={newTodoTitle}
            onChange={e => setNewTodoTitle(e.target.value)}
            placeholder="What needs to be done?"
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '14px',
              border: '1px solid #e5e0d3',
              borderRadius: '6px',
              outline: 'none',
              marginBottom: '8px',
              boxSizing: 'border-box',
              color: '#1a2f5a',
            }}
          />
          <input
            value={newTodoDesc}
            onChange={e => setNewTodoDesc(e.target.value)}
            placeholder="Details (optional)"
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '13px',
              border: '1px solid #e5e0d3',
              borderRadius: '6px',
              outline: 'none',
              marginBottom: '12px',
              boxSizing: 'border-box',
              color: '#4b5563',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewTodoTitle(''); setNewTodoDesc('') }}
              style={{
                padding: '7px 14px',
                background: 'none',
                color: '#9ca3af',
                border: '1px solid #e5e0d3',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingTodo || !newTodoTitle.trim()}
              style={{
                padding: '7px 18px',
                background: newTodoTitle.trim() ? '#1a2f5a' : '#e5e0d3',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: newTodoTitle.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {addingTodo ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Daily Briefing */}
      <DailyDigestSection
        digest={digest}
        loading={digestLoading}
        onLoad={loadDigest}
        onRefresh={refreshDigest}
        onTodosCreated={handleDigestTodosCreated}
      />

      {/* Todo list tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['active', 'archived'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                borderRadius: '20px',
                border: `1px solid ${activeTab === tab ? '#1a2f5a' : '#e5e0d3'}`,
                background: activeTab === tab ? '#1a2f5a' : 'transparent',
                color: activeTab === tab ? '#ffffff' : '#6b7280',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 600 : 400,
              }}
            >
              {tab === 'active'
                ? `My List${activeTodos.length > 0 ? ` (${activeTodos.length})` : ''}`
                : 'Archived'}
            </button>
          ))}
        </div>
        {activeTab === 'active' && drafts.length > 0 && (
          <a
            href="/crm/emails"
            style={{
              fontSize: '12px',
              color: '#d4a843',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '4px 10px',
              border: '1px solid #d4a843',
              borderRadius: '6px',
            }}
          >
            ✉️ {drafts.length} email{drafts.length !== 1 ? 's' : ''} to send →
          </a>
        )}
      </div>

      {/* Todo items */}
      {todosLoading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
          Loading...
        </div>
      ) : displayTodos.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '14px',
          background: '#f8f6f0',
          borderRadius: '10px',
          border: '1px solid #e5e0d3',
        }}>
          {activeTab === 'active'
            ? 'No items on your list. Generate your briefing or add a todo above.'
            : 'Nothing archived yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayTodos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              isArchived={activeTab === 'archived'}
              onComplete={completeTodo}
              onDelete={async (id) => {
                await fetch(`/api/todos/${id}`, { method: 'DELETE' })
                loadTodos()
              }}
            />
          ))}
        </div>
      )}

      {/* Pending follow-ups — always shown below list */}
      {followUpLeads.length > 0 && (
        <section style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '16px' }}>🔔</span>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a2f5a', margin: 0 }}>Follow-ups Due</h2>
            <span style={{
              fontSize: '12px',
              background: '#ef4444',
              color: '#fff',
              padding: '1px 8px',
              borderRadius: '10px',
              fontWeight: 600,
            }}>
              {followUpLeads.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {followUpLeads.map(lead => (
              <FollowUpRow key={lead.id} lead={lead} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Individual todo item row
// ─────────────────────────────────────────────────────────────
function TodoItem({
  todo,
  isArchived,
  onComplete,
  onDelete,
}: {
  todo: Todo
  isArchived: boolean
  onComplete: (todo: Todo) => void
  onDelete: (id: string) => void
}) {
  const isEmailTask = todo.type === 'email_task'

  const typeColors: Record<string, { bg: string; dot: string }> = {
    manual: { bg: '#f8f6f0', dot: '#9ca3af' },
    digest_action: { bg: '#fefbf0', dot: '#d4a843' },
    email_task: { bg: '#f0f4ff', dot: '#3b82f6' },
    follow_up_task: { bg: '#fef2f2', dot: '#ef4444' },
  }
  const colors = typeColors[todo.type] ?? typeColors.manual

  return (
    <div style={{
      background: isArchived ? '#fafaf9' : colors.bg,
      border: '1px solid #e5e0d3',
      borderRadius: '8px',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      opacity: isArchived ? 0.65 : 1,
    }}>
      {/* Checkbox */}
      {!isArchived ? (
        <button
          onClick={() => onComplete(todo)}
          title={isEmailTask ? 'Go to email draft' : 'Mark complete'}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: `2px solid ${colors.dot}`,
            background: 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            marginTop: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        />
      ) : (
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: '#22c55e',
          flexShrink: 0,
          marginTop: '1px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          color: '#fff',
        }}>
          ✓
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            color: isArchived ? '#9ca3af' : '#1a2f5a',
            textDecoration: isArchived ? 'line-through' : 'none',
          }}>
            {todo.title}
          </span>
          {isEmailTask && !isArchived && (
            <span style={{
              fontSize: '10px',
              background: '#3b82f6',
              color: '#fff',
              padding: '1px 7px',
              borderRadius: '10px',
              fontWeight: 600,
            }}>
              Email →
            </span>
          )}
          {todo.type === 'digest_action' && (
            <span style={{
              fontSize: '10px',
              background: '#fef3c7',
              color: '#92400e',
              padding: '1px 7px',
              borderRadius: '10px',
            }}>
              From briefing
            </span>
          )}
        </div>
        {todo.description && (
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{todo.description}</p>
        )}
        {isArchived && todo.completed_at && (
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>
            Completed {new Date(todo.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>

      {/* Delete (active only) */}
      {!isArchived && (
        <button
          onClick={() => onDelete(todo.id)}
          title="Delete"
          style={{
            background: 'none',
            border: 'none',
            color: '#d1d5db',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 4px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Follow-up row (overdue leads — not todos, just quick view)
// ─────────────────────────────────────────────────────────────
function FollowUpRow({ lead }: { lead: Lead }) {
  const daysOverdue = lead.next_follow_up_at
    ? Math.floor((Date.now() - new Date(lead.next_follow_up_at).getTime()) / 86400000)
    : null

  return (
    <a
      href={`/leads/${lead.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#ffffff',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        textDecoration: 'none',
        gap: '12px',
      }}
    >
      <div>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a2f5a' }}>{lead.name}</span>
        {lead.property_interest && (
          <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>{lead.property_interest}</span>
        )}
      </div>
      {daysOverdue !== null && daysOverdue >= 0 && (
        <span style={{
          fontSize: '11px',
          background: '#fef2f2',
          color: '#ef4444',
          border: '1px solid #fecaca',
          padding: '2px 8px',
          borderRadius: '10px',
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {daysOverdue === 0 ? 'Due today' : `${daysOverdue}d overdue`}
        </span>
      )}
    </a>
  )
}
