import type { Metadata } from 'next'
import { Mail, Phone } from 'lucide-react'
import { LegalPage, Section, Bullets } from '@/components/legal'
import { GRIEVANCE, LEGAL_ENTITY, OFFICE } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Grievance Redressal',
  description:
    'Contact the Grievance Officer of Kings Reviews for complaints about content, listings or personal data under the DPDP Act, 2023 and the IT Rules, 2021.',
}

/**
 * One page serving two statutes: the IT Rules, 2021 require a named Grievance
 * Officer with published contact details and fixed timelines, and the DPDP Act
 * §13 requires a readily available route for Data Principal complaints.
 */
export default function GrievancePage() {
  return (
    <LegalPage
      title="Grievance Redressal"
      intro={
        <>
          {LEGAL_ENTITY} is an intermediary under the Information Technology Act, 2000 and a Data
          Fiduciary under the Digital Personal Data Protection Act, 2023. If something on the
          platform harms you — a review, a listing, or the way we handled your personal data — this
          is how you reach us.
        </>
      }
    >
      <Section title="1. Grievance Officer">
        <div className="rounded-2xl border bg-surface p-5 shadow-soft">
          <p className="font-semibold text-foreground">{GRIEVANCE.name}</p>
          <p className="mt-1 text-muted">{LEGAL_ENTITY}</p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={`mailto:${GRIEVANCE.email}`}
              className="inline-flex items-center gap-2 font-medium text-brand hover:translate-x-0.5 hover:underline"
            >
              <Mail size={16} /> {GRIEVANCE.email}
            </a>
            <a
              href={`tel:${GRIEVANCE.phoneHref}`}
              className="inline-flex items-center gap-2 font-medium text-brand hover:translate-x-0.5 hover:underline"
            >
              <Phone size={16} /> {GRIEVANCE.phone}
            </a>
          </div>
          <address className="mt-4 not-italic leading-relaxed text-muted">
            {OFFICE.line1}
            <br />
            {OFFICE.line2}
            <br />
            {OFFICE.city}, {OFFICE.state} {OFFICE.pincode}
          </address>

          <p className="mt-4 text-xs text-muted">
            Phone lines are staffed Monday to Saturday, 10:00–18:00 IST. Email is monitored daily.
          </p>
        </div>
      </Section>

      <Section title="2. What you can raise here">
        <Bullets
          items={[
            'A review that is fake, paid, defamatory, abusive, obscene, or that reveals private information.',
            'A listing that impersonates your business, or business information that is wrong.',
            'Content that infringes your copyright, trademark or other rights.',
            'A request under the DPDP Act — access, correction, erasure, or withdrawal of consent.',
            'Any other complaint about how we run the platform.',
          ]}
        />
      </Section>

      <Section title="3. What to include">
        <p>
          So we can act without a second round of email, please send: your name and contact details;
          the exact URL of the review, reply or listing; what is wrong with it and under which
          ground; and — for rights-holder complaints — proof of the right you hold and a statement
          that the information in your complaint is accurate.
        </p>
        <p>
          Filing a false or frivolous complaint is a breach of your duties under §15 of the DPDP Act
          and may attract a penalty.
        </p>
      </Section>

      <Section title="4. Our timelines">
        <Bullets
          items={[
            <>
              <strong>Acknowledgement within {GRIEVANCE.ackHours} hours</strong> of receiving your
              complaint.
            </>,
            <>
              <strong>Resolution within {GRIEVANCE.resolveDays} days</strong>, as required by Rule
              3(2)(a) of the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
            </>,
            <>
              Content that is non-consensual, sexually explicit, or an impersonation is removed
              within <strong>24 hours</strong> of a valid complaint.
            </>,
            <>
              DPDP Act requests (access, correction, erasure) are answered within the same{' '}
              {GRIEVANCE.resolveDays} days, or sooner where the change is one you can make yourself
              from your profile.
            </>,
          ]}
        />
      </Section>

      <Section title="5. How we decide">
        <p>
          We check the complaint against our review policy and the law. We may contact the person
          who posted the content for their side before acting. Outcomes are: content removed,
          content kept with reasons, listing corrected, or the matter referred for legal advice. You
          are told the outcome and the reason for it.
        </p>
      </Section>

      <Section title="6. If you are not satisfied">
        <p>
          For personal data complaints you may escalate to the{' '}
          <strong>Data Protection Board of India</strong> under §13(3) of the DPDP Act, 2023. For
          other grievances you may pursue the remedies available to you under the Information
          Technology Act, 2000, the Consumer Protection Act, 2019, or any other law in force.
        </p>
      </Section>
    </LegalPage>
  )
}
