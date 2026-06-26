// ============================================================
// lib/types.ts — Full updated types file (Phase 1 + Phase 2)
// Replace your existing lib/types.ts with this file
// ============================================================

// ----------------------------------------
// AUTH / PROFILES
// ----------------------------------------
export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'sales_rep' | 'owner'
  created_at: string
  updated_at: string
}

// ----------------------------------------
// LEADS
// ----------------------------------------
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'nurturing'
  | 'proposal'
  | 'closed_won'
  | 'closed_lost'

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  nurturing: 'Nurturing',
  proposal: 'Proposal',
  closed_won: 'Won',
  closed_lost: 'Lost',
}

export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'nurturing',
  'proposal',
  'closed_won',
  'closed_lost',
]

export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: LeadStatus
  source: string | null
  assigned_to: string | null
  property_interest: string | null
  budget_range: string | null
  move_in_timeline: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  created_at: string
  updated_at: string
  // Joined relations (optional)
  addresses?: LeadAddress[]
  notes?: LeadNote[]
  activities?: LeadActivity[]
}

// ----------------------------------------
// LEAD ADDRESSES (Phase 2)
// ----------------------------------------
export interface LeadAddress {
  id: string
  lead_id: string
  label: string           // e.g. "Primary Property", "Vacation Home"
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export type LeadAddressInsert = Omit<LeadAddress, 'id' | 'created_at' | 'updated_at'>
export type LeadAddressUpdate = Partial<LeadAddressInsert>

// ----------------------------------------
// NOTES & ACTIVITIES
// ----------------------------------------
export interface LeadNote {
  id: string
  lead_id: string
  content: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ActivityType =
  | 'stage_change'
  | 'note_added'
  | 'email_sent'
  | 'sms_sent'
  | 'call_logged'
  | 'email_draft_created'

export interface LeadActivity {
  id: string
  lead_id: string
  type: ActivityType
  description: string
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}

// ----------------------------------------
// SEQUENCES
// ----------------------------------------
export interface Sequence {
  id: string
  name: string
  description: string | null
  trigger: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SequenceStep {
  id: string
  sequence_id: string
  step_number: number
  type: 'email' | 'sms' | 'wait'
  delay_days: number
  subject: string | null
  body: string | null
  created_at: string
  updated_at: string
}

export interface LeadEnrollment {
  id: string
  lead_id: string
  sequence_id: string
  current_step: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  enrolled_at: string
  updated_at: string
}

// ----------------------------------------
// EMAIL DRAFTS (Phase 2)
// ----------------------------------------
export type EmailDraftStatus = 'pending' | 'sent' | 'dismissed'

export type EmailDraftTrigger =
  | 'follow_up_due'
  | 'stage_change'
  | 'manual'
  | 'sequence'

export interface EmailDraft {
  id: string
  lead_id: string
  to_email: string
  to_name: string | null
  subject: string
  body: string             // plain text, editable by rep
  trigger_type: EmailDraftTrigger | null
  trigger_context: Record<string, unknown> | null
  status: EmailDraftStatus
  ai_generated: boolean
  created_at: string
  updated_at: string
  sent_at: string | null
  sent_by: string | null
  dismissed_at: string | null
  dismissed_by: string | null
  // Joined
  lead?: Lead
}

export type EmailDraftInsert = Omit<
  EmailDraft,
  'id' | 'created_at' | 'updated_at' | 'sent_at' | 'sent_by' | 'dismissed_at' | 'dismissed_by' | 'lead'
>

// ----------------------------------------
// SMS MESSAGES (Phase 2)
// ----------------------------------------
export type SmsStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export interface SmsMessage {
  id: string
  lead_id: string
  to_phone: string
  body: string
  status: SmsStatus
  twilio_sid: string | null
  direction: 'outbound' | 'inbound'
  created_at: string
  sent_at: string | null
  created_by: string | null
  // Joined
  lead?: Lead
}

// ----------------------------------------
// DAILY DIGEST (Phase 2)
// ----------------------------------------
export type DigestType = 'sales_rep' | 'owner'

export interface PriorityLead {
  lead_id: string
  lead_name: string
  lead_email: string | null
  lead_phone: string | null
  current_status: LeadStatus
  reason: string                    // why this lead is a priority today
  suggested_action: string          // short action: "Call", "Send follow-up email", etc.
  suggested_message: string         // the actual thing to say/write
  urgency: 'high' | 'medium' | 'low'
  days_since_contact: number | null
}

export interface DigestStats {
  total_leads: number
  new_this_week: number
  pending_follow_ups: number
  pending_email_drafts: number
  proposals_out: number
  won_this_month: number
}

export interface DigestContent {
  greeting: string                  // "Good morning, here's your day..."
  summary: string                   // 1–2 sentence overview of the day
  priority_leads: PriorityLead[]    // top 5 leads to focus on
  stats: DigestStats
  action_items: string[]            // e.g. "Reply to 3 pending emails", "Follow up with Sarah"
}

export interface DailyDigest {
  id: string
  digest_date: string              // YYYY-MM-DD
  digest_type: DigestType
  content: DigestContent
  generated_at: string
}

// ----------------------------------------
// TODOS (Phase 2)
// ----------------------------------------
export type TodoType = 'manual' | 'digest_action' | 'email_task' | 'follow_up_task'

export interface Todo {
  id: string
  title: string
  description: string | null
  type: TodoType
  linked_lead_id: string | null
  linked_draft_id: string | null
  is_completed: boolean
  completed_at: string | null
  is_archived: boolean
  archived_at: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined (optional)
  lead?: Lead
  draft?: EmailDraft
}

export type TodoInsert = Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'lead' | 'draft'>

// ----------------------------------------
// TODO PAGE (legacy — kept for compatibility)
// ----------------------------------------
export type TodoItemType = 'email_draft' | 'follow_up' | 'digest'

export interface TodoEmailDraftItem {
  type: 'email_draft'
  priority: 'high' | 'medium' | 'low'
  draft: EmailDraft
}

export interface TodoFollowUpItem {
  type: 'follow_up'
  priority: 'high' | 'medium' | 'low'
  lead: Lead
  days_overdue: number
}

export type TodoItem = TodoEmailDraftItem | TodoFollowUpItem
