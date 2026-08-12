import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { createClient } from '../supabase/client';
import { API_V1 } from './base';

const api = axios.create({
  baseURL: API_V1,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // silent - unauthenticated requests will 401
  }
  return config;
});

// ─── Transient-failure retry ─────────────────────────────────────────────────
// Some Indian ISP resolvers intermittently fail to resolve the API hostname
// (ERR_NAME_NOT_RESOLVED) or drop the connection, which showed up as random
// "Praecis API is not responding" screens at login. Those failures never reach
// the server, so retrying is safe and usually succeeds on the next attempt.
//
// ONLY idempotent methods are retried: replaying a POST could create a second
// Razorpay order or a duplicate import.
const MAX_RETRIES = 3;
const IDEMPOTENT = new Set(['get', 'head', 'options']);

type RetryConfig = AxiosRequestConfig & { _retryCount?: number };

function isTransient(err: AxiosError): boolean {
  // No response at all = DNS failure, connection refused/reset, or timeout
  if (!err.response) return err.code !== 'ERR_CANCELED';
  // Gateway/proxy hiccups (Railway edge restarting, cold start)
  return [502, 503, 504].includes(err.response.status);
}

export const NETWORK_ERROR_MESSAGE =
  'Could not reach the PraecisAI server. Please check your internet connection and try again.';

/**
 * Retry transient failures, then normalize the error into a plain Error.
 * `decorate` lets a caller attach extra fields (the admin client needs
 * `status` to detect an expired token).
 */
export function attachRetryInterceptor(
  instance: AxiosInstance,
  decorate?: (error: Error, err: AxiosError) => Error,
) {
  instance.interceptors.response.use(
    (res) => res,
    async (err: AxiosError) => {
      const config = err.config as RetryConfig | undefined;
      const method = (config?.method ?? 'get').toLowerCase();

      if (config && IDEMPOTENT.has(method) && isTransient(err)) {
        const attempt = (config._retryCount ?? 0) + 1;
        if (attempt <= MAX_RETRIES) {
          config._retryCount = attempt;
          // 400ms, 800ms, 1600ms with jitter so retries don't sync up
          const delay = 400 * 2 ** (attempt - 1) + Math.random() * 200;
          await new Promise((r) => setTimeout(r, delay));
          return instance.request(config);
        }
      }

      const message = !err.response
        ? NETWORK_ERROR_MESSAGE
        : ((err.response?.data as any)?.error ??
           (err.response?.data as any)?.message ??
           err.message ??
           'An error occurred');
      const error = new Error(message);
      return Promise.reject(decorate ? decorate(error, err) : error);
    },
  );
}

attachRetryInterceptor(api);

export default api;
