/**
 * Origin the BROWSER uses for API calls.
 *
 * - "https://api.praecisai.in" : call the backend host directly.
 * - unset OR empty             : same-origin proxy. Requests go to /api/v1/...
 *   on this domain and the Next rewrite (see next.config.ts, API_PROXY_TARGET)
 *   forwards them server-side. This keeps *.up.railway.app out of the
 *   visitor's DNS path, which some Indian ISP resolvers fail to resolve
 *   (ERR_NAME_NOT_RESOLVED).
 *
 * Why the NODE_ENV split: Vercel's dashboard does not reliably store an empty
 * string, so "same-origin" has to also be what an ABSENT variable means in a
 * production build. Locally an absent variable still has to mean
 * localhost:3001, because there is no proxy in front of `next dev`... except
 * there is (the same rewrite), but pointing dev straight at the backend keeps
 * error messages and CORS behaviour obvious while developing.
 *
 * Never read process.env.NEXT_PUBLIC_API_BASE_URL directly with `||`: an empty
 * string is falsy, so `|| 'http://localhost:3001'` would point production at
 * the visitor's own machine.
 */
const configured = process.env.NEXT_PUBLIC_API_BASE_URL;

export const API_ORIGIN =
  configured && configured.length > 0
    ? configured
    : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : ''; // production default: same-origin proxy

/** Base URL for versioned API calls, e.g. `${API_V1}/demo-leads`. */
export const API_V1 = `${API_ORIGIN}/api/v1`;
