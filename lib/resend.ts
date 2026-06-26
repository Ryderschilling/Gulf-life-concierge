import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY environment variable')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@livegulflife.com'
export const FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Gulf Life Concierge'
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`
