'use client'

import { useActionState } from 'react'
import { updateBusiness, type ActionState } from '@/lib/actions'
import { CategoryPicker, type CategoryGroup } from './category-picker'
import { LocationPicker } from './location-picker'

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

function Field({
  label, name, defaultValue, type = 'text', required, error, placeholder,
}: {
  label: string
  name: string
  defaultValue?: string
  type?: string
  required?: boolean
  error?: string
  placeholder?: string
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
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

export function BusinessEditForm({
  business,
  groups,
}: {
  business: Biz
  groups: CategoryGroup[]
}) {
  const [state, action, pending] = useActionState(updateBusiness, initial)
  const fe = state.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={business.id} />

      <CategoryPicker groups={groups} defaultCategoryId={business.categoryId} error={fe.categoryId} />

      <Field label="Tagline" name="tagline" defaultValue={business.tagline ?? ''} error={fe.tagline} placeholder="Short one-liner shown under your name" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact email" name="email" type="email" required defaultValue={business.email} error={fe.email} />
        <Field label="Phone" name="phone" required defaultValue={business.phone} error={fe.phone} placeholder="+91 …" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="WhatsApp" name="whatsapp" defaultValue={business.whatsapp ?? ''} error={fe.whatsapp} placeholder="+91 …" />
        <Field label="Website" name="website" defaultValue={business.website ?? ''} placeholder="https://…" error={fe.website} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Instagram" name="instagram" defaultValue={business.instagram ?? ''} error={fe.instagram} placeholder="@handle or URL" />
        <Field label="Facebook" name="facebook" defaultValue={business.facebook ?? ''} error={fe.facebook} placeholder="Page URL" />
      </div>

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

      <Field label="Address" name="address" defaultValue={business.address ?? ''} error={fe.address} />
      <LocationPicker
        defaultState={business.state}
        defaultCity={business.city}
        stateError={fe.state}
        cityError={fe.city}
      />
      <Field label="Pincode" name="pincode" defaultValue={business.pincode ?? ''} error={fe.pincode} />
      <Field label="Google Maps link" name="mapUrl" defaultValue={business.mapUrl ?? ''} error={fe.mapUrl} placeholder="https://maps.app.goo.gl/…" />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Logo</label>
          {business.logo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={business.logo} alt="" className="mb-2 h-16 w-16 rounded-lg border object-cover" />
          )}
          <input
            name="logo"
            type="file"
            accept="image/*"
            className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Cover</label>
          {business.cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={business.cover} alt="" className="mb-2 h-16 w-full rounded-lg border object-cover" />
          )}
          <input
            name="cover"
            type="file"
            accept="image/*"
            className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="h-11 rounded-lg bg-brand px-8 font-medium text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {state.ok && <span className="text-sm font-medium text-brand">Saved ✓</span>}
      </div>
    </form>
  )
}
