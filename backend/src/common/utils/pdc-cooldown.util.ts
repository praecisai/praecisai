/**
 * PDC cooldown: a party who has just paid by cheque must not be chased again
 * while that payment is still settling.
 *
 * `Outstanding.pdc_cooldown_until` is written by
 * `PdcService.detectClearedCheques` when a cheque is matched against a drop in
 * the party's outstanding. Everything that contacts a customer reads it through
 * the helpers here, so there is one definition of "in cooldown" rather than one
 * per channel.
 */

/** True while the party is inside an active PDC cooldown. */
export function isPdcCooldownActive(until: Date | null | undefined, now = new Date()): boolean {
  return !!until && until > now;
}

/** Whole days remaining, rounded up. Never returns less than 1 while active. */
export function pdcCooldownDaysLeft(until: Date, now = new Date()): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 86_400_000));
}

/** The message shown when a contact attempt is blocked by the cooldown. */
export function pdcCooldownMessage(customerName: string, until: Date, now = new Date()): string {
  const days = pdcCooldownDaysLeft(until, now);
  return (
    `${customerName} recently cleared a post-dated cheque. ` +
    `Contact is paused for ${days} more day${days !== 1 ? 's' : ''} ` +
    `(until ${until.toLocaleDateString('en-IN')}) so a paying party is not chased again.`
  );
}
