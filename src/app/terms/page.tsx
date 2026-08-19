import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, Bullets } from '@/components/legal'
import { GRIEVANCE, LEGAL_ENTITY } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The rules for using Kings Reviews — posting reviews, running a listing, content removal, and your rights under the DPDP Act, 2023.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <>
          These terms are the agreement between you and {LEGAL_ENTITY} (“we”, “us”). By using the
          platform you accept them. Read them with our{' '}
          <Link href="/privacy" className="font-medium text-brand hover:underline">
            Privacy Policy
          </Link>
          , which forms part of this agreement.
        </>
      }
    >
      <Section title="1. About Kings Reviews">
        <p>
          {LEGAL_ENTITY} operates an online directory where consumers read and publish reviews of
          businesses in India. The service is free to use for consumers.
        </p>
      </Section>

      <Section title="2. Intermediary status">
        <p>
          We act as an “intermediary” under the Information Technology Act, 2000 and the IT
          (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. Reviews are
          user-generated content. We do not endorse, verify the accuracy of, or take responsibility
          for opinions expressed by users, and we claim safe-harbour protection under §79 of the IT
          Act for content we did not author.
        </p>
      </Section>

      <Section title="3. Your account">
        <p>
          You must be 18 or older to create an account. Give accurate information, keep your
          password to yourself, and tell us if you suspect unauthorised use. You are responsible for
          everything done through your account. We may suspend or close accounts used for fake
          reviews, abuse, impersonation or automated scraping.
        </p>
      </Section>

      <Section title="4. Posting reviews">
        <p>
          You may only post reviews based on genuine, first-hand experience. One review per business
          per account is allowed. The following are prohibited and may be removed without notice:
        </p>
        <Bullets
          items={[
            'Fake, incentivised or paid reviews, and reviews about your own or a competitor’s business.',
            'Defamatory, obscene, abusive, hateful or threatening content.',
            'Someone else’s personal data — phone numbers, addresses, staff names, documents or photos posted without their consent.',
            'Content that infringes copyright, trademark or any other right.',
            'Content unlawful under Indian law, or prohibited by Rule 3(1)(b) of the IT Rules, 2021.',
          ]}
        />
        <p>
          You keep ownership of what you post and grant us a non-exclusive, royalty-free, worldwide
          licence to host, display, reproduce and distribute it on the platform and in our badges
          and widgets, for as long as it remains published.
        </p>
      </Section>

      <Section title="5. Personal data in your content">
        <p>
          When you include another person’s personal data in a review, you must have a lawful basis
          to do so. Under §15 of the DPDP Act, 2023, you must not impersonate anyone, suppress
          material information, or submit false particulars. We remove content that exposes personal
          data without consent as soon as we are told about it.
        </p>
      </Section>

      <Section title="6. Business listings">
        <p>
          Business owners are responsible for the accuracy of the information they submit. Listings
          may be shown as “Unverified” until verification is complete. Owners may reply publicly to
          reviews but may not demand, incentivise or condition service on a review, nor threaten a
          reviewer. Attempting to manipulate ratings can get a listing suspended.
        </p>
      </Section>

      <Section title="7. Moderation, content removal & takedown">
        <p>
          We may remove content or suspend accounts that violate these terms or the law, and we act
          on lawful orders from a court or authorised government agency. Rights holders and affected
          parties can request removal via our{' '}
          <Link href="/grievance" className="font-medium text-brand hover:underline">
            Grievance Officer
          </Link>{' '}
          — acknowledgement within {GRIEVANCE.ackHours} hours, resolution within{' '}
          {GRIEVANCE.resolveDays} days.
        </p>
      </Section>

      <Section title="8. Your privacy rights">
        <p>
          Our{' '}
          <Link href="/privacy" className="font-medium text-brand hover:underline">
            Privacy Policy
          </Link>{' '}
          is the notice required by §5 of the DPDP Act, 2023. It explains what we collect, why, and
          how to exercise your rights to access, correction, erasure, nomination and grievance
          redressal, and how to withdraw consent at any time.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          The platform is provided “as is”. To the extent permitted by law, we are not liable for
          any indirect or consequential loss, or for loss arising from reliance on user reviews or
          business information. Nothing here limits liability that cannot be limited under Indian
          law.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These terms are governed by the laws of India. Courts at the place of our registered
          office have exclusive jurisdiction, subject to any consumer forum rights you have under
          the Consumer Protection Act, 2019.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update these terms from time to time. The “last updated” date above reflects the
          version in force, and continued use after a change constitutes acceptance. Questions:{' '}
          <a href={`mailto:${GRIEVANCE.email}`} className="font-medium text-brand hover:underline">
            {GRIEVANCE.email}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  )
}
