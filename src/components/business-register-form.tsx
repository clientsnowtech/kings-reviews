'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerBusiness, type ActionState } from '@/lib/actions'
import { CategoryPicker, type CategoryOption } from './category-picker'
import { LocationPicker } from './location-picker'
import { ImageInput } from './image-input'

const initial: ActionState = {}
const inputCls = 'h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand'

function Field({
  label, name, type = 'text', required, error, placeholder, hint, defaultValue,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  error?: string
  placeholder?: string
  hint?: string
  defaultValue?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} className={inputCls} />
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="border-t pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-base font-semibold">{title}</h2>
      {desc && <p className="mb-4 mt-0.5 text-sm text-muted">{desc}</p>}
      <div className={desc ? 'space-y-5' : 'mt-4 space-y-5'}>{children}</div>
    </section>
  )
}

export function BusinessRegisterForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState(registerBusiness, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-8">
      {/* 1. Basics */}
      <Section title="Business details" desc="The essentials customers see first.">
        <Field label="Business name" name="name" required error={fe.name} placeholder="e.g. Spice Villa Restaurant" />
        <Field
          label="Tagline"
          name="tagline"
          error={fe.tagline}
          placeholder="e.g. Authentic North-Indian dining since 2010"
          hint="A short one-liner shown under your name."
        />
        <CategoryPicker categories={categories} error={fe.categoryId} extraName="extraCategoryIds" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Founded year"
            name="foundedYear"
            type="number"
            error={fe.foundedYear}
            placeholder="e.g. 2015"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={4}
            placeholder="What does your business do? Services, specialities, what makes you stand out…"
            className="w-full rounded-lg border bg-background p-3 outline-none focus:border-brand"
          />
          <p className="mt-1 text-xs text-muted">Tip: 40+ characters helps your profile completeness.</p>
        </div>
      </Section>

      {/* 2. Media */}
      <Section title="Logo & cover" desc="Optional now — you can add these later from your dashboard.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Logo</label>
            <ImageInput
              name="logo"
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white"
              hint="Square image works best."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cover</label>
            <ImageInput
              name="cover"
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white"
              hint="Wide banner shown on your profile."
            />
          </div>
        </div>
      </Section>

      {/* 3. Contact */}
      <Section
        title="Contact"
        desc="Each field becomes an action button on your profile — Call, WhatsApp, Directions, Website, Email."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contact email" name="email" type="email" required error={fe.email} placeholder="contact@business.in" hint="Shown as the Email button." />
          <Field label="Phone" name="phone" required error={fe.phone} placeholder="+91 …" hint="Shown as the Call button." />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="WhatsApp" name="whatsapp" error={fe.whatsapp} placeholder="+91 …" hint="Opens a wa.me chat." />
          <Field label="Website" name="website" error={fe.website} placeholder="https://…" />
        </div>
        <Field
          label="Google Maps link"
          name="mapUrl"
          error={fe.mapUrl}
          placeholder="https://maps.app.goo.gl/…"
          hint="Paste your Google Maps share link — shown as the Directions button."
        />
      </Section>

      {/* 4. Social */}
      <Section title="Social profiles" desc="Optional — links to your social pages.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram" name="instagram" error={fe.instagram} placeholder="@handle or profile URL" />
          <Field label="Facebook" name="facebook" error={fe.facebook} placeholder="Page URL" />
        </div>
      </Section>

      {/* 5. Location */}
      <Section title="Location" desc="Where you operate.">
        <Field label="Address" name="address" error={fe.address} placeholder="Shop / building, street, area" />
        <LocationPicker stateError={fe.state} cityError={fe.city} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Pincode" name="pincode" error={fe.pincode} placeholder="e.g. 400001" />
        </div>
      </Section>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        disabled={pending}
        className="h-11 w-full rounded-lg bg-brand px-8 font-medium text-white hover:bg-brand-strong disabled:opacity-60 sm:w-auto"
      >
        {pending ? 'Submitting…' : 'List my business'}
      </button>

      {/* DPDP Act §5 notice at the point of collection — the footer link alone
          is not "before or at the time" consent is taken. */}
      <p className="text-xs leading-relaxed text-muted">
        By submitting you confirm you are authorised to list this business, accept our{' '}
        <Link href="/terms" className="font-medium text-brand hover:underline">
          Terms of Service
        </Link>
        , and consent to the processing of the details above as described in our{' '}
        <Link href="/privacy" className="font-medium text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  )
}
