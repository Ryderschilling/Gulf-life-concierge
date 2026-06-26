'use client'

import { useState, useEffect } from 'react'
import BrainFiles from './BrainFiles'
import AIChatPanel from './AIChatPanel'
import MemoryLog from './MemoryLog'

interface ContextFile {
  id: string; name: string; description: string | null; content: string; is_active: boolean; sort_order: number
}
interface Memory {
  id: string; type: string; title: string; content: string; lead_id: string | null; source: string | null; created_at: string; lead?: { name: string } | null
}
interface Conversation {
  id: string; title: string | null; updated_at: string; created_at: string
}
interface Props {
  initialContextFiles: ContextFile[]
  initialMemories: Memory[]
}

type Tab = 'chat' | 'brain' | 'memory'

function groupConversations(convos: Conversation[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000)

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This week', items: [] },
    { label: 'Earlier', items: [] },
  ]

  for (const c of convos) {
    const d = new Date(c.updated_at)
    if (d >= startOfToday) groups[0].items.push(c)
    else if (d >= startOfYesterday) groups[1].items.push(c)
    else if (d >= startOfWeek) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter(g => g.items.length > 0)
}

export default function AIPageClient({ initialContextFiles, initialMemories }: Props) {
  const [tab, setTab] = useState<Tab>('chat')
  const [contextFiles, setContextFiles] = useState(initialContextFiles)
  const [memories, setMemories] = useState(initialMemories)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [chatKey, setChatKey] = useState(0) // force AIChatPanel remount on new chat

  // Load conversation list on mount
  useEffect(() => {
    fetch('/api/ai/conversations')
      .then(r => r.json())
      .then(d => { if (d.conversations) setConversations(d.conversations) })
      .catch(() => {})
  }, [])

  function handleNewChat() {
    setActiveConvId(null)
    setChatKey(k => k + 1) // remount panel = fresh start
  }

  function handleSelectConversation(id: string) {
    setActiveConvId(id)
    setChatKey(k => k + 1) // remount with new conversation loaded
  }

  function handleConversationCreated(id: string, title: string) {
    setActiveConvId(id)
    setConversations(prev => [{ id, title, updated_at: new Date().toISOString(), created_at: new Date().toISOString() }, ...prev.filter(c => c.id !== id)])
  }

  function handleConversationUpdated(id: string) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, updated_at: new Date().toISOString() } : c)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
  }

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/ai/conversations?id=${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConvId === id) { setActiveConvId(null); setChatKey(k => k + 1) }
  }

  const groups = groupConversations(conversations)
  const isToday = (c: Conversation) => new Date(c.updated_at) >= new Date(new Date().setHours(0, 0, 0, 0))

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px' }}>AI Brain</h1>
        <p style={{ fontSize: '13px', color: '#737373', margin: 0 }}>
          {contextFiles.filter(f => f.is_active).length} active knowledge files · {memories.length} memories learned
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '1px solid #e5e5e5' }}>
        {([
          { key: 'chat', label: 'Chat' },
          { key: 'brain', label: `Brain Files (${contextFiles.length})` },
          { key: 'memory', label: `Memory (${memories.length})` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer',
            color: tab === t.key ? '#0a0a0a' : '#a3a3a3',
            fontWeight: tab === t.key ? 600 : 400, fontSize: '13px',
            borderBottom: tab === t.key ? '2px solid #0a0a0a' : '2px solid transparent',
            marginBottom: '-1px',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat tab — two-panel layout */}
      {tab === 'chat' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: '0',
          height: 'calc(100vh - 210px)',
          minHeight: '500px',
          border: '1px solid #1f1f1f',
          borderRadius: '14px',
          overflow: 'hidden',
          background: '#ffffff',
        }}>
          {/* Left: conversation list */}
          <div style={{ borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
            {/* New chat button */}
            <div style={{ padding: '12px 12px 8px' }}>
              <button
                onClick={handleNewChat}
                style={{
                  width: '100%', padding: '8px 12px', background: '#0a0a0a', color: '#ffffff',
                  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 300 }}>+</span> New Chat
              </button>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
              {conversations.length === 0 && (
                <p style={{ fontSize: '12px', color: '#a3a3a3', padding: '8px 6px', margin: 0 }}>
                  No chats yet. Start a conversation.
                </p>
              )}
              {groups.map(group => (
                <div key={group.label}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '10px 0 4px 6px' }}>
                    {group.label}
                  </p>
                  {group.items.map(conv => {
                    const active = activeConvId === conv.id
                    const isNew = isToday(conv)
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        style={{
                          padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', marginBottom: '1px',
                          background: active ? '#0a0a0a' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                          group: 'true',
                        }}
                        className="conv-row"
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isNew && !active && (
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0a0a0a', flexShrink: 0, display: 'inline-block' }} />
                            )}
                            <span style={{
                              fontSize: '13px',
                              fontWeight: isNew ? 600 : 400,
                              color: active ? '#ffffff' : isNew ? '#0a0a0a' : '#525252',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              display: 'block',
                            }}>
                              {conv.title ?? 'New conversation'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                            color: active ? 'rgba(255,255,255,0.5)' : '#d0d0d0',
                            fontSize: '12px', padding: '0 2px', lineHeight: 1,
                            opacity: 0,
                          }}
                          className="conv-delete"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right: chat panel */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <AIChatPanel
              key={chatKey}
              initialConvId={activeConvId ?? undefined}
              onConversationCreated={handleConversationCreated}
              onConversationUpdated={handleConversationUpdated}
            />
          </div>
        </div>
      )}

      {tab === 'brain' && <BrainFiles files={contextFiles} onUpdate={setContextFiles} />}
      {tab === 'memory' && <MemoryLog memories={memories} onUpdate={setMemories} />}

      <style>{`
        .conv-row:hover .conv-delete { opacity: 1 !important; }
        .conv-row:hover { background: #f0f0f0; }
        .conv-row[style*="background: rgb(10, 10, 10)"]:hover { background: #0a0a0a !important; }
      `}</style>
    </div>
  )
}
