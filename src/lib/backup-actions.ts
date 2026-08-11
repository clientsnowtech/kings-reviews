'use server'

import { spawn } from 'node:child_process'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from './admin'
import { db } from './db'
import { disconnectDrive, setKeep } from './backup'

/**
 * Runs the dump in a process of its own and returns immediately.
 *
 * A hundred thousand rows take minutes to dump and upload — far longer than a
 * server action may block, and the page would sit there holding the button.
 * The child writes its own BackupRun row, so the table on the page doubles as
 * the progress bar: RUNNING while it works, OK or FAILED when it lands.
 */
export async function runBackupNow() {
  const session = await requireAdmin()

  const root = process.cwd()
  const child = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      path.join(root, 'scripts', 'backup-db.ts'),
    ],
    {
      cwd: root,
      // Detached, with the streams let go: Passenger may recycle this web
      // process the moment the response is written, and a child still on its
      // pipes would die with it halfway through a dump.
      detached: true,
      stdio: 'ignore',
      env: process.env,
    },
  )
  child.unref()

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? '',
      action: 'backup.run',
      entity: 'backup',
      entityId: 'manual',
      detail: 'started from the panel',
    },
  })

  revalidatePath('/admin/backups')
}

export async function disconnectDriveAction() {
  const session = await requireAdmin()
  await disconnectDrive()
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorEmail: session.user.email ?? '',
      action: 'backup.drive.disconnect',
      entity: 'backup',
      entityId: 'drive',
    },
  })
  revalidatePath('/admin/backups')
}

export async function saveKeep(formData: FormData) {
  await requireAdmin()
  const keep = Number(formData.get('keep'))
  if (Number.isFinite(keep)) await setKeep(keep)
  revalidatePath('/admin/backups')
}
