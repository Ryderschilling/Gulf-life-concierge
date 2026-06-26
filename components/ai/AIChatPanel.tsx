'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Message { role: 'user' | 'assistant'; content: string; timestamp: string }

interface Props {
  initialConvId?: string
  onConversationCreated?: (id: string, title: string) => void
  onConversationUpdated?: (id: string) => void
}

export default function AIChatPanel({ initialConvId, onConversationCreated, onConversationUpdated }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingConv, setLoadingConv] = useState(!!initialConvId)
  const [convId, setConvId] = useState<string | undefined>(initialConvId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load existing conversation if initialConvId provided
  useEffect(() => {
    if (!initialConvId) { setLoadingConv(false); return }
    setLoadingConv(true)
    fetch(`/api/ai/conversations/${initialConvId}`)
      .then(r => r.json())
      .then(d => {
        if (d.conversation?.messages) setMessages(d.conversation.messages)
      })
      .catch(() => {})
      .finally(() => setLoadingConv(false))
  }, [initialConvId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  const suggestions = [
    'Who needs follow-up today?',
    'Draft an email for my top lead',
    'How is the pipeline looking?',
    'Which leads are close to closing?',
  ]

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversation_id: convId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const isNew = !convId && data.conversation_id
      setConvId(data.conversation_id)

      const aiMsg: Message = { role: 'assistant', content: data.reply, timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])

      if (isNew && data.conversation_id) {
        // Auto-title from first message
        const title = msg.length > 45 ? msg.substring(0, 42) + '...' : msg
        onConversationCreated?.(data.conversation_id, title)
      } else if (data.conversation_id) {
        onConversationUpdated?.(data.conversation_id)
      }
    } catch (err) {
      toast.error((err as Error).message)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  if (loadingConv) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a3a3a3', fontSize: '14px' }}>
        Loading conversation...
      </div>
    )
  }

  return (
    <>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {messages.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>◈</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 4px' }}>Gulf Life AI</h3>
              <p style={{ fontSize: '13px', color: '#737373', margin: 0, lineHeight: 1.5 }}>
                I know your full pipeline, every lead, and your communication style.<br />Ask me anything.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '440px' }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{ padding: '7px 14px', background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: '20px', fontSize: '12px', color: '#737373', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%',
                  padding: '11px 15px',
                  borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  background: msg.role === 'user' ? '#0a0a0a' : '#f5f5f5',
                  color: msg.role === 'user' ? '#ffffff' : '#0a0a0a',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '11px 15px', background: '#f5f5f5', borderRadius: '14px 14px 14px 3px', color: '#a3a3a3', fontSize: '14px' }}>
                  <span style={{ display: 'inline-flex', gap: '3px' }}>
                    <span style={{ animation: 'pulse 1.2s ease-in-out infinite' }}>●</span>
                    <span style={{ animation: 'pulse 1.2s ease-in-out 0.2s infinite' }}>●</span>
                    <span style={{ animation: 'pulse 1.2s ease-in-out 0.4s infinite' }}>●</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask anything — leads, drafts, pipeline analysis..."
            rows={1}
            style={{
              flex: 1, padding: '10px 13px', fontSize: '13px',
              border: '1px solid #e5e5e5', borderRadius: '10px',
              resize: 'none', outline: 'none', fontFamily: 'inherit',
              lineHeight: 1.5, overflowY: 'hidden',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 16px', background: '#0a0a0a', color: '#ffffff',
              border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
              opacity: !input.trim() ? 0.35 : 1, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
        <p style={{ fontSize: '11px', color: '#a3a3a3', margin: '5px 0 0' }}>
          Reads all brain files + pipeline · Enter to send · Shift+Enter for new line
        </p>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </>
  )
}
