import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy · PraecisAI',
  description:
    'How PraecisAI collects, uses, and protects your data, including data accessed through Google sign-in.',
};

export default function PrivacyPolicyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: 19 July 2026</p>

      <h2>1. Who we are</h2>
      <p>
        PraecisAI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an AI-powered accounts
        receivable recovery platform for Indian businesses, operated from Mumbai, India and
        available at{' '}
        <a href="https://praecisai.in">praecisai.in</a>. This policy explains what information we
        collect, how we use it, and the choices you have. For questions, contact us at{' '}
        <a href="mailto:hello@praecisai.in">hello@praecisai.in</a>.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> when you sign in with Google, we receive your name,
          email address, and profile picture from your Google account. We do not receive or store
          your Google password.
        </li>
        <li>
          <strong>Business data you upload:</strong> to provide the service, you upload accounts
          receivable data such as customer names, phone numbers, invoice details, outstanding
          balances, and payment history. This data belongs to you.
        </li>
        <li>
          <strong>Communication records:</strong> logs, transcripts, and outcomes of automated
          voice calls and WhatsApp messages sent through the platform on your behalf.
        </li>
        <li>
          <strong>Usage data:</strong> basic technical information such as log data, device and
          browser type, and pages visited, used to operate and improve the service.
        </li>
      </ul>

      <h2>3. Google user data</h2>
      <p>
        We access only your basic Google profile (name, email address, and profile picture) to
        create and authenticate your account. We do not access your Gmail, Google Drive, contacts,
        or any other Google data. Our use of information received from Google APIs adheres to the{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including its Limited Use requirements. We never sell Google user data, never use it for
        advertising, and never share it except as needed to operate the service. You can revoke our
        access at any time from your{' '}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google account permissions
        </a>
        .
      </p>

      <h2>4. How we use information</h2>
      <ul>
        <li>To create and secure your account and authenticate you.</li>
        <li>
          To operate the platform: sending payment reminders by automated voice call and WhatsApp,
          generating account statements and recovery reports, and tracking payment promises.
        </li>
        <li>To provide customer support and respond to your requests.</li>
        <li>To bill for the service and maintain required business records.</li>
        <li>To monitor, secure, and improve the platform.</li>
      </ul>
      <p>We do not sell your data or your customers&apos; data to anyone.</p>

      <h2>5. Sharing with service providers</h2>
      <p>
        We share data only with the infrastructure providers needed to run the service, such as our
        database and authentication provider, our voice-calling provider, and our WhatsApp
        messaging provider. Each provider processes data only on our instructions and only to
        deliver its part of the service.
      </p>
      <p>
        We may also disclose information if required by law, or to protect the rights, safety, or
        property of PraecisAI, our users, or others.
      </p>

      <h2>6. Data storage and security</h2>
      <p>
        Your data is stored in secure, access-controlled cloud infrastructure. Data is encrypted in
        transit, access is restricted per business account so one customer can never see
        another&apos;s data, and we follow industry-standard practices to protect against
        unauthorised access, alteration, or loss. No method of storage is 100% secure, but we work
        to protect your information using reasonable security safeguards consistent with the
        Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.
      </p>

      <h2>7. Data retention and deletion</h2>
      <p>
        We retain your data for as long as your account is active or as needed to provide the
        service and meet legal obligations. You can request deletion of your account and associated
        data at any time by emailing{' '}
        <a href="mailto:hello@praecisai.in">hello@praecisai.in</a>. We will delete your data within
        30 days of a verified request, except where retention is required by law.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Subject to applicable law, including the Digital Personal Data Protection Act, 2023, you
        have the right to access the personal data we hold about you, correct inaccurate data,
        request deletion, and withdraw consent. To exercise any of these rights, contact us at{' '}
        <a href="mailto:hello@praecisai.in">hello@praecisai.in</a>.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use essential cookies to keep you signed in and to secure your session, and basic
        analytics to understand how the site is used. We do not use cookies for third-party
        advertising.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. If we make material changes, we will notify
        you by email or through the platform. The &quot;Last updated&quot; date at the top shows
        when this policy was last revised.
      </p>

      <h2>11. Contact us</h2>
      <p>
        PraecisAI · Mumbai, India
        <br />
        Email: <a href="mailto:hello@praecisai.in">hello@praecisai.in</a>
      </p>
    </article>
  );
}
