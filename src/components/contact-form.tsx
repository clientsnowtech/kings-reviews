'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Send } from 'lucide-react'
import { sendContactMessage, type ContactState } from '@/lib/contact-actions'

const initial: ContactState = {}

const inputCls = 'h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand'

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessage, initial)
  const fe = state.fieldErrors ?? {}

  if (state.ok) {
    return (
      <div className="animate-scale-in rounded-2xl border bg-surface p-8 text-center shadow-soft">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-brand">
          <CheckCircle2 size={24} />
        </span>
        <h2 className="mt-4 text-lg font-bold">Message sent</h2>
        <p className="mt-1 text-sm text-muted">
          Thanks for writing in. We reply on working days, usually within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="text-lg font-bold">Send us a message</h2>
      <p className="mt-1 text-sm text-muted">Fill this in and it lands straight in our inbox.</p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="contact-name">
              Your name <span className="text-danger">*</span>
            </label>
            <input id="contact-name" name="name" autoComplete="name" className={inputCls} />
            {fe.name && <p className="mt-1 text-sm text-danger">{fe.name}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="contact-email">
              Email <span className="text-danger">*</span>
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              className={inputCls}
            />
            {fe.email && <p className="mt-1 text-sm text-danger">{fe.email}</p>}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="contact-phone">
              Phone <span className="text-muted">(optional)</span>
            </label>
            <input
              id="contact-phone"
              name="phone"
              autoComplete="tel"
              placeholder="+91 …"
              className={inputCls}
            />
            {fe.phone && <p className="mt-1 text-sm text-danger">{fe.phone}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="contact-subject">
              Subject <span className="text-danger">*</span>
            </label>
            <input
              id="contact-subject"
              name="subject"
              placeholder="e.g. Claiming my business listing"
              className={inputCls}
            />
            {fe.subject && <p className="mt-1 text-sm text-danger">{fe.subject}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="contact-message">
            Message <span className="text-danger">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={6}
            placeholder="What can we help with?"
            className="w-full rounded-lg border bg-background p-3 outline-none focus:border-brand"
          />
          {fe.message && <p className="mt-1 text-sm text-danger">{fe.message}</p>}
        </div>

        {/* Honeypot: off-screen and hidden from AT, so only a bot fills it. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <button
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-6 font-medium text-white hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
        >
          <Send size={16} />
          {pending ? 'Sending…' : 'Send message'}
        </button>

        <p className="text-xs leading-relaxed text-muted">
          We use these details only to reply to you — see our{' '}
          <Link href="/privacy" className="font-medium text-brand hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </form>
  )
}
