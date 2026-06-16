import axios from 'axios';
import { createClient } from '../supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
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

// Unwrap {success, data} envelope
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ??
      err.response?.data?.message ??
      err.message ??
      'An error occurred';
    return Promise.reject(new Error(message));
  },
);

export default api;
