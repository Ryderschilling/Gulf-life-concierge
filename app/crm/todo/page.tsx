import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TodoPageClient from '@/components/todo/TodoPageClient'
import type { Lead, EmailDraft, DailyDigest } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TodoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Fetch all data needed for the to-do page in parallel
  const [draftsResult, followUpsResult, digestResult, statsResult] = await Promise.all([
    // Pending email drafts with lead info
    supabase
      .from('email_drafts')
      .select('*, lead:leads(id, name, email, phone, status, property_interest, budget_range)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),

    // Leads with overdue follow-ups
    supabase
      .from('leads')
      .select('*')
      .lte('next_follow_up_at', now.toISOString())
      .not('status', 'in', '("closed_won","closed_lost")')
      .order('next_follow_up_at', { ascending: true })
      .limit(20),

    // Today's digest (if it exists — don't generate here, client handles it)
    supabase
      .from('daily_digests')
      .select('*')
      .eq('digest_date', today)
      .eq('digest_type', 'sales_rep')
      .maybeSingle(),

    // Quick stats
    Promise.all([
      supabase.from('leads').select('count').not('status', 'in', '("closed_won","closed_lost")').single(),
      supabase.from('leads').select('count').eq('status', 'proposal').single(),
      supabase.from('email_drafts').select('count').eq('status', 'pending').single(),
    ]),
  ])

  const pendingDrafts = (draftsResult.data ?? []) as EmailDraft[]
  const followUpLeads = (followUpsResult.data ?? []) as Lead[]
  const digest = digestResult.data as DailyDigest | null
  const [totalResult, proposalResult, draftCountResult] = statsResult
  const stats = {
    total_active: (totalResult.data as { count: number } | null)?.count ?? 0,
    proposals: (proposalResult.data as { count: number } | null)?.count ?? 0,
    pending_emails: (draftCountResult.data as { count: number } | null)?.count ?? 0,
    follow_ups_due: followUpLeads.length,
  }

  return (
    <TodoPageClient
      initialDrafts={pendingDrafts}
      followUpLeads={followUpLeads}
      initialDigest={digest}
      stats={stats}
    />
  )
}
