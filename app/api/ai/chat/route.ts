// POST /api/ai/chat
// Full-context AI chat. Loads all brain files + memories + pipeline before responding.
// Body: { message: string, conversation_id?: string, lead_id?: string }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI } from '@/lib/openai'
import { buildAIContext, AI_SYSTEM_BASE } from '@/lib/ai-context'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, conversation_id, lead_id } = await req.json() as {
      message: string
      conversation_id?: string
      lead_id?: string
    }

    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    // Load or create conversation
    let messages: Array<{role: 'user' | 'assistant'; content: string}> = []
    let convId = conversation_id

    if (convId) {
      const { data: conv } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', convId)
        .single()
      if (conv?.messages) messages = conv.messages as typeof messages
    }

    // Build full context
    const context = await buildAIContext(supabase, {
      lead_id,
      include_pipeline: true,
    })

    const systemPrompt = `${AI_SYSTEM_BASE}\n\n${context}`

    // Append new user message
    messages.push({ role: 'user', content: message })

    // Call OpenAI
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1200,
    })

    const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.'
    messages.push({ role: 'assistant', content: reply })

    // Save conversation
    if (convId) {
      await supabase.from('ai_conversations').update({
        messages,
        updated_at: new Date().toISOString(),
      }).eq('id', convId)
    } else {
      // Auto-title from first message
      const title = message.length > 60 ? message.substring(0, 57) + '...' : message
      const { data: newConv } = await supabase
        .from('ai_conversations')
        .insert({ messages, title })
        .select('id')
        .single()
      convId = newConv?.id
    }

    return NextResponse.json({ reply, conversation_id: convId })
  } catch (err) {
    console.error('[POST /api/ai/chat]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
