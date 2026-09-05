// Tone/script styles a demo agent can use. Each slug maps to a full set of
// segment scripts in demo.service.ts (SEGMENT_INSTRUCTIONS_BY_STYLE). Kept in a
// standalone file so the admin module can validate/label styles without pulling
// in the demo service (and its OpenAI client).
export const SEGMENT_STYLES = [
  { slug: 'formal', label: 'Formal · Meena (default)' },
  { slug: 'professional', label: 'Professional · Meena (staged)' },
  { slug: 'friendly', label: 'Friendly · Meena (warm)' },
  { slug: 'honest_male', label: 'Honest · Rahul (male)' },
] as const;

export type ScriptStyle = (typeof SEGMENT_STYLES)[number]['slug'];

export const DEFAULT_STYLE: ScriptStyle = 'formal';

export const VALID_STYLE_SLUGS: readonly string[] = SEGMENT_STYLES.map((s) => s.slug);
