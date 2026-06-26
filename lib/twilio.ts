// Twilio is scaffolded but only initialized when keys are present.
// SMS features degrade gracefully when unconfigured.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let twilioClient: any = null

export function getTwilioClient() {
  if (twilioClient) return twilioClient

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN

  if (!sid || !token) return null

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require('twilio')
  twilioClient = twilio(sid, token)
  return twilioClient
}

export const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER ?? ''

export function twilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  )
}
