/**
 * Minimal RFC 4180 CSV reader.
 *
 * Uploaded sheets come out of Excel and Google Sheets, so a naive
 * `split(',')` mangles every address that contains a comma and every
 * description that spans lines. This walks the text instead: quotes toggle
 * literal mode, `""` is an escaped quote, and CRLF counts as one break.
 */
export function parseCsv(text: string): string[][] {
  // Excel prefixes UTF-8 exports with a BOM, which would land in the first header
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < src.length; i++) {
    const c = src[i]

    if (quoted) {
      if (c !== '"') cell += c
      else if (src[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = false
      continue
    }

    if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else cell += c
  }

  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }

  // a trailing newline, or a sheet exported with empty padding rows
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** `Founded Year`, `founded_year` and `foundedyear` are the same column. */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

export type CsvRecord = {
  /** 1-based line in the file, header included — what the admin sees in Excel */
  line: number
  get(...keys: string[]): string
}

/**
 * Turn parsed rows into header-keyed records.
 *
 * `get()` takes aliases so a sheet headed "Business Name" or "name" both work,
 * and every value comes back trimmed — sheets are full of stray spaces.
 */
export function csvRecords(rows: string[][]): { headers: string[]; records: CsvRecord[] } {
  if (rows.length === 0) return { headers: [], records: [] }

  const headers = rows[0].map(normalizeHeader)
  const records = rows.slice(1).map((cells, i) => ({
    line: i + 2,
    get(...keys: string[]) {
      for (const key of keys) {
        const at = headers.indexOf(normalizeHeader(key))
        if (at !== -1) {
          const value = (cells[at] ?? '').trim()
          if (value) return value
        }
      }
      return ''
    },
  }))

  return { headers, records }
}

/** Split a multi-value cell — commas are taken by CSV itself, so use `|` or `;`. */
export function csvList(value: string): string[] {
  return value
    .split(/[|;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
