// POST /api/sms/send
// Send an SMS to a lead via Twilio.
// Body: { lead_id: string, body: string }
// Returns 503 with a clear message if Twilio is not configured yet.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTwilioClient, TWILIO_FROM, twilioConfigured } from '@/lib/twilio'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!twilioConfigured()) {
      return NextResponse.json(
        { error: 'SMS not configured. Add Twilio credentials to .env.local to enable SMS.' },
        { status: 503 }
      )
    }

    const { lead_id, body: smsBody } = await req.json() as { lead_id: string; body: string }

    if (!lead_id || !smsBody) {
      return NextResponse.json({ error: 'lead_id and body are required' }, { status: 400 })
    }

    // Fetch lead phone number
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, phone')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead?.phone) {
      return NextResponse.json({ error: 'Lead not found or has no phone number' }, { status: 404 })
    }

    const client = getTwilioClient()
    if (!client) {
      return NextResponse.json({ error: 'Twilio client failed to initialize' }, { status: 503 })
    }

    // Send SMS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await (client as any).messages.create({
      from: TWILIO_FROM,
      to: lead.phone,
      body: smsBody,
    })

    // Log to sms_messages table
    await supabase.from('sms_messages').insert({
      lead_id,
      to_phone: lead.phone,
      body: smsBody,
      status: 'sent',
      twilio_sid: message.sid,
      direction: 'outbound',
      sent_at: new Date().toISOString(),
      created_by: user.id,
    })

    // Update lead last_contacted_at
    await supabase
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', lead_id)

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id,
      type: 'sms_sent',
      description: `SMS sent: "${smsBody.substring(0, 60)}${smsBody.length > 60 ? '...' : ''}"`,
      metadata: { twilio_sid: message.sid },
      created_by: user.id,
    })

    return NextResponse.json({ success: true, twilio_sid: message.sid })
  } catch (err) {
    console.error('[POST /api/sms/send]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
