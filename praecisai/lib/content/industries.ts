/**
 * Industry landing-page content.
 *
 * Each entry is one long-tail keyword cluster from the ranking blueprint.
 * Pure content: no backend calls, no form state.
 */

export type Industry = {
  slug: string;
  /** Nav / breadcrumb label */
  name: string;
  /** <60 chars — meta title */
  metaTitle: string;
  /** <155 chars — meta description */
  metaDescription: string;
  /** Keyword-matching H1 */
  h1: string;
  /** Primary keyword must appear in the first 100 words of this intro */
  intro: string;
  eyebrow: string;
  painPoints: { title: string; body: string }[];
  howItHelps: { title: string; body: string }[];
  /** Slug of the case study to feature, if any */
  caseStudy?: string;
  stats: { value: string; label: string }[];
  faqs: { question: string; answer: string }[];
};

export const industries: Industry[] = [
  {
    slug: 'textile-garments',
    name: 'Textile & Garments',
    metaTitle: 'Payment Recovery for Textile Business | PraecisAI',
    metaDescription:
      'AI payment recovery for textile and garment businesses in India. Automated Hindi and English calls, WhatsApp reminders and branded statements.',
    h1: 'AI-Powered Payment Recovery for Textile & Garment Businesses',
    eyebrow: 'Industries · Textile & Garments',
    intro:
      'Payment recovery for a textile business is a volume problem before it is a collections problem. Textile manufacturers, garment exporters and fabric distributors often carry hundreds of B2B credit accounts at once, with payment cycles stretching 90, 120, even 200+ days. PraecisAI is an AI calling agent that automates the entire follow-up cycle: Hindi and English voice calls, WhatsApp reminders and branded statements, so your team spends less time chasing and more time selling.',
    painPoints: [
      {
        title: 'Season-driven cash crunches',
        body: 'Order books swing hard around festive and wedding seasons. When buyers stretch payments through a slow month, working capital for the next production run disappears with them.',
      },
      {
        title: 'Hundreds of small-ticket parties',
        body: 'A single distributor can carry 400 to 1,500 active parties. Calling each one on schedule is simply not possible for a two or three person accounts team.',
      },
      {
        title: 'Relationships you cannot afford to damage',
        body: 'A buyer who has traded with you for fifteen years still needs chasing, but an aggressive call risks the relationship. Tone has to change with the age of the bill.',
      },
      {
        title: 'Ledger disputes over lot and quality',
        body: 'Short shipments, shade variation and rate differences turn into ledger disputes that stall payment until somebody in your office reconciles them line by line.',
      },
    ],
    howItHelps: [
      {
        title: 'Every party called, not just the big ones',
        body: 'PraecisAI works the full outstanding list, not the top twenty accounts your team has time for. Hundreds of parties get called in minutes, in the time slots you choose.',
      },
      {
        title: 'Tone that matches the ageing bucket',
        body: 'A soft polite nudge at 90 days, a direct and firm message at 200+. You set the day-ranges for each of the four stages, so the escalation curve matches how your business actually trades.',
      },
      {
        title: 'Disputes routed to a human immediately',
        body: 'When a buyer raises a shade or short-shipment dispute, the call transfers live to your accountant with an instant WhatsApp briefing, so nobody walks into the conversation cold.',
      },
      {
        title: 'Branded statements over WhatsApp',
        body: 'Every reminder can carry a branded PDF ledger statement, so the buyer sees exactly which bills are open instead of arguing about the number on the phone.',
      },
    ],
    caseStudy: 'mehta-textiles',
    stats: [
      { value: '90 to 200+', label: 'Typical credit days handled' },
      { value: '4 stages', label: 'Configurable escalation ladder' },
      { value: 'Hindi + English', label: 'AI voice call languages' },
    ],
    faqs: [
      {
        question: 'Does PraecisAI work with textile ledgers exported from Tally?',
        answer:
          'Yes. Tally outstanding exports map automatically, and our team can also integrate directly with Tally so the data syncs without a daily manual upload.',
      },
      {
        question: 'Can it handle parties with multiple open bills?',
        answer:
          'Yes. Ageing is calculated per bill, credit notes are netted off, and the branded statement sent to the party lists every open bill with its own age.',
      },
      {
        question: 'Will it call our oldest customers the same way as a new buyer?',
        answer:
          'Only if you want it to. Stage day-ranges and grace periods are configurable, and specific parties can be excluded from automated contact entirely.',
      },
    ],
  },
  {
    slug: 'pharma-distribution',
    name: 'Pharma Distribution',
    metaTitle: 'AI Collections for Pharma Distributors | PraecisAI',
    metaDescription:
      'AI collections for pharma distributors in India. Recover outstanding across chemists and stockists with AI voice calls and WhatsApp reminders.',
    h1: 'AI Collections for Pharma Distributors and Stockists',
    eyebrow: 'Industries · Pharma Distribution',
    intro:
      'AI collections for pharma distributors solves a problem that is structurally different from other trades: very high party counts, very thin margins, and credit spread across hundreds of retail chemists. PraecisAI is an AI calling agent that recovers outstanding payments automatically, using Hindi and English voice calls, WhatsApp reminders and branded ledger statements, without adding a single person to your collections team.',
    painPoints: [
      {
        title: 'Thin margins make every overdue rupee expensive',
        body: 'When you trade on single-digit margins, capital locked in a 120-day ledger costs far more proportionally than it does in a high-margin business.',
      },
      {
        title: 'Hundreds of retail chemists, each owing a little',
        body: 'The outstanding is not concentrated. It is spread across a long tail of small accounts that individually never justify a phone call, and collectively drain your working capital.',
      },
      {
        title: 'Field staff collect instead of selling',
        body: 'Representatives end up doubling as collection agents on their route, which quietly costs you the order they did not go and win.',
      },
      {
        title: 'Expiry and return credits muddy the ledger',
        body: 'Expiry returns and breakage credits mean the party genuinely disputes the number, and payment stalls until somebody reconciles the account.',
      },
    ],
    howItHelps: [
      {
        title: 'The long tail finally gets followed up',
        body: 'Small accounts get the same disciplined follow-up as large ones, because the cost of an AI call does not scale with the number of parties.',
      },
      {
        title: 'Field staff go back to selling',
        body: 'Routine reminders and promise chasing move off your representatives, so route time goes back into orders rather than collections.',
      },
      {
        title: 'Credit notes netted before the call',
        body: 'Ageing is calculated per bill with credit notes netted off, so the AI is quoting a number the party can actually recognise.',
      },
      {
        title: 'Escalation reports to the owner every week',
        body: 'Accounts past your threshold arrive as a weekly report to you and your accountant, so nothing silently ages past the point of recovery.',
      },
    ],
    stats: [
      { value: 'Long tail', label: 'Small accounts covered, not skipped' },
      { value: 'Per-bill', label: 'Ageing with credit notes netted' },
      { value: 'Weekly', label: 'Owner escalation reports' },
    ],
    faqs: [
      {
        question: 'Can PraecisAI handle a few thousand chemist accounts?',
        answer:
          'Yes. The platform is built for high party counts. Calls run in parallel across your outstanding list in the time slots you configure.',
      },
      {
        question: 'What happens when a chemist disputes an expiry credit?',
        answer:
          'The call transfers live to your accountant with an instant WhatsApp briefing on what was said, so the dispute gets resolved by a human on the same call.',
      },
      {
        question: 'Can we keep some stockists out of automated calling?',
        answer:
          'Yes. Any party can be marked as excluded from automated contact while still appearing in your reports and ageing.',
      },
    ],
  },
  {
    slug: 'hardware-building-materials',
    name: 'Hardware & Building Materials',
    metaTitle: 'Credit Recovery for Hardware Business | PraecisAI',
    metaDescription:
      'Credit recovery for hardware and building materials distributors in India. Automated AI calls and WhatsApp follow-ups for long project cycles.',
    h1: 'Credit Recovery for Hardware & Building Materials Distributors',
    eyebrow: 'Industries · Hardware & Building Materials',
    intro:
      'Credit recovery for a hardware business runs on project timelines, not invoice dates. Building materials distributors, sanitaryware dealers and hardware wholesalers sell to contractors and site buyers whose own payments arrive in irregular milestones. PraecisAI is an AI calling agent that keeps the follow-up running through those long cycles with Hindi and English voice calls, WhatsApp reminders and branded statements, so a promise made in month one is still being chased in month four.',
    painPoints: [
      {
        title: 'Payment tied to somebody else’s project milestone',
        body: 'A contractor genuinely cannot pay until their own running bill is cleared, so the follow-up has to survive months rather than weeks.',
      },
      {
        title: 'Promises that quietly expire',
        body: '"Next week after the site payment" is a real answer, but without a system it is forgotten by the time next week arrives.',
      },
      {
        title: 'Large ticket sizes, few second chances',
        body: 'One site account going bad can wipe out the margin on a quarter of sales, so early escalation matters more than in high-volume trades.',
      },
      {
        title: 'Counter staff are not collections staff',
        body: 'The people who know the account are busy serving walk-in trade, and follow-up ends up happening only when cash gets tight.',
      },
    ],
    howItHelps: [
      {
        title: 'Promises are logged and chased on the date',
        body: 'When a contractor commits to a date, PraecisAI records it and calls back exactly when due, or after the grace period you set for that stage.',
      },
      {
        title: 'Memory across every conversation',
        body: 'The fifth call already knows what was said on the previous four, so a site buyer never gets to restart the story from scratch.',
      },
      {
        title: 'Early escalation on large accounts',
        body: 'Accounts past your value or ageing threshold surface in the weekly escalation report to you and your accountant, while recovery is still realistic.',
      },
      {
        title: 'Statements the site office can act on',
        body: 'A branded PDF ledger over WhatsApp gives the contractor something to pass to their own accounts team, which is usually what actually unblocks payment.',
      },
    ],
    stats: [
      { value: 'Months', label: 'Follow-up horizon on project credit' },
      { value: 'Every call', label: 'Carries full conversation history' },
      { value: 'Per stage', label: 'Configurable grace periods' },
    ],
    faqs: [
      {
        question: 'Our payment cycles run 6 months. Does that break the system?',
        answer:
          'No. Stage day-ranges are configurable, so you can set an escalation ladder that matches project credit rather than 30-day terms.',
      },
      {
        question: 'Can it chase a specific promised date rather than a fixed cycle?',
        answer:
          'Yes. Promise-to-pay dates captured on a call drive the next call-back, with an optional grace period per stage.',
      },
      {
        question: 'Do we still control which accounts get escalated?',
        answer:
          'Yes. You set the value and ageing thresholds that move an account into escalation, and who receives the report.',
      },
    ],
  },
];

export function getIndustry(slug: string) {
  return industries.find((i) => i.slug === slug);
}
