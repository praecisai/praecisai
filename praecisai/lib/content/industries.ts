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
  {
    slug: 'manufacturing',
    name: 'Manufacturing',
    metaTitle: 'AI Payment Recovery for Manufacturers | PraecisAI',
    metaDescription:
      'AI payment recovery for manufacturing businesses in India. Recover outstanding from dealers and distributors with automated Hindi and English voice calls.',
    h1: 'AI-Powered Payment Recovery for Manufacturing Businesses',
    eyebrow: 'Industries · Manufacturing',
    intro:
      'Payment recovery for a manufacturing business is a distributor-credit problem at scale. Manufacturers extending credit to dealer networks, OEM buyers and project customers often carry receivables across dozens of cities, with payment tied to dispatch cycles, quality approvals and project billing milestones. PraecisAI is an AI calling agent that automates the entire follow-up cycle — Hindi and English voice calls, WhatsApp reminders and branded ledger statements — so your accounts team can focus on disputes and escalations rather than routine chasing.',
    painPoints: [
      {
        title: 'Dealer credit spread across multiple regions',
        body: 'A manufacturer with dealers in Gujarat, Maharashtra and Delhi NCR cannot staff a follow-up team in each city. Outstanding ages quietly while nobody has time to call.',
      },
      {
        title: 'Payment tied to dispatch and quality approvals',
        body: 'Buyers withhold payment citing pending inspection, partial delivery or quality holds. Each excuse needs documentation and follow-up before the ledger moves.',
      },
      {
        title: 'Seasonal production cycles stress working capital',
        body: 'When a production run requires raw material payment before dealer receivables arrive, the gap between factory outflow and sales inflow becomes a cash crunch.',
      },
      {
        title: 'Long dealer relationships that need careful tone',
        body: 'A dealer who has moved your product for eight years still needs chasing, but aggressive calls risk the exclusivity arrangement. Tone has to match the relationship.',
      },
    ],
    howItHelps: [
      {
        title: 'Every dealer called on schedule, not just the big ones',
        body: 'PraecisAI works the full dealer outstanding list, calling each account in the time window you set, across every region, without adding headcount.',
      },
      {
        title: 'Escalation ladder matched to your credit terms',
        body: 'Configure day-ranges for each of the four stages — soft nudge at 30 days, firm reminder at 60, direct escalation at 90 — to match how your factory extends credit.',
      },
      {
        title: 'Disputes transferred live with full context',
        body: 'When a dealer raises a quality dispute on a call, it transfers live to your accounts manager with an instant WhatsApp briefing, so the conversation starts where the AI left off.',
      },
      {
        title: 'Branded statements the dealer can forward internally',
        body: 'A PDF ledger statement over WhatsApp gives the dealer\'s accounts team the data they need to process payment, removing the most common reason payments stall.',
      },
    ],
    stats: [
      { value: 'Multi-region', label: 'Dealer networks covered' },
      { value: '4 stages', label: 'Configurable escalation ladder' },
      { value: 'Hindi + English', label: 'AI voice call languages' },
    ],
    faqs: [
      {
        question: 'Can PraecisAI handle credit terms that differ by dealer?',
        answer:
          'Yes. Each account can have its own ageing schedule and grace periods, so a key dealer on 90-day terms is treated differently from a new dealer on 30-day terms.',
      },
      {
        question: 'Does it work with ledgers exported from our ERP?',
        answer:
          'Yes. We support Excel and CSV outstanding exports from most ERPs including Tally, SAP Business One and Busy. Direct integration is also available.',
      },
      {
        question: 'Can we exclude dealers under active dispute from automated calls?',
        answer:
          'Yes. Any account can be flagged as excluded from automated contact while still appearing in your ageing report.',
      },
    ],
  },
  {
    slug: 'distributors',
    name: 'Distributors',
    metaTitle: 'AI Collections for Distributors in India | PraecisAI',
    metaDescription:
      'AI collections for distributors in India. Recover outstanding from retailers and sub-dealers with automated AI voice calls, WhatsApp reminders and ledger statements.',
    h1: 'AI Collections for Distributors: Recover Outstanding from Retailers Automatically',
    eyebrow: 'Industries · Distributors',
    intro:
      'AI collections for distributors solves the highest-volume follow-up problem in B2B trade. A distributor with 500 retail accounts cannot call each one every week — so the small accounts never get chased and the outstanding quietly compounds. PraecisAI is an AI calling agent that covers your full retail outstanding list with Hindi and English voice calls, WhatsApp reminders and branded statements, so every retailer gets disciplined follow-up regardless of ticket size.',
    painPoints: [
      {
        title: 'Hundreds of small-ticket retailers that never justify a call',
        body: 'The long tail of accounts — each owing ₹5,000 to ₹50,000 — collectively holds a large share of your outstanding, but individually never justify the time of your collections team.',
      },
      {
        title: 'Multiple SKUs and credit notes muddy the ledger',
        body: 'Return credits, scheme deductions and short-delivery claims mean the retailer disputes the number on every call, and payment stalls until someone reconciles the account.',
      },
      {
        title: 'Field team collecting instead of filling orders',
        body: 'Sales reps doubling as collectors on their beat lose the time they need to build shelf space and push new SKUs. The cost is invisible but it compounds every month.',
      },
      {
        title: 'Peak seasons create simultaneous cash crunches',
        body: 'A new product launch or festive stocking cycle means large outflows before payment from the previous cycle has arrived, squeezing working capital exactly when you need it most.',
      },
    ],
    howItHelps: [
      {
        title: 'The long tail finally gets followed up',
        body: 'An AI call costs the same whether the account owes ₹5,000 or ₹5 lakh. Every retailer gets the same disciplined follow-up on the schedule you configure.',
      },
      {
        title: 'Credit notes netted before every call',
        body: 'Returns and scheme deductions are netted against the invoice, so the AI quotes a number the retailer can recognise rather than a gross figure that triggers an argument.',
      },
      {
        title: 'Sales reps go back to selling',
        body: 'Routine reminders, promise chasing and payment confirmations move off your field team so beat time goes into orders, not collections.',
      },
      {
        title: 'Weekly escalation report to the owner',
        body: 'Accounts past your value or ageing threshold surface in a weekly report to you and your accountant while recovery is still realistic.',
      },
    ],
    stats: [
      { value: '500+', label: 'Retail accounts manageable per distributor' },
      { value: 'Per-bill', label: 'Ageing with credit notes netted' },
      { value: 'Weekly', label: 'Owner escalation reports' },
    ],
    faqs: [
      {
        question: 'Can PraecisAI handle a mix of cash-and-carry and credit retailers?',
        answer:
          'Yes. Cash retailers can be excluded from automated contact. Only credit accounts with open outstanding get called, on the schedule you set.',
      },
      {
        question: 'What if a retailer disputes the outstanding amount?',
        answer:
          'The call transfers live to your accounts team with a WhatsApp briefing on what the retailer said, so the dispute can be resolved on the same call.',
      },
      {
        question: 'Can we set different follow-up cadences for different retailer tiers?',
        answer:
          'Yes. Each ageing stage has configurable day-ranges and grace periods, and individual accounts can have their own schedule override.',
      },
    ],
  },
  {
    slug: 'wholesalers',
    name: 'Wholesalers',
    metaTitle: 'AI Payment Recovery for Wholesalers | PraecisAI',
    metaDescription:
      'AI payment recovery for wholesalers in India. Automate credit follow-up across hundreds of trade buyers with AI voice calls and WhatsApp reminders.',
    h1: 'AI Payment Recovery for Wholesalers: Automate Credit Follow-Up at Scale',
    eyebrow: 'Industries · Wholesalers',
    intro:
      'Payment recovery for a wholesaler is a volume-and-relationship problem simultaneously. Wholesale businesses extending credit to retailers, contractors and institutional buyers often carry large party counts with wide variation in ticket size, relationship depth and payment behaviour. PraecisAI is an AI calling agent that covers your full outstanding list with Hindi and English voice calls, WhatsApp reminders and branded ledger statements — with an escalation tone that can be configured to match your oldest relationships and your newest accounts alike.',
    painPoints: [
      {
        title: 'Wide variation in buyer payment behaviour',
        body: 'A wholesale ledger can include buyers who pay on day 15 and others who routinely need six follow-up calls. One collection approach cannot cover both without damaging one relationship or failing to recover from the other.',
      },
      {
        title: 'Counter staff are selling, not collecting',
        body: 'The person who knows the buyer relationship is behind the counter moving stock, not on the phone chasing the outstanding from last month.',
      },
      {
        title: 'Seasonal demand creates large simultaneous exposures',
        body: 'A post-season or post-festival period can leave a wholesaler with large receivables from many buyers at the same time, exactly when working capital for the next stock cycle is needed.',
      },
      {
        title: 'Buyers use disputes to delay without resolving',
        body: 'A buyer who disputes one line item on a five-invoice account can hold all five payments while the dispute sits unresolved in your inbox.',
      },
    ],
    howItHelps: [
      {
        title: 'Tone configured per ageing stage, not per buyer',
        body: 'Stage day-ranges set the escalation curve automatically — a soft nudge at 30 days becomes a firm message at 90 — so long-term buyers are not treated like defaulters early.',
      },
      {
        title: 'Whole ledger covered, not just the top accounts',
        body: 'Every buyer with open outstanding gets called on schedule, whether they owe ₹10,000 or ₹10 lakh, because the cost of an AI call does not scale with ticket size.',
      },
      {
        title: 'Disputes isolated and escalated immediately',
        body: 'When a buyer raises a dispute on a call, the AI transfers live to your team with a WhatsApp briefing, so the dispute is isolated from the clean invoices on the same account.',
      },
      {
        title: 'Branded statements unblock payment faster',
        body: 'A PDF ledger statement over WhatsApp gives the buyer\'s accounts person exactly what they need to process payment — the number, the invoices, and the due dates.',
      },
    ],
    stats: [
      { value: 'All buyers', label: 'Full ledger covered, not just top accounts' },
      { value: '4 stages', label: 'Configurable tone escalation' },
      { value: 'Live transfer', label: 'Disputes to human, with context' },
    ],
    faqs: [
      {
        question: 'Can PraecisAI work with our existing Tally or Excel outstanding data?',
        answer:
          'Yes. Tally outstanding exports and Excel ledger dumps map automatically. We can also integrate directly with Tally to sync data without a daily upload.',
      },
      {
        question: 'Can we give certain buyers a longer grace period before calls start?',
        answer:
          'Yes. Grace periods are configurable per stage, and specific accounts can be excluded from automated contact entirely while still appearing in your ageing reports.',
      },
      {
        question: 'Will the AI sound different from our usual follow-up calls?',
        answer:
          'The AI introduces itself as calling on behalf of your business. The name, language and tone are configured to match your brand, not PraecisAI\'s.',
      },
    ],
  },
];

export function getIndustry(slug: string) {
  return industries.find((i) => i.slug === slug);
}
