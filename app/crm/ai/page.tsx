import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AIPageClient from '@/components/ai/AIPageClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'AI Brain' }

export default async function AIPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [contextResult, memoriesResult] = await Promise.all([
    supabase.from('ai_context_files').select('*').order('sort_order', { ascending: true }),
    supabase.from('ai_memories').select('*, lead:leads(name)').eq('is_active', true).order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <AIPageClient
      initialContextFiles={contextResult.data ?? []}
      initialMemories={memoriesResult.data ?? []}
    />
  )
}
