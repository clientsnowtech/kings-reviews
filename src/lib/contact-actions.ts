'use server'

import { z } from 'zod'
import { sendMail } from '@/lib/mail'
import { callerIp, rateLimit } from '@/lib/rate-limit'
import { GRIEVANCE, LEGAL_ENTITY } from '@/lib/legal'

export type ContactState = { error?: string; ok?: boolean; fieldErrors?: Record<string, string> }

const schema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(80),
  email: z.string().trim().email('That email does not look right.'),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(3, 'Add a subject.').max(120),
  message: z.string().trim().min(20, 'A few more words, please — at least 20 characters.').max(4000),
})

export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Hidden field no human ever sees; anything filled in here is a bot, and it
  // gets the same success screen so the bot has nothing to learn.
  if (String(formData.get('company') ?? '').trim()) return { ok: true }

  const parsed = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    subject: formData.get('subject'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_')
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }

  const key = await callerIp()
  if (!rateLimit(`contact:${key}`, 3, 10 * 60_000).ok) {
    return { error: 'Too many messages from here. Please try again in a few minutes.' }
  }

  const { name, email, phone, subject, message } = parsed.data

  await sendMail({
    to: GRIEVANCE.email,
    subject: `[Contact] ${subject}`,
    text: [
      `From: ${name} <${email}>`,
      phone ? `Phone: ${phone}` : null,
      '',
      message,
      '',
      '—',
      `Sent from the ${LEGAL_ENTITY} contact form.`,
    ]
      .filter((line) => line !== null)
      .join('\n'),
  })

  // sendMail swallows transport failures on purpose (see lib/mail.ts), so this
  // confirms "we have your message", not "the SMTP server accepted it".
  return { ok: true }
}
