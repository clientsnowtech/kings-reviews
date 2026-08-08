'use client'

import { useActionState, useState } from 'react'
import {
  Undo2,
  X,
  Tags,
  PhoneCall,
  Share2,
  FileText,
  MapPin,
  ImageIcon,
  type LucideIcon,
} from 'lucide-react'
import { updateBusiness, type ActionState } from '@/lib/actions'
import { CategoryPicker, type CategoryOption } from './category-picker'
import { LocationPicker } from './location-picker'
import { ImageInput } from './image-input'

const initial: ActionState = {}

type Biz = {
  id: string
  categoryId: number
  email: string
  phone: string
  whatsapp: string | null
  website: string | null
  tagline: string | null
  description: string | null
  foundedYear: number | null
  instagram: string | null
  facebook: string | null
  address: string | null
  city: string
  state: string
  pincode: string | null
  mapUrl: string | null
  logo: string | null
  cover: string | null
}

/**
 * One card per subject.
 *
 * The form is long enough that a single column of inputs reads as a wall —
 * grouping it means someone here to fix a phone number finds the phone number
 * without scrolling through their photos on the way.
 */
function Card({
  title,
  desc,
  icon: Icon,
  children,
}: {
  title: string
  desc?: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border bg-surface p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint text-brand">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

function Field({
  label, name, defaultValue, type = 'text', required, error, placeholder, hint,
}: {
  label: string
  name: string
  defaultValue?: string
  type?: string
  required?: boolean
  error?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand"
      />
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

export function BusinessEditForm({
  business,
  categories,
  extraCategoryIds,
}: {
  business: Biz
  categories: CategoryOption[]
  extraCategoryIds?: number[]
}) {
  const [state, action, pending] = useActionState(updateBusiness, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={business.id} />

      <Card
        title="Trade and tagline"
        desc="Where you are filed in the directory, and the line under your name."
        icon={Tags}
      >
        <CategoryPicker
          categories={categories}
          defaultCategoryId={business.categoryId}
          defaultExtraIds={extraCategoryIds}
          error={fe.categoryId}
          extraName="extraCategoryIds"
        />
        <Field
          label="Tagline"
          name="tagline"
          defaultValue={business.tagline ?? ''}
          error={fe.tagline}
          placeholder="Short one-liner shown under your name"
        />
      </Card>

      {/* Each of these turns into one action button on the public profile. */}
      <Card
        title="Contact links"
        desc="Every field you fill becomes a button on your profile — Call, WhatsApp, Directions, Website, Email."
        icon={PhoneCall}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contact email" name="email" type="email" required defaultValue={business.email} error={fe.email} hint="Shown as the Email button." />
          <Field label="Phone" name="phone" required defaultValue={business.phone} error={fe.phone} placeholder="+91 …" hint="Shown as the Call button." />
          <Field label="WhatsApp" name="whatsapp" defaultValue={business.whatsapp ?? ''} error={fe.whatsapp} placeholder="+91 …" hint="Opens a wa.me chat." />
          <Field label="Website" name="website" defaultValue={business.website ?? ''} placeholder="https://…" error={fe.website} />
        </div>
        <Field
          label="Google Maps link"
          name="mapUrl"
          defaultValue={business.mapUrl ?? ''}
          error={fe.mapUrl}
          placeholder="https://maps.app.goo.gl/…"
          hint="Shown as the Directions button."
        />
      </Card>

      <Card title="Social profiles" desc="Optional. Shown as icons on your profile." icon={Share2}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram" name="instagram" defaultValue={business.instagram ?? ''} error={fe.instagram} placeholder="@handle or URL" />
          <Field label="Facebook" name="facebook" defaultValue={business.facebook ?? ''} error={fe.facebook} placeholder="Page URL" />
        </div>
      </Card>

      <Card
        title="About the business"
        desc="What a customer reads before deciding to call you."
        icon={FileText}
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={4}
            defaultValue={business.description ?? ''}
            placeholder="What does your business do?"
            className="w-full rounded-lg border bg-background p-3 outline-none focus:border-brand"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Founded year" name="foundedYear" type="number" defaultValue={business.foundedYear != null ? String(business.foundedYear) : ''} error={fe.foundedYear} placeholder="e.g. 2015" />
        </div>
      </Card>

      <Card
        title="Where you are"
        desc="Your city decides which searches you turn up in."
        icon={MapPin}
      >
        <Field label="Address" name="address" defaultValue={business.address ?? ''} error={fe.address} />
        <LocationPicker
          defaultState={business.state}
          defaultCity={business.city}
          stateError={fe.state}
          cityError={fe.city}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Pincode" name="pincode" defaultValue={business.pincode ?? ''} error={fe.pincode} />
        </div>
      </Card>

      <Card
        title="Logo and cover"
        desc="The logo rides your review card and badge; the cover heads your profile."
        icon={ImageIcon}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Logo</label>
            <ExistingImage
              src={business.logo}
              removeName="removeLogo"
              label="logo"
              className="h-16 w-16"
            />
            <ImageInput
              name="logo"
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cover</label>
            <ExistingImage
              src={business.cover}
              removeName="removeCover"
              label="cover"
              className="h-16 w-full"
            />
            <ImageInput
              name="cover"
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white"
            />
          </div>
        </div>
      </Card>

      {/* Sticky: the save button is otherwise six cards below whatever you just
          typed, and an edit nobody saved is an edit that did not happen. */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-surface/95 p-4 shadow-soft backdrop-blur">
        <button
          disabled={pending}
          className="h-11 rounded-lg bg-brand px-8 font-medium text-white transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {state.ok && <span className="text-sm font-medium text-brand">Saved ✓</span>}
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
        {!state.ok && !state.error && (
          <span className="text-sm text-muted">Changes apply to your public profile at once.</span>
        )}
      </div>
    </form>
  )
}

/**
 * The picture that is already saved, with an X on it.
 *
 * Deleting still happens on save — the hidden field carries the same
 * `removeLogo` / `removeCover` = "on" the server already reads — but the intent
 * is expressed by striking the image out rather than by a checkbox sitting
 * underneath it. Undo is there because the X is one click from destructive.
 */
function ExistingImage({
  src,
  removeName,
  label,
  className,
}: {
  src: string | null
  removeName: string
  label: string
  className: string
}) {
  const [removed, setRemoved] = useState(false)

  if (!src) return null

  if (removed) {
    return (
      <div className="mb-2 flex items-center gap-3 rounded-lg border border-dashed p-2 text-sm text-muted">
        <input type="hidden" name={removeName} value="on" />
        <span>The {label} is removed. Save to confirm.</span>
        <button
          type="button"
          onClick={() => setRemoved(false)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:border-brand hover:text-brand active:scale-95"
        >
          <Undo2 size={13} /> Undo
        </button>
      </div>
    )
  }

  return (
    <div className={`group relative mb-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full rounded-lg border object-cover" />
      <button
        type="button"
        onClick={() => setRemoved(true)}
        aria-label={`Remove the ${label}`}
        title={`Remove the ${label}`}
        className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border bg-white text-muted shadow-soft hover:border-danger hover:text-danger active:scale-90"
      >
        <X size={15} />
      </button>
    </div>
  )
}
