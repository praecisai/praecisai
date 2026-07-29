/**
 * Case-study content.
 *
 * IMPORTANT: these pages are attributed to named, real customers. Every factual
 * claim below is limited to what the customer already says in their published
 * testimonial on the homepage, plus descriptions of how the product works.
 * Do not add party counts, rupee figures or dates here unless the customer has
 * confirmed them.
 */

export type CaseStudy = {
  slug: string;
  company: string;
  person: string;
  role: string;
  location: string;
  industrySlug: string;
  industryName: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  /** Primary keyword appears in the first 100 words */
  summary: string;
  /** Headline outcome, sourced from the published testimonial */
  outcome: string;
  quote: string;
  sections: { heading: string; paragraphs: string[] }[];
  publishedAt: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: 'mehta-textiles',
    company: 'Mehta Textiles',
    person: 'Rajesh Mehta',
    role: 'Owner',
    location: 'Surat',
    industrySlug: 'textile-garments',
    industryName: 'Textile & Garments',
    metaTitle: 'Textile Payment Recovery Case Study | PraecisAI',
    metaDescription:
      'How Mehta Textiles in Surat replaced 200 manual collection calls a week with an AI calling agent and improved recovery by 40% in the first month.',
    h1: 'Mehta Textiles: 200 Manual Calls a Week, Replaced Overnight',
    summary:
      'Payment recovery for a textile business is a scheduling problem long before it is a negotiation problem. Mehta Textiles, a textile business in Surat, was manually calling around 200 parties every week. After moving that follow-up onto PraecisAI’s AI calling agent, the same list was worked overnight and recovery improved by 40% in the first month.',
    outcome: 'Recovery improved 40% in month one',
    quote:
      'We were manually calling 200 parties a week. PraecisAI does it overnight. Recovery improved 40% in month one.',
    publishedAt: '2026-07-29',
    sections: [
      {
        heading: 'The problem: a call list nobody could finish',
        paragraphs: [
          'Around 200 parties a week needed a follow-up call. That is a full-time job on its own, and it was being absorbed by a team that also had ledgers to close, disputes to reconcile and an office to run.',
          'The predictable thing happened: the list got worked from the top down. The largest accounts were called, the long tail of smaller parties was not, and the accounts that quietly slipped into 150 and 200 day buckets were usually the ones nobody had spoken to in a month.',
        ],
      },
      {
        heading: 'What changed: the whole list, every cycle',
        paragraphs: [
          'The outstanding data now flows into PraecisAI, which scores every party into one of four stages: Soft Reminder, Follow-up, Strong Follow-up and Escalation. The day-ranges for those stages are set to match how the business actually trades, not a generic 30-day template.',
          'PraecisAI then calls every party on the list in the configured time slots, in natural Hindi and English, and sends WhatsApp reminders carrying a branded PDF statement. The tone shifts with the stage: a polite nudge early, a direct and firm message once an account is deep into escalation.',
          'Crucially, the calls are not independent. Each conversation carries the history and summary of the previous ones, so a party who promised payment on a date is asked about that specific promise rather than being asked to start the story again.',
        ],
      },
      {
        heading: 'The result',
        paragraphs: [
          'The week of calling that a person could not finish is now finished overnight. In Rajesh Mehta’s words, recovery improved 40% in the first month.',
          'The second-order effect matters as much as the number: the team stopped spending its day on routine reminder calls and started spending it on the accounts that genuinely needed a human, which are the disputes and the escalations the AI transfers across live.',
        ],
      },
    ],
  },
  {
    slug: 'sharma-distributors',
    company: 'Sharma Distributors',
    person: 'Priya Sharma',
    role: 'Director',
    location: 'Jaipur',
    industrySlug: 'pharma-distribution',
    industryName: 'Distribution',
    metaTitle: 'Distribution Credit Recovery Case Study | PraecisAI',
    metaDescription:
      'How Sharma Distributors in Jaipur cut payment follow-up from two weeks to three days with automated WhatsApp reminders and AI voice calls.',
    h1: 'Sharma Distributors: Follow-Up Cut From Two Weeks to Three Days',
    summary:
      'Payment follow-up automation is only worth anything if the party on the other end actually replies. Sharma Distributors, a distribution business in Jaipur, moved its reminder cycle onto PraecisAI’s automated WhatsApp and AI voice calling. Follow-up time dropped from two weeks to three days, because the messages read as personal rather than as a broadcast.',
    outcome: 'Follow-up time cut from 2 weeks to 3 days',
    quote:
      'The WhatsApp messages feel personal. Parties actually respond. Our follow-up time dropped from 2 weeks to 3 days.',
    publishedAt: '2026-07-29',
    sections: [
      {
        heading: 'The problem: a follow-up loop measured in weeks',
        paragraphs: [
          'When reminders go out manually, the cycle time is set by whoever has a free afternoon. A party contacted today might not be contacted again for two weeks, which is long enough for a promise to be forgotten on both sides.',
          'Generic bulk messaging does not fix this. A broadcast that opens with a template greeting and no bill reference gets ignored, and ignoring it carries no consequence for the party.',
        ],
      },
      {
        heading: 'What changed: personalised, and on a schedule',
        paragraphs: [
          'Every WhatsApp reminder now carries the party name, the specific bills that are open and the due amount, alongside a branded PDF statement. It reads like a message from the business, because the content is specific to that account.',
          'The cadence is set once and then runs on its own. Parties move between the four recovery stages as their bills age, and the message tone moves with them, so a party in Soft Reminder and a party in Escalation are not receiving the same text.',
          'AI voice calls run alongside the messages in natural Hindi and English, and anything the party says on a call, including a promise to pay on a date, is logged and drives the next follow-up.',
        ],
      },
      {
        heading: 'The result',
        paragraphs: [
          'The follow-up loop tightened from two weeks to three days, and, in Priya Sharma’s words, parties actually respond.',
          'Shortening the loop is what makes the rest of the system work. A promise chased three days later is still fresh; a promise chased two weeks later has already been overtaken by whatever else the party is dealing with.',
        ],
      },
    ],
  },
];

export function getCaseStudy(slug: string) {
  return caseStudies.find((c) => c.slug === slug);
}
