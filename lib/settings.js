// Platform settings that the admin edits in /admin/settings, stored in the Setting table.
// Secret values (API keys, passwords) are encrypted with ENCRYPTION_KEY before saving and are
// never sent back to the browser: the admin only sees whether one is set.
import { prisma } from './db';
import { encrypt, decrypt } from './crypto';

const TTL_MS = 15_000; // settings are cached briefly per server instance
const cache = new Map();

export async function getSetting(key, fallback = {}) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const row = await prisma.setting.findUnique({ where: { key } }).catch(() => null);
  const value = row?.value && typeof row.value === 'object' ? row.value : fallback;
  cache.set(key, { at: Date.now(), value });
  return value;
}

export async function saveSetting(key, value) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  cache.set(key, { at: Date.now(), value });
}

// ---- Secrets inside settings ----
export const SECRET_MARK = '__enc__';
export const sealSecret = (plain) => (plain ? { [SECRET_MARK]: encrypt(String(plain)) } : null);
export function openSecret(v) {
  if (!v) return '';
  if (typeof v === 'object' && v[SECRET_MARK]) {
    try { return decrypt(v[SECRET_MARK]); } catch { return ''; }
  }
  return '';
}
// For the admin UI: replaces secrets with a flag so they are never exposed.
export function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj[SECRET_MARK]) return { set: true };
  if (Array.isArray(obj)) return obj.map(redact);
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, redact(v)]));
}
// Merges an edit from the admin UI: a secret field left empty keeps the saved value; "__clear__" removes it.
export function mergeSecrets(saved = {}, incoming = {}, secretFields = []) {
  const out = { ...saved, ...incoming };
  for (const f of secretFields) {
    const v = incoming[f];
    if (v === '__clear__') out[f] = null;
    else if (typeof v === 'string' && v.trim()) out[f] = sealSecret(v.trim());
    else out[f] = saved[f] ?? null;
  }
  return out;
}

// ---- Announcement banner (shown to every client) ----
export async function getAnnouncement() {
  const a = await getSetting('announcement', null);
  if (!a?.active || !a.text) return null;
  if (a.until && new Date(a.until) < new Date()) return null;
  return a;
}

// ---- Signup, trial and maintenance ----
export const SIGNUP_DEFAULTS = {
  signupOpen: true, // new clients can create accounts
  trialEnabled: true,
  trialDays: 14,
  trialPlan: 'PRO',
  maintenance: false, // shows a banner and pauses sending for everyone
  maintenanceMessage: '',
};
export async function getSignupSettings() {
  return { ...SIGNUP_DEFAULTS, ...(await getSetting('signup', {})) };
}
