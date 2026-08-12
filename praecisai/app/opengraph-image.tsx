import { ImageResponse } from 'next/og';

/**
 * Social share card, generated at build time.
 *
 * Replaces the old 180x180 apple-touch-icon, which WhatsApp/LinkedIn/X were
 * stretching into a tiny pixelated thumbnail. Deliberately uses no external
 * fonts or images so the build never depends on a network fetch.
 */
export const alt = 'PraecisAI: AI calling agent that recovers outstanding payments for Indian B2B businesses';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CREAM = '#EDE0D4';
const CARAMEL = '#DDB892';
const WALNUT = '#B08968';
const RUST = '#9C6644';
const DARK = '#0F0A06';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: DARK,
          padding: 72,
          position: 'relative',
        }}
      >
        {/* Warm glow, top-right */}
        <div
          style={{
            position: 'absolute',
            top: -260,
            right: -160,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background: 'rgba(156,102,68,0.28)',
            display: 'flex',
          }}
        />

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 44, fontWeight: 700 }}>
          <span style={{ color: CREAM }}>Praecis</span>
          <span style={{ color: CARAMEL }}>AI</span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              color: RUST,
              letterSpacing: 4,
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            AI CALLING AGENT
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 78,
              lineHeight: 1.08,
              color: CREAM,
              fontWeight: 700,
              maxWidth: 940,
            }}
          >
            Stop chasing payments. Start recovering cash.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 34,
              color: WALNUT,
              marginTop: 26,
              maxWidth: 900,
            }}
          >
            AI voice calls and WhatsApp reminders that recover outstanding dues for Indian MSMEs.
          </div>
        </div>

        {/* Footer strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 28, color: CARAMEL }}>
          <span>praecisai.in</span>
          <span style={{ color: 'rgba(221,184,146,0.45)' }}>·</span>
          <span>Hindi + English calls</span>
          <span style={{ color: 'rgba(221,184,146,0.45)' }}>·</span>
          <span>Live in 10 minutes</span>
        </div>
      </div>
    ),
    size,
  );
}
