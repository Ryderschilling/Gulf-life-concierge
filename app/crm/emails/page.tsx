import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmailsPageClient from '@/components/emails/EmailsPageClient'
import type { EmailDraft } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string; tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const focusLeadId = sp.lead_id ?? null
  const initialTab = (sp.tab ?? 'pending') as 'pending' | 'sent'

  // Fetch pending drafts (default view)
  const { data: pending } = await supabase
    .from('email_drafts')
    .select('*, lead:leads(id, name, email, phone, status, property_interest, budget_range)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // Fetch sent drafts for history tab
  const { data: sent } = await supabase
    .from('email_drafts')
    .select('*, lead:leads(id, name, email, phone, status)')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(50)

  return (
    <EmailsPageClient
      pendingDrafts={(pending ?? []) as EmailDraft[]}
      sentDrafts={(sent ?? []) as EmailDraft[]}
      focusLeadId={focusLeadId}
      initialTab={initialTab}
    />
  )
}
