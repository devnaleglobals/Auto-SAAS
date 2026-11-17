import { NextResponse } from 'next/server';
import { requireAdminApi, adminLog } from '@/lib/admin';
import { getSetting, saveSetting, mergeSecrets, redact } from '@/lib/settings';
import { PLAN_KEYS, DEFAULT_PLANS } from '@/lib/plans';
import { PROVIDERS, SECRET_FIELDS, TEMPLATES } from '@/lib/mailer';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const int = (v, min, max) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };

// Each setting: who may change it, and how its input is cleaned. Returns [value, error].
const RULES = {
  general: {
    perm: 'settings',
    clean(b) {
      const v = {};
      for (const k of ['appName', 'companyName', 'legalName', 'companyAddress', 'phone', 'gstin', 'jurisdiction', 'grievanceName', 'responseTime']) v[k] = str(b[k], k === 'companyAddress' ? 400 : 120);
      for (const k of ['supportEmail', 'grievanceEmail']) {
        v[k] = str(b[k], 200).toLowerCase();
        if (v[k] && !EMAIL.test(v[k])) return [null, `Check the ${k === 'supportEmail' ? 'support' : 'grievance'} email.`];
      }
      if (v.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.gstin.toUpperCase())) return [null, 'That GSTIN doesn’t look right.'];
      v.gstin = v.gstin.toUpperCase();
      return [v, null];
    },
  },
  signup: {
    perm: 'settings',
    clean(b) {
      const days = int(b.trialDays, 0, 90);
      if (b.trialEnabled && !days) return [null, 'Set the trial length (1–90 days).'];
      if (b.trialEnabled && !PLAN_KEYS.slice(1).includes(b.trialPlan)) return [null, 'Choose the plan given during the trial.'];
      return [{ signupOpen: Boolean(b.signupOpen), trialEnabled: Boolean(b.trialEnabled), trialDays: days ?? 0, trialPlan: b.trialPlan || 'PRO', maintenance: Boolean(b.maintenance), maintenanceMessage: str(b.maintenanceMessage, 300) }, null];
    },
  },
  plans: {
    perm: 'billing',
    clean(b) {
      const out = {};
      for (const k of PLAN_KEYS) {
        const p = b[k] || {};
        const name = str(p.name, 30) || DEFAULT_PLANS[k].name;
        const price = k === 'FREE' ? 0 : int(p.price, 1, 10_000_000);
        if (k !== 'FREE' && !price) return [null, `${name}: set a monthly price in rupees.`];
        const messages = int(p.messages, 0, 100_000_000); const accounts = int(p.accounts, 1, 1000); const members = int(p.members, 1, 1000);
        if (messages === null || !accounts || !members) return [null, `${name}: messages, accounts and team members must be numbers.`];
        const razorpayPlanId = str(p.razorpayPlanId, 60);
        if (razorpayPlanId && !/^plan_[A-Za-z0-9]+$/.test(razorpayPlanId)) return [null, `${name}: the Razorpay plan ID starts with plan_`];
        out[k] = { name, price, messages, accounts, members, blurb: str(p.blurb, 160), popular: Boolean(p.popular), active: k === 'FREE' ? true : p.active !== false, ...(k === 'FREE' ? {} : { razorpayPlanId }) };
      }
      const features = (Array.isArray(b.features) ? b.features : []).map((f) => str(f, 80)).filter(Boolean).slice(0, 20);
      return [{ ...out, features }, null];
    },
  },
  email: {
    perm: 'settings',
    secrets: SECRET_FIELDS,
    clean(b) {
      if (b.provider && !PROVIDERS[b.provider]) return [null, 'Choose an email provider.'];
      const v = {
        enabled: b.enabled !== false, provider: b.provider || '', fromName: str(b.fromName, 60) || 'ReplyRelay',
        fromEmail: str(b.fromEmail).toLowerCase(), alertsFrom: str(b.alertsFrom).toLowerCase(), supportFrom: str(b.supportFrom).toLowerCase(),
        replyTo: str(b.replyTo).toLowerCase(), supportInbox: str(b.supportInbox).toLowerCase(),
        mailgunDomain: str(b.mailgunDomain, 120), mailgunRegion: b.mailgunRegion === 'eu' ? 'eu' : 'us', zeptoRegion: b.zeptoRegion === 'com' ? 'com' : 'in',
        smtpHost: str(b.smtpHost, 120), smtpPort: int(b.smtpPort, 1, 65535) || 587, smtpSecure: b.smtpSecure === true || b.smtpSecure === 'true', smtpUser: str(b.smtpUser, 200),
      };
      for (const k of ['fromEmail', 'alertsFrom', 'supportFrom', 'replyTo', 'supportInbox']) if (v[k] && !EMAIL.test(v[k])) return [null, `Check the email address in “${k}”.`];
      if (v.provider && !v.fromEmail) return [null, 'Set the “From” email address.'];
      if (v.provider === 'smtp' && !v.smtpHost) return [null, 'Set the SMTP host.'];
      if (v.provider === 'mailgun' && !v.mailgunDomain) return [null, 'Set the Mailgun sending domain.'];
      for (const f of SECRET_FIELDS) v[f] = b[f];
      return [v, null];
    },
  },
  emailTemplates: {
    perm: 'settings',
    clean(b) {
      const out = {};
      for (const [k, t] of Object.entries(b || {})) {
        if (!TEMPLATES[k]) continue;
        const subject = str(t.subject, 250); const body = String(t.body ?? '').replace(/\r\n/g, '\n').slice(0, 10000);
        out[k] = { ...(subject && subject !== TEMPLATES[k].subject ? { subject } : {}), ...(body.trim() && body !== TEMPLATES[k].body ? { body } : {}), ...(t.enabled === false ? { enabled: false } : {}) };
      }
      return [out, null];
    },
  },
  payments: {
    perm: 'billing',
    secrets: ['keySecret', 'webhookSecret'],
    clean(b) {
      const keyId = str(b.keyId, 60);
      if (keyId && !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) return [null, 'The Razorpay Key ID starts with rzp_test_ or rzp_live_'];
      return [{ enabled: b.enabled !== false, keyId, keySecret: b.keySecret, webhookSecret: b.webhookSecret }, null];
    },
  },
  announcement: {
    perm: 'settings',
    clean(b) {
      const text = str(b.text, 240); const link = str(b.link, 500);
      if (b.active && !text) return [null, 'Write the announcement text.'];
      if (link && !/^https:\/\//i.test(link)) return [null, 'The link must start with https://'];
      return [{ active: Boolean(b.active), text, link: link || null, tone: b.tone === 'warn' ? 'warn' : 'info', until: b.until || null }, null];
    },
  },
};

export async function GET(req, { params }) {
  const { key } = await params;
  const rule = RULES[key];
  if (!rule) return NextResponse.json({ error: 'Unknown setting' }, { status: 404 });
  const [, err] = await requireAdminApi(rule.perm);
  if (err) return err;
  return NextResponse.json(redact(await getSetting(key, {})), { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req, { params }) {
  const { key } = await params;
  const rule = RULES[key];
  if (!rule) return NextResponse.json({ error: 'Unknown setting' }, { status: 404 });
  const [admin, err] = await requireAdminApi(rule.perm);
  if (err) return err;
  const [value, msg] = rule.clean(await req.json().catch(() => ({})));
  if (msg) return NextResponse.json({ error: msg }, { status: 400 });
  const saved = await getSetting(key, {});
  const final = rule.secrets ? mergeSecrets(saved, value, rule.secrets) : value;
  await saveSetting(key, final);
  await adminLog(admin, 'settings_changed', { detail: key });
  return NextResponse.json({ ok: true, value: redact(final) });
}
