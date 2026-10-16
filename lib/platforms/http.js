export const API_VERSION = () => process.env.META_API_VERSION || process.env.IG_API_VERSION || 'v23.0';

// Tolerates spaces, quotes and trailing slashes in APP_URL.
export const appUrl = () => (process.env.APP_URL || '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');

export const withToken = (url, token) => `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;

export const isTokenError = (e) => e?.code === 190 || /access token|session has expired/i.test(e?.message || '');

export async function call(url, init) {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data?.error?.message || data?.error_message || `API error ${res.status}`;
    const err = new Error(msg);
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }
  return data;
}
