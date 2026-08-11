import Link from 'next/link'
import { Search } from 'lucide-react'
import type { Prisma, Role } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { Badge } from '@/components/admin-ui'
import { SubmitButton } from '@/components/submit-button'
import { Pagination } from '@/components/pagination'
import { setUserRole, sendOwnerWelcomeEmails } from '@/lib/admin-actions'
import { alreadyInvited } from '@/lib/password-token'
import { welcomeCandidates } from '@/lib/owner-welcome'
import { colorFrom, initials, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ROLES: (Role | 'ALL')[] = ['ALL', 'USER', 'BUSINESS', 'ADMIN']
const ASSIGNABLE: Role[] = ['USER', 'BUSINESS', 'ADMIN']

const PER_PAGE = 30

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; page?: string; welcome?: string }>
}) {
  const session = await requireAdmin()
  const { role, q, page: pageRaw, welcome } = await searchParams
  const filter = ROLES.includes(role as Role) ? (role as Role) : 'ALL'
  const page = Math.max(1, Number(pageRaw) || 1)

  const where: Prisma.UserWhereInput = {}
  if (filter !== 'ALL') where.role = filter
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }]

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { businesses: true, reviews: true } } },
    }),
  ])
  const pageCount = Math.ceil(total / PER_PAGE)

  // Owners of listings somebody else added: the account exists, but with no
  // password and no Google sign-in behind it there is no way into it. The
  // welcome mail is the only thing that unlocks them.
  const locked = await welcomeCandidates(true)
  const invited = await alreadyInvited(locked)
  const waiting = locked.length - invited.size

  // "sent.failed.left", handed back by the action through the URL
  const [sent = 0, failed = 0, left = 0] = (welcome ?? '').split('.').map(Number)

  return (
    <div className="space-y-5">
      {welcome && (
        <p className="rounded-xl border border-brand/30 bg-mint px-4 py-3 text-sm text-brand-strong">
          {sent} welcome {sent === 1 ? 'mail' : 'mails'} sent
          {failed > 0 && `, ${failed} failed`}
          {left > 0 ? ` — ${left} still to go, press the button again.` : ' — none left.'}
        </p>
      )}

      {locked.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-surface p-4">
          <div className="mr-auto min-w-0">
            <p className="font-semibold">Owner welcome mail</p>
            <p className="mt-0.5 text-sm text-muted">
              {locked.length} {locked.length === 1 ? 'owner has' : 'owners have'} no way in yet —
              no password, and no Google sign-in behind the address. The mail carries a
              set-password link that works for 14 days.{' '}
              {invited.size > 0 && `${invited.size} already hold a live link, `}
              {waiting} still to be mailed.
            </p>
          </div>
          <form action={sendOwnerWelcomeEmails}>
            <SubmitButton
              pendingLabel="Sending…"
              confirmMessage={`Send the welcome mail to ${Math.min(waiting, 100)} ${
                waiting === 1 ? 'owner' : 'owners'
              }?`}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
            >
              Send welcome mails
            </SubmitButton>
          </form>
          <form action={sendOwnerWelcomeEmails}>
            <input type="hidden" name="resend" value="1" />
            <SubmitButton
              pendingLabel="Sending…"
              title="Mail everyone again, including owners who already hold a link"
              confirmMessage="Mail every locked-out owner again, including the ones already invited?"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-muted hover:bg-mint"
            >
              Resend to all
            </SubmitButton>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Users</h2>
        <a
          href="/admin/export/users"
          className="rounded-lg border px-3 py-1.5 text-sm font-medium text-muted hover:bg-mint"
        >
          Export CSV
        </a>
        <form className="relative">
          {filter !== 'ALL' && <input type="hidden" name="role" value={filter} />}
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="h-9 w-64 rounded-full border bg-background pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => {
          const active = filter === r
          const params = new URLSearchParams()
          if (r !== 'ALL') params.set('role', r)
          if (q) params.set('q', q)
          const href = `/admin/users${params.toString() ? `?${params}` : ''}`
          return (
            <Link
              key={r}
              href={href}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                active ? 'bg-brand text-white' : 'border text-muted hover:bg-mint'
              }`}
            >
              {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
            </Link>
          )
        })}
      </div>

      {users.length === 0 ? (
        <p className="rounded-xl border bg-surface p-8 text-center text-muted">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b bg-background text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-center">Biz</th>
                <th className="px-4 py-3 text-center">Reviews</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Set role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === session.user.id
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                          style={{ background: colorFrom(u.email) }}
                        >
                          {initials(u.name ?? u.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name ?? '—'}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge status={u.role} /></td>
                    <td className="px-4 py-3 text-center">{u._count.businesses}</td>
                    <td className="px-4 py-3 text-center">{u._count.reviews}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-xs text-muted">You</span>
                      ) : (
                        <div className="flex gap-1">
                          {ASSIGNABLE.filter((r) => r !== u.role).map((r) => (
                            <form key={r} action={setUserRole}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="role" value={r} />
                              <SubmitButton
                                pendingLabel="…"
                                className="rounded-md border px-2 py-1 text-xs font-medium text-muted hover:bg-mint hover:text-foreground"
                              >
                                → {r.charAt(0) + r.slice(1).toLowerCase()}
                              </SubmitButton>
                            </form>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/admin/users"
        page={page}
        pageCount={pageCount}
        total={total}
        params={{ role: filter === 'ALL' ? undefined : filter, q }}
      />
    </div>
  )
}
