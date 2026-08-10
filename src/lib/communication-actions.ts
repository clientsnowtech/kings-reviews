'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from './db'
import { requireAdmin } from './admin'
import { forgetMailer, sendMail } from './mail'
import { saveMailConfig } from './mail-settings'

const PAGE = '/admin/communication'

async function logAudit(
  session: Awaited<ReturnType<typeof requireAdmin>>,
  action: string,
  detail: string,
) {
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? '',
      action,
      entity: 'mail',
      entityId: 'settings',
      detail,
    },
  })
}

/** Long SMTP errors are worth reading, but not worth a URL this long. */
function short(message: string): string {
  return message.length > 180 ? `${message.slice(0, 180)}…` : message
}

export async function saveCommunicationSettings(formData: FormData) {
  const session = await requireAdmin()

  const host = String(formData.get('host') ?? '').trim()
  const port = Number(formData.get('port') ?? 587)
  const username = String(formData.get('username') ?? '').trim()
  // blank leaves the stored key alone — the form never sends the old one back,
  // so an empty field means "unchanged", not "delete it"
  const password = String(formData.get('password') ?? '').trim()
  const fromName = String(formData.get('fromName') ?? '').trim()
  const fromEmail = String(formData.get('fromEmail') ?? '').trim()
  const enabled = formData.get('enabled') === 'on'

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    redirect(`${PAGE}?error=${encodeURIComponent('Host and port are both required.')}`)
  }
  if (!fromEmail) {
    redirect(
      `${PAGE}?error=${encodeURIComponent('A from address is required — Brevo rejects mail from an address it has not verified.')}`,
    )
  }

  await saveMailConfig({ host, port, username, password, fromName, fromEmail, enabled })
  forgetMailer()

  await logAudit(
    session,
    'mail.settings',
    `${host}:${port} as ${username || 'no auth'}, from ${fromEmail}, ${enabled ? 'enabled' : 'disabled'}${password ? ', key replaced' : ''}`,
  )

  revalidatePath(PAGE)
  redirect(`${PAGE}?saved=1`)
}

/**
 * Sends a real message through the saved settings.
 *
 * Nothing else here reports a transport failure — sendMail swallows them so a
 * dead mail server cannot stop a review being posted — so without this button
 * the only way to learn a key is wrong is a customer never getting an email.
 */
export async function sendTestEmail(formData: FormData) {
  const session = await requireAdmin()
  const to = String(formData.get('to') ?? '').trim()

  if (!to) redirect(`${PAGE}?error=${encodeURIComponent('Type an address to send the test to.')}`)

  const result = await sendMail({
    to,
    subject: 'TrustIndex test email',
    text: [
      'This is a test from Admin → Communication.',
      '',
      'If you are reading it, the SMTP settings work and notifications will go out the same way.',
      '',
      `Sent by ${session.user.email ?? 'an admin'}.`,
    ].join('\n'),
  })

  await logAudit(session, 'mail.test', `${to} — ${result.ok ? 'sent' : (result.error ?? 'skipped')}`)

  revalidatePath(PAGE)
  if (result.ok) redirect(`${PAGE}?test=${encodeURIComponent(to)}`)
  redirect(
    `${PAGE}?error=${encodeURIComponent(
      result.skipped
        ? 'Nothing was sent — sending is switched off, or no settings are saved.'
        : short(result.error ?? 'The mail server refused it.'),
    )}`,
  )
}

export async function clearEmailLog() {
  const session = await requireAdmin()
  const { count } = await db.emailLog.deleteMany({})
  await logAudit(session, 'mail.log.clear', `${count} entries`)
  revalidatePath(PAGE)
}
