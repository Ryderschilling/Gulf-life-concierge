import { Resend } from 'resend'

// Lazy init — avoids module-level throw that breaks Vercel build
let _resend: Resend | null = null

export function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY environment variable')
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@livegulflife.com'
export const FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Gulf Life Concierge'
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`
