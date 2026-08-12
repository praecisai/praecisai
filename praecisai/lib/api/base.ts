/**
 * Origin the BROWSER uses for API calls.
 *
 * - "https://api.praecisai.in"  : call the backend host directly
 * - ""                          : same-origin proxy. Requests go to
 *   /api/v1/... on this domain and the Next rewrite (see next.config.ts,
 *   API_PROXY_TARGET) forwards them to the backend server-side. This keeps
 *   *.up.railway.app out of the visitor's DNS path, which some Indian ISP
 *   resolvers fail to resolve (ERR_NAME_NOT_RESOLVED).
 *
 * Must use ?? and NOT ||: an empty string is a meaningful value here, and
 * `|| 'http://localhost:3001'` would silently point production at localhost.
 */
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

/** Base URL for versioned API calls, e.g. `${API_V1}/demo-leads`. */
export const API_V1 = `${API_ORIGIN}/api/v1`;
