import { db } from './db'
import { encryptSecret, decryptSecret } from './mail-settings'
import { accessToken, createFolder, revoke } from './drive'

/**
 * The Drive connection behind the weekly dump, and the record of what it did.
 *
 * The token is encrypted with the same key as the SMTP password (derived from
 * AUTH_SECRET) and never leaves this module in the clear — the panel is shown
 * the account's address and nothing more.
 */
const ROW_ID = 1

export type BackupView = {
  connected: boolean
  driveEmail: string | null
  driveFolderId: string | null
  connectedAt: Date | null
  keep: number
}

export async function backupView(): Promise<BackupView> {
  const row = await db.backupSetting.findUnique({ where: { id: ROW_ID } })
  return {
    connected: !!row?.driveToken,
    driveEmail: row?.driveEmail ?? null,
    driveFolderId: row?.driveFolderId ?? null,
    connectedAt: row?.connectedAt ?? null,
    keep: row?.keep ?? 4,
  }
}

/** The token itself, for the two callers that actually talk to Drive. */
export async function driveToken(): Promise<{ refreshToken: string; folderId: string } | null> {
  const row = await db.backupSetting.findUnique({ where: { id: ROW_ID } })
  if (!row?.driveToken || !row.driveFolderId) return null
  return { refreshToken: decryptSecret(row.driveToken), folderId: row.driveFolderId }
}

/**
 * Stores a fresh connection and gives it a folder.
 *
 * The folder is made here rather than on the first backup because this is the
 * one moment an admin is watching: a folder that cannot be created says so on
 * the screen, instead of in a log file at three on a Sunday morning.
 */
export async function connectDrive(refreshToken: string, email: string | null): Promise<void> {
  const folderId = await createFolder(await accessToken(refreshToken))
  const data = {
    driveToken: encryptSecret(refreshToken),
    driveEmail: email,
    driveFolderId: folderId,
    connectedAt: new Date(),
  }
  await db.backupSetting.upsert({
    where: { id: ROW_ID },
    update: data,
    create: { id: ROW_ID, ...data },
  })
}

/** Forgets the connection here and hands the token back to Google. */
export async function disconnectDrive(): Promise<void> {
  const row = await db.backupSetting.findUnique({ where: { id: ROW_ID } })
  if (!row) return
  if (row.driveToken) {
    // Best effort: a token Google has already dropped must not block the panel
    // from clearing a connection the admin can see is dead.
    try {
      await revoke(decryptSecret(row.driveToken))
    } catch {}
  }
  await db.backupSetting.update({
    where: { id: ROW_ID },
    data: { driveToken: null, driveEmail: null, driveFolderId: null, connectedAt: null },
  })
}

export async function setKeep(keep: number): Promise<void> {
  const value = Math.min(52, Math.max(1, Math.round(keep)))
  await db.backupSetting.upsert({
    where: { id: ROW_ID },
    update: { keep: value },
    create: { id: ROW_ID, keep: value },
  })
}

export async function recentRuns(take = 20) {
  return db.backupRun.findMany({ orderBy: { startedAt: 'desc' }, take })
}

/** Human sizes for the panel — a byte count says nothing at a glance. */
export function humanSize(bytes: number): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`
}
