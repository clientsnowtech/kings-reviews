import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 21 July 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <Section title="1. About TrustIndex">
          TrustIndex India (“we”, “us”) operates an online directory where consumers read and
          publish reviews of businesses in India. By using the platform you agree to these terms.
        </Section>
        <Section title="2. Intermediary status">
          We act as an “intermediary” under the Information Technology Act, 2000 and applicable
          rules. Reviews are user-generated content. We do not endorse, verify the accuracy of, or
          take responsibility for opinions expressed by users.
        </Section>
        <Section title="3. Posting reviews">
          You may only post reviews based on genuine, first-hand experience. Fake, paid, defamatory,
          abusive, or misleading reviews are prohibited and may be removed. One review per business
          per account is allowed.
        </Section>
        <Section title="4. Business listings">
          Business owners are responsible for the accuracy of the information they submit. Listings
          may be shown as “Unverified” until verification is complete.
        </Section>
        <Section title="5. Content removal & takedown">
          We may remove content that violates these terms or the law. Rights holders and affected
          parties may request removal via our{' '}
          <a href="/grievance" className="font-medium text-brand hover:underline">Grievance Officer</a>.
        </Section>
        <Section title="6. Limitation of liability">
          The platform is provided “as is”. To the extent permitted by law, we are not liable for
          any loss arising from reliance on user reviews or business information.
        </Section>
        <Section title="7. Changes">
          We may update these terms from time to time. Continued use after changes constitutes
          acceptance.
        </Section>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1">{children}</p>
    </section>
  )
}
