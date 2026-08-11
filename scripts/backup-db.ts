import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm, readdir, stat } from 'node:fs/promises'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { db } from '@/lib/db'
import { driveToken, backupView } from '@/lib/backup'
import { accessToken, uploadFile, listFolder, deleteFile } from '@/lib/drive'

/**
 * The weekly dump: mysqldump to disk, gzip on the way, then up to Drive.
 *
 * Run by cron through backup-db.sh, by `npm run db:backup`, and by the Back up
 * now button in the panel. Every path writes the same BackupRun row, because a
 * backup nobody can see the result of is a backup nobody trusts.
 */

const OUT = process.env.BACKUP_DIR ?? path.join(homedir(), 'backups')

type Conn = { user: string; pass: string; host: string; port: string; name: string }

/** Prisma's connection URL is the only place these credentials live. */
function connection(): Conn {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const u = new URL(url)
  return {
    // URL decodes %40 and friends on its own, which a hand-rolled parse of this
    // same string got wrong twice
    user: decodeURIComponent(u.username),
    pass: decodeURIComponent(u.password),
    host: u.hostname || '127.0.0.1',
    port: u.port || '3306',
    name: u.pathname.replace(/^\//, ''),
  }
}

/** YYYY-MM-DD-HHmm: the names sort by age, and two runs a day cannot collide. */
function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/**
 * mysqldump straight into a gzip stream.
 *
 * --no-tablespaces: this DB user has no PROCESS privilege on a shared host, and
 *   without the flag mysqldump quits before writing a byte.
 * --single-transaction: a consistent snapshot that does not lock the site out
 *   while a hundred thousand rows are read.
 * MYSQL_PWD rather than -p: the password would otherwise sit in the process
 *   list for every other account on the machine to read.
 */
async function dump(conn: Conn, target: string): Promise<void> {
  const child = spawn(
    'mysqldump',
    [
      '--no-tablespaces',
      '--single-transaction',
      '--quick',
      '--default-character-set=utf8mb4',
      '-h', conn.host,
      '-P', conn.port,
      '-u', conn.user,
      conn.name,
    ],
    { env: { ...process.env, MYSQL_PWD: conn.pass }, stdio: ['ignore', 'pipe', 'pipe'] },
  )

  let stderr = ''
  child.stderr.on('data', (chunk: Buffer) => {
    const line = chunk.toString()
    // it warns about passwords on the command line on every run; not a failure
    if (!line.includes('Using a password on the command line')) stderr += line
  })

  const finished = new Promise<void>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.trim() || `mysqldump exited ${code}`)),
    )
  })

  await Promise.all([
    pipeline(child.stdout, createGzip({ level: 9 }), createWriteStream(target)),
    finished,
  ])
}

/** Local copies, newest first. */
async function localBackups(): Promise<string[]> {
  const names = await readdir(OUT).catch(() => [] as string[])
  return names
    .filter((n) => n.startsWith('trustindex-') && n.endsWith('.sql.gz'))
    .sort()
    .reverse()
}

async function main() {
  const conn = connection()
  const fileName = `trustindex-${stamp()}.sql.gz`
  const finalPath = path.join(OUT, fileName)
  // Written as .part and renamed only once gzip has returned, so a run that
  // dies halfway never leaves something that looks like a good backup.
  const partPath = `${finalPath}.part`

  await mkdir(OUT, { recursive: true })
  const run = await db.backupRun.create({ data: { fileName, status: 'RUNNING' } })

  try {
    await dump(conn, partPath)
    await rename(partPath, finalPath)
    const { size } = await stat(finalPath)
    await db.backupRun.update({ where: { id: run.id }, data: { bytes: size } })

    const { keep } = await backupView()
    const drive = await driveToken()
    let driveFileId: string | null = null

    if (drive) {
      const access = await accessToken(drive.refreshToken)
      driveFileId = await uploadFile(access, drive.folderId, finalPath, fileName)

      // The Drive copy is the one that survives the server dying, so it is
      // pruned to the same depth rather than left to fill the account's quota.
      const remote = await listFolder(access, drive.folderId)
      for (const old of remote.slice(keep)) await deleteFile(access, old.id)
    }

    for (const old of (await localBackups()).slice(keep)) {
      await rm(path.join(OUT, old), { force: true })
    }

    await db.backupRun.update({
      where: { id: run.id },
      data: { status: 'OK', driveFileId, finishedAt: new Date() },
    })
    console.log(`backup ok: ${fileName}${driveFileId ? ' (uploaded)' : ' (local only)'}`)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await rm(partPath, { force: true })
    await db.backupRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error: message, finishedAt: new Date() },
    })
    console.error(`backup failed: ${message}`)
    process.exitCode = 1
  } finally {
    await db.$disconnect()
  }
}

main()
