'use client'

import { useState } from 'react'
import { INDIAN_STATES } from '@/lib/locations'
import { SearchableSelect } from './searchable-select'

/**
 * State → City cascading selector. Pick a state, then its cities appear.
 * Submits `state` and `city`. On edit, an existing city not in the list is
 * preserved as an extra option.
 */
export function LocationPicker({
  defaultState,
  defaultCity,
  stateError,
  cityError,
}: {
  defaultState?: string
  defaultCity?: string
  stateError?: string
  cityError?: string
}) {
  const [state, setState] = useState(defaultState ?? '')

  const cities = INDIAN_STATES.find((s) => s.state === state)?.cities ?? []
  const select = 'h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-brand'

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium">
          State <span className="text-danger">*</span>
        </label>
        <select
          name="state"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className={select}
        >
          <option value="" disabled>
            Select a state
          </option>
          {INDIAN_STATES.map((s) => (
            <option key={s.state} value={s.state}>
              {s.state}
            </option>
          ))}
        </select>
        {stateError && <p className="mt-1 text-sm text-danger">{stateError}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          City <span className="text-danger">*</span>
        </label>
        {/* type to filter, pick from the list */}
        <SearchableSelect
          key={state}
          name="city"
          options={cities}
          defaultValue={state === defaultState ? (defaultCity ?? '') : ''}
          disabled={!state}
          required
          placeholder={state ? 'Type or pick a city' : 'Pick a state first'}
        />
        {cityError && <p className="mt-1 text-sm text-danger">{cityError}</p>}
      </div>
    </div>
  )
}
