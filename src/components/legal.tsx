import Link from 'next/link'
import { LEGAL_UPDATED } from '@/lib/legal'

/**
 * Shared shell for /privacy, /terms and /grievance so the three read as one
 * document set — same rhythm, same "last updated" stamp, same cross-links.
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LEGAL_UPDATED}</p>
      {intro && <p className="mt-4 text-sm leading-relaxed text-foreground/90">{intro}</p>}

      <div className="stagger mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>

      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t pt-6 text-sm">
        <LegalLink href="/privacy">Privacy Policy</LegalLink>
        <LegalLink href="/terms">Terms of Service</LegalLink>
        <LegalLink href="/grievance">Grievance Redressal</LegalLink>
      </nav>
    </article>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="mt-1 space-y-2">{children}</div>
    </section>
  )
}

/** Bulleted list with the same spacing as a Section paragraph. */
export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-block font-medium text-brand hover:translate-x-0.5 hover:underline">
      {children}
    </Link>
  )
}
