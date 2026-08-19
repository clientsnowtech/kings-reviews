import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, Bullets } from '@/components/legal'
import { CookieSettingsButton } from '@/components/cookie-consent'
import { GRIEVANCE, LEGAL_ENTITY } from '@/lib/legal'
import {
  CONSENT_CATEGORIES,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_REJECT_MAX_AGE,
} from '@/lib/consent'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Kings Reviews collects, uses, shares and protects personal data under the Digital Personal Data Protection Act, 2023.',
}

/**
 * Written as a DPDP Act §5 notice: what is collected, why, on what basis, and
 * how a Data Principal exercises the rights in §§11–14. Section numbers are
 * quoted so a reader (or the Board) can match each clause to the statute.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          This notice explains how {LEGAL_ENTITY} (“we”, “us”) collects and processes your personal
          data, and the rights you have over it. It is issued under the Digital Personal Data
          Protection Act, 2023 (“DPDP Act”) and the Information Technology Act, 2000 and the rules
          made under them.
        </>
      }
    >
      <Section title="1. Who we are (Data Fiduciary)">
        <p>
          {LEGAL_ENTITY} operates an online directory where consumers read and publish reviews of
          businesses in India. For the personal data described below we are the{' '}
          <strong>Data Fiduciary</strong> — we decide why and how it is processed. You are the{' '}
          <strong>Data Principal</strong>.
        </p>
        <p>
          Contact for all privacy matters: <ContactLine />
        </p>
      </Section>

      <Section title="2. Personal data we collect">
        <Bullets
          items={[
            <>
              <strong>Account data</strong> — name, email address, password (stored only as a hash),
              profile photo, and any two-factor authentication settings you enable.
            </>,
            <>
              <strong>Content you publish</strong> — reviews, ratings, photos, replies and reports.
              This is public by design and is shown with your display name.
            </>,
            <>
              <strong>Business data</strong> — if you register a listing: business name, address,
              contact details, category, opening hours, logo and any verification documents you
              upload.
            </>,
            <>
              <strong>Technical data</strong> — IP address, device and browser information, and
              session cookies needed to keep you signed in and to detect fake or duplicate reviews.
            </>,
            <>
              <strong>Communications</strong> — emails you send us, including grievances and
              takedown requests.
            </>,
          ]}
        />
        <p>
          We do not ask for financial account details, government identifiers or biometric data, and
          you should not post them in a review.
        </p>
      </Section>

      <Section title="3. Why we process it, and on what basis">
        <p>
          We process personal data only for the purposes below. Where the DPDP Act requires consent,
          you give it when you create an account, publish content or register a business; where the
          Act permits processing as a “certain legitimate use” (§7) — for example responding to your
          own request, or complying with a law — we rely on that.
        </p>
        <Bullets
          items={[
            'Creating and securing your account, and signing you in.',
            'Publishing your reviews, ratings, photos and replies on the platform.',
            'Verifying that a review is genuine and that a business listing is real, including fraud and spam checks.',
            'Sending service email — verification, password reset, review status, replies to your review.',
            'Handling grievances, takedown requests and legal notices.',
            'Producing aggregate statistics (for example a category’s average rating) that do not identify you.',
          ]}
        />
        <p>
          We do not sell your personal data, and we do not use it for automated decisions that
          produce legal effects on you.
        </p>
      </Section>

      <Section title="4. Consent, and how to withdraw it">
        <p>
          Consent is asked for in clear terms, is limited to the purposes listed above, and can be
          withdrawn at any time — from{' '}
          <Link href="/my/profile" className="font-medium text-brand hover:underline">
            your profile
          </Link>{' '}
          or by writing to us. Withdrawing is as easy as giving.
        </p>
        <p>
          Withdrawal does not make earlier lawful processing unlawful, and we may still keep data
          the law requires us to keep. If you withdraw consent for account processing, we close the
          account and stop processing except where retention is legally required.
        </p>
      </Section>

      <Section title="5. Your rights as a Data Principal">
        <Bullets
          items={[
            <>
              <strong>Right to information and access (§11)</strong> — a summary of the personal
              data we process about you, what we do with it, and who we have shared it with.
            </>,
            <>
              <strong>Right to correction and erasure (§12)</strong> — correct inaccurate data,
              complete incomplete data, update it, or have it erased where we are no longer required
              to keep it.
            </>,
            <>
              <strong>Right to grievance redressal (§13)</strong> — a readily available route to
              complain to us, described in section 12 below.
            </>,
            <>
              <strong>Right to nominate (§14)</strong> — nominate another person to exercise these
              rights on your behalf in the event of your death or incapacity.
            </>,
          ]}
        />
        <p>
          Use your profile settings for the routine cases (edit profile, delete a review, delete
          your account), or write to <ContactLine /> for anything else. We respond within the
          timelines in section 12.
        </p>
      </Section>

      <Section title="6. Your duties as a Data Principal (§15)">
        <p>
          The DPDP Act also places duties on you: do not impersonate anyone while providing personal
          data, do not suppress material information, do not register a false or frivolous grievance
          or complaint, and provide only authentic information when exercising the right to
          correction or erasure. Breaching these duties is punishable under the Act.
        </p>
      </Section>

      <Section title="7. Who we share data with">
        <Bullets
          items={[
            <>
              <strong>The public</strong> — your display name, profile photo and the content you
              publish. Your email address is never shown publicly.
            </>,
            <>
              <strong>The business you reviewed</strong> — so it can post a public reply. It sees
              only what is already public.
            </>,
            <>
              <strong>Data Processors</strong> — hosting, email delivery and error monitoring
              providers acting on our instructions under contract, and only for the purposes above.
            </>,
            <>
              <strong>Authorities</strong> — where disclosure is required by law, court order, or a
              lawful request from an agency authorised under the IT Act.
            </>,
          ]}
        />
      </Section>

      <Section title="8. Retention and erasure">
        <p>
          We keep personal data only as long as the purpose it was collected for needs it, or as
          long as a law requires. When you delete your account we erase your account data and
          instruct our processors to do the same; published reviews are either deleted or retained
          without your identity where they are needed for the integrity of a business’s rating. Logs
          kept for fraud prevention and legal compliance are retained for the period the law
          prescribes.
        </p>
      </Section>

      <Section title="9. Security safeguards">
        <p>
          We use reasonable security safeguards to prevent a personal data breach: passwords stored
          as salted hashes, optional two-factor authentication, encrypted transport (HTTPS),
          role-based access to admin tools, and audit logging of administrative actions. No system
          is perfect — if a breach occurs we will notify the Data Protection Board of India and
          every affected Data Principal, as required by §8(6) of the DPDP Act.
        </p>
      </Section>

      <Section title="10. Children and persons with a guardian">
        <p>
          The platform is not intended for anyone under 18. We do not knowingly process a child’s
          personal data without verifiable consent of a parent or lawful guardian, and we do not
          undertake tracking, behavioural monitoring or targeted advertising directed at children
          (§9 of the DPDP Act). If you believe a child has created an account, tell us and we will
          remove it.
        </p>
      </Section>

      <Section title="11. Cookies and transfers outside India">
        <p>
          Cookies fall into four groups. Only the first is set without asking, because the service
          cannot run without it; the other three stay off until you switch them on.
        </p>
        <Bullets
          items={CONSENT_CATEGORIES.map((category) => (
            <>
              <strong>{category.title}</strong>
              {category.required ? ' (always on)' : ''} — {category.body}{' '}
              <span className="text-muted">{category.examples}.</span>
            </>
          ))}
        />
        <p>
          Your choice is stored in a cookie named <code>{CONSENT_COOKIE}</code>, along with the date
          you made it. If you allow any category it is kept for{' '}
          {Math.round(CONSENT_MAX_AGE / 60 / 60 / 24 / 30)} months; if you refuse everything it is
          kept for {CONSENT_REJECT_MAX_AGE / 60 / 60} hours, after which the banner asks once more.
          A refusal is honoured in full for as long as it lasts — no tag loads and nothing is
          stored — and refusing again is a single click. Change or withdraw your choice at any time
          —{' '}
          <CookieSettingsButton className="font-medium text-brand hover:underline" /> — and we
          delete the third-party cookies that the categories you switched off had already set. You
          can also clear or block cookies in the browser itself, but then you will not be able to
          stay signed in.
        </p>
        <p>
          Data is hosted in India. Where a processor stores or handles data outside India, the
          transfer is made only to countries not restricted by the Central Government under §16 of
          the DPDP Act, and under contractual safeguards.
        </p>
      </Section>

      <Section title="12. Grievances and escalation">
        <p>
          Write to our {GRIEVANCE.name}: <ContactLine />. We acknowledge within{' '}
          {GRIEVANCE.ackHours} hours and resolve within {GRIEVANCE.resolveDays} days, as required by
          the IT Rules, 2021. Full details are on the{' '}
          <Link href="/grievance" className="font-medium text-brand hover:underline">
            Grievance Redressal page
          </Link>
          .
        </p>
        <p>
          If we do not respond, or you are not satisfied with the outcome, you may complain to the{' '}
          <strong>Data Protection Board of India</strong> under §13(3) of the DPDP Act.
        </p>
      </Section>

      <Section title="13. Changes to this notice">
        <p>
          We may update this notice. Material changes are announced on the platform, and the “last
          updated” date above always reflects the version in force. Where a change needs fresh
          consent, we will ask for it before processing on the new basis.
        </p>
      </Section>
    </LegalPage>
  )
}

function ContactLine() {
  return (
    <>
      <a href={`mailto:${GRIEVANCE.email}`} className="font-medium text-brand hover:underline">
        {GRIEVANCE.email}
      </a>{' '}
      ·{' '}
      <a href={`tel:${GRIEVANCE.phoneHref}`} className="font-medium text-brand hover:underline">
        {GRIEVANCE.phone}
      </a>
    </>
  )
}
