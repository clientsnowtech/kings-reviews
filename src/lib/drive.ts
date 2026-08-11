import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'

/**
 * The bit of Google Drive this site needs: a folder of its own, a file pushed
 * into it every week, and the old ones taken away again.
 *
 * Written against the REST API with fetch rather than googleapis, which is a
 * large client for four calls — and this host has run out of disk once already.
 *
 * The scope is drive.file, the narrowest one that can write: the app sees the
 * files it created and nothing else in the account. That is also why the folder
 * id is stored rather than looked up by name — a folder made by hand in the
 * browser is invisible from here.
 */
export const DRIVE_SCOPE = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CONSENT_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

export const FOLDER_NAME = 'TrustIndex backups'

function client(): { id: string; secret: string } {
  const id = process.env.AUTH_GOOGLE_ID
  const secret = process.env.AUTH_GOOGLE_SECRET
  if (!id || !secret) throw new Error('AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are not set')
  return { id, secret }
}

/** Where Google sends the admin back. Must match the console entry exactly. */
export function redirectUri(): string {
  const site = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? ''
  return `${site}/admin/backups/callback`
}

/** The consent screen. `state` is checked on the way back. */
export function consentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: client().id,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: DRIVE_SCOPE,
    // offline and consent together are what actually produce a refresh token:
    // without prompt=consent Google returns none for an account that has
    // approved this app before, and the connection would die an hour later.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${CONSENT_URL}?${params}`
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  id_token?: string
  error?: string
  error_description?: string
}

async function token(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const json = (await res.json()) as TokenResponse
  if (!res.ok || json.error) {
    throw new Error(json.error_description ?? json.error ?? `token endpoint said ${res.status}`)
  }
  return json
}

/** The one-time swap of the consent code for a refresh token worth keeping. */
export async function exchangeCode(
  code: string,
): Promise<{ refreshToken: string; email: string | null }> {
  const { id, secret } = client()
  const res = await token({
    code,
    client_id: id,
    client_secret: secret,
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  })
  if (!res.refresh_token) {
    throw new Error('Google returned no refresh token — remove the app from the account and retry')
  }
  return { refreshToken: res.refresh_token, email: emailFromIdToken(res.id_token) }
}

/**
 * The account's address, read out of the id token rather than fetched.
 *
 * It is only a label for the panel, and the token came straight from Google
 * over TLS a millisecond earlier — so this reads the payload without verifying
 * the signature. Nothing is authorised on the strength of it.
 */
function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null
  try {
    const payload = idToken.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof json.email === 'string' ? json.email : null
  } catch {
    return null
  }
}

/** A fresh hour-long access token. The refresh token lives until revoked. */
export async function accessToken(refreshToken: string): Promise<string> {
  const { id, secret } = client()
  const res = await token({
    client_id: id,
    client_secret: secret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  if (!res.access_token) throw new Error('Google returned no access token')
  return res.access_token
}

async function api<T>(access: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${access}`, ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    throw new Error(`Drive ${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`)
  }
  // delete answers 204 with no body
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

/** Makes the backups folder. Called once, at connect time. */
export async function createFolder(access: string): Promise<string> {
  const folder = await api<{ id: string }>(access, '/files?fields=id', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  return folder.id
}

/**
 * Pushes one dump up, resumably.
 *
 * A simple upload would hold the whole gzip in memory to send it, and this
 * account is capped at 3 GB with a Next build already inside it. The resumable
 * endpoint takes a stream instead, so the file goes past in chunks.
 */
export async function uploadFile(
  access: string,
  folderId: string,
  filePath: string,
  name: string,
): Promise<string> {
  const { size } = await stat(filePath)

  const start = await fetch(`${UPLOAD}?uploadType=resumable&fields=id`, {
    method: 'POST',
    headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name, parents: [folderId] }),
  })
  if (!start.ok) throw new Error(`Drive upload start → ${start.status} ${await start.text()}`)

  const session = start.headers.get('location')
  if (!session) throw new Error('Drive gave no resumable upload URL')

  const res = await fetch(session, {
    method: 'PUT',
    headers: { 'content-length': String(size), 'content-type': 'application/gzip' },
    body: Readable.toWeb(createReadStream(filePath)) as ReadableStream,
    // undici demands this whenever the body is a stream
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
  if (!res.ok) throw new Error(`Drive upload → ${res.status} ${await res.text()}`)

  const done = (await res.json()) as { id: string }
  return done.id
}

export type DriveFile = { id: string; name: string; createdTime: string; size?: string }

/** What is in the folder, newest first. */
export async function listFolder(access: string, folderId: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    orderBy: 'createdTime desc',
    fields: 'files(id,name,createdTime,size)',
    pageSize: '100',
  })
  const res = await api<{ files: DriveFile[] }>(access, `/files?${params}`)
  return res.files ?? []
}

export async function deleteFile(access: string, fileId: string): Promise<void> {
  await api<void>(access, `/files/${fileId}`, { method: 'DELETE' })
}

/** Drops the app's access. The folder and its files stay in the account. */
export async function revoke(refreshToken: string): Promise<void> {
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  })
}

export function folderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`
}
