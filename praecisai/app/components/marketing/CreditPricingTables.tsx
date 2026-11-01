import { IconPhone, IconBrandWhatsapp, IconCheck } from '@tabler/icons-react';
import {
  CALL_PACK_MINUTES,
  CALL_RATES,
  MODEL_NAMES,
  WHATSAPP_PACKS,
  callPackPrice,
  rupees,
  type ModelTier,
} from '../../../lib/pricing/credits';

const TIERS: ModelTier[] = ['A', 'B', 'C'];

const PERKS = ['Bigger packs, better rates', 'Pay only for answered calls', 'Credits never expire', 'Optional autopay'];

/**
 * Prepaid credit packs for calls and WhatsApp, shown under the plan prices on
 * the homepage and /pricing. 1 call credit = 1 minute, 1 WhatsApp credit =
 * 1 message; bigger packs cost less per credit. Display only: the backend's
 * credit-packs.util.ts decides what is charged.
 */
export default function CreditPricingTables() {
  return (
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-5 text-left">
      {/* Calls */}
      <div className="min-w-0 lg:col-span-3 rounded-2xl border border-[var(--caramel)]/50 bg-[var(--surface-warm)] px-4 py-4 sm:px-6 sm:py-6 shadow-[0_4px_20px_rgba(127,85,57,0.07)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--mahogany)]/10">
            <IconPhone size={17} className="text-[var(--mahogany)]" stroke={1.75} />
          </div>
          <div>
            <p className="font-display text-[14px] sm:text-[16px] font-semibold text-[var(--dark-brown)]">AI call credits</p>
            <p className="font-body text-[11px] sm:text-[12px] text-[var(--walnut)]">1 credit = 1 minute of talk time</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse font-body text-[12px] sm:text-[13px]">
            <thead>
              <tr className="text-[var(--walnut)]">
                <th className="py-2 pr-3 text-left font-semibold">Credits</th>
                {TIERS.map((t) => (
                  <th key={t} className="py-2 px-2 text-right font-semibold">
                    {MODEL_NAMES[t].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CALL_PACK_MINUTES.map((minutes, i) => (
                <tr key={minutes} className="border-t border-[var(--caramel)]/30">
                  <td className="py-2.5 pr-3 font-semibold text-[var(--dark-brown)] whitespace-nowrap">
                    {minutes.toLocaleString('en-IN')} min
                  </td>
                  {TIERS.map((t) => (
                    <td key={t} className="py-2.5 px-2 text-right whitespace-nowrap">
                      <span className="font-semibold text-[var(--dark-brown)]">{rupees(callPackPrice(t, i))}</span>
                      <span className="block text-[11px] text-[var(--walnut)]">₹{CALL_RATES[t][i].toFixed(2)} / min</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="min-w-0 lg:col-span-2 rounded-2xl border border-[var(--caramel)]/50 bg-[var(--surface-warm)] px-4 py-4 sm:px-6 sm:py-6 shadow-[0_4px_20px_rgba(127,85,57,0.07)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--mahogany)]/10">
            <IconBrandWhatsapp size={17} className="text-[var(--mahogany)]" stroke={1.75} />
          </div>
          <div>
            <p className="font-display text-[14px] sm:text-[16px] font-semibold text-[var(--dark-brown)]">WhatsApp credits</p>
            <p className="font-body text-[11px] sm:text-[12px] text-[var(--walnut)]">1 credit = 1 message sent</p>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse font-body text-[12px] sm:text-[13px]">
          <thead>
            <tr className="text-[var(--walnut)]">
              <th className="py-2 pr-3 text-left font-semibold">Credits</th>
              <th className="py-2 text-right font-semibold">Pack price</th>
            </tr>
          </thead>
          <tbody>
            {WHATSAPP_PACKS.map((p) => (
              <tr key={p.messages} className="border-t border-[var(--caramel)]/30">
                <td className="py-2.5 pr-3 font-semibold text-[var(--dark-brown)] whitespace-nowrap">
                  {p.messages.toLocaleString('en-IN')} messages
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  <span className="font-semibold text-[var(--dark-brown)]">{rupees(p.price)}</span>
                  <span className="block text-[11px] text-[var(--walnut)]">
                    ₹{(p.price / p.messages).toFixed(2)} / message
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="lg:col-span-5 flex flex-wrap justify-center gap-2 sm:gap-3">
        {PERKS.map((perk) => (
          <li
            key={perk}
            className="flex items-center gap-1.5 rounded-full bg-[var(--sand)] px-3.5 py-1.5 font-body text-[11.5px] sm:text-[12.5px] font-medium text-[var(--dark-brown)]/85"
          >
            <IconCheck size={13} className="shrink-0 text-[var(--mahogany)]" stroke={2.25} />
            {perk}
          </li>
        ))}
      </ul>
    </div>
  );
}
