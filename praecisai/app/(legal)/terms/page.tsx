import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service · PraecisAI',
  description: 'The terms that govern your use of the PraecisAI platform.',
};

export default function TermsOfServicePage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: 19 July 2026</p>

      <h2>1. Agreement to these terms</h2>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the PraecisAI
        platform and website at <a href="https://praecisai.in">praecisai.in</a>{' '}(the
        &quot;Service&quot;), operated by PraecisAI (&quot;we&quot;, &quot;us&quot;,
        &quot;our&quot;) from Mumbai, India. By creating an account or using the Service, you agree
        to these Terms. If you are using the Service on behalf of a business, you confirm you have
        authority to bind that business.
      </p>

      <h2>2. The Service</h2>
      <p>
        PraecisAI is an AI-powered accounts receivable recovery platform. It lets businesses upload
        outstanding invoice data and automates payment follow-ups through AI voice calls, WhatsApp
        messages, account statements, and recovery reporting.
      </p>

      <h2>3. Accounts and eligibility</h2>
      <p>
        The Service is intended for business use by persons who are at least 18 years old. You are
        responsible for maintaining the security of your account, and for all activity that occurs
        under it. Sign-in is provided through Google; you must keep your Google account secure.
      </p>

      <h2>4. Your responsibilities</h2>
      <ul>
        <li>
          You confirm that the customer data you upload (names, phone numbers, outstanding amounts)
          is accurate and that you are lawfully entitled to use it for payment follow-up.
        </li>
        <li>
          You confirm you have the necessary consent or lawful basis to contact your customers by
          voice call and WhatsApp regarding amounts they owe you.
        </li>
        <li>
          You will comply with applicable Indian law, including the Digital Personal Data
          Protection Act, 2023, TRAI regulations on commercial communication, and any Do Not
          Disturb requirements applicable to your communications.
        </li>
        <li>
          You will not use the Service to harass, threaten, or mislead any person, or to pursue
          amounts that are not genuinely owed to you.
        </li>
      </ul>

      <h2>5. Fees and payment</h2>
      <p>
        Use of the platform is subject to the subscription fee and usage-based charges published on
        our <a href="https://praecisai.in/#pricing">pricing page</a>{' '}or agreed with you in writing.
        Fees are billed in Indian Rupees and are non-refundable except where required by law. We
        may revise pricing with at least 30 days&apos; notice.
      </p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>Do not attempt to access data belonging to another customer of the Service.</li>
        <li>Do not probe, scan, or test the vulnerability of the Service without authorisation.</li>
        <li>Do not resell or sublicense the Service without our written consent.</li>
        <li>Do not upload malicious code or use the Service to send unlawful communications.</li>
      </ul>

      <h2>7. Your data and intellectual property</h2>
      <p>
        You retain all rights to the business data you upload. You grant us a limited licence to
        process that data solely to provide the Service, as described in our{' '}
        <a href="/privacy">Privacy Policy</a>. The Service itself, including its software, design,
        and branding, remains our property.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The Service automates payment follow-up; it does not guarantee that any amount will be
        recovered. Communication outcomes depend on your customers, telecom networks, and messaging
        platforms outside our control. The Service is provided on an &quot;as is&quot; and &quot;as
        available&quot; basis without warranties of any kind, express or implied. PraecisAI is a
        software platform and does not provide legal advice or act as a debt collection agency.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, PraecisAI will not be liable for any indirect,
        incidental, special, or consequential damages, or for loss of profits, revenue, or data. Our
        total liability for any claim arising out of the Service is limited to the fees you paid us
        in the three months before the event giving rise to the claim.
      </p>

      <h2>10. Suspension and termination</h2>
      <p>
        You may stop using the Service and request account deletion at any time. We may suspend or
        terminate access for breach of these Terms, non-payment, or unlawful use, with notice where
        reasonably practicable. On termination, we will delete or return your data as described in
        our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Any dispute arising out of these Terms or
        the Service is subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra.
      </p>

      <h2>12. Changes to these terms</h2>
      <p>
        We may update these Terms from time to time. If we make material changes, we will notify
        you by email or through the platform before they take effect. Continued use of the Service
        after changes take effect constitutes acceptance of the revised Terms.
      </p>

      <h2>13. Contact us</h2>
      <p>
        PraecisAI · Mumbai, India
        <br />
        Email: <a href="mailto:hello@praecisai.in">hello@praecisai.in</a>
      </p>
    </article>
  );
}
