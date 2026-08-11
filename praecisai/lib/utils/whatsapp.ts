/**
 * WhatsApp deep links.
 *
 * `?text=` pre-fills the composer so the visitor lands on WhatsApp with the
 * message already typed and only has to press send.
 *
 * NOTE: the site currently uses two different numbers — the floating widget and
 * the footer point at 918291485811, while the closing CTA points at
 * 917304862949. Both are kept as-is here; consolidate if that is unintentional.
 */

export const WHATSAPP_SUPPORT_NUMBER = '918291485811';
export const WHATSAPP_SALES_NUMBER = '917304862949';

/** Short, specific opener: says who they are and what they want in one line. */
export const WHATSAPP_PREFILL =
  "Hi PraecisAI! I'd like to know how your AI agent chases my outstanding payments.";

export function whatsappLink(number: string, message: string = WHATSAPP_PREFILL): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
