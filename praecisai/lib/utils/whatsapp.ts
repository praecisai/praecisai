/**
 * WhatsApp deep links.
 *
 * ONE number for the whole site. There used to be a second one (917304862949)
 * on the closing CTA while the widget and footer used this one; a visitor who
 * noticed the mismatch would reasonably assume one of them was wrong. If a new
 * number is ever needed, change it here — never inline a `wa.me/...` href.
 *
 * `?text=` pre-fills the composer so the visitor lands on WhatsApp with the
 * message already typed and only has to press send.
 */

export const WHATSAPP_NUMBER = '918291485811';

/** E.164, for `tel:` links and schema.org `telephone`. */
export const WHATSAPP_TEL = '+91-8291485811';

/** Short, specific opener: says who they are and what they want in one line. */
export const WHATSAPP_PREFILL =
  "Hi PraecisAI! I'd like to know how your AI agent chases my outstanding payments.";

export function whatsappLink(message: string = WHATSAPP_PREFILL): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
