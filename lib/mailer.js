// Sends every platform email through the provider the admin chose in /admin/settings/email.
// Providers: Resend, SendGrid, Mailgun, Postmark, Brevo, Zoho ZeptoMail, or any SMTP server
// (Gmail / Google Workspace, Zoho Mail, Microsoft 365 / Outlook, Amazon SES, Hostinger, GoDaddy, custom).
// Falls back to RESEND_API_KEY + EMAIL_FROM from the environment when nothing is set in the admin.
import nodemailer from 'nodemailer';
import { prisma } from './db';
import { getSetting, openSecret } from './settings';

export const PROVIDERS = {
  resend: { label: 'Resend', fields: ['resendKey'], help: 'resend.com → API Keys. Verify your domain in Resend → Domains.' },
  sendgrid: { label: 'SendGrid (Twilio)', fields: ['sendgridKey'], help: 'SendGrid → Settings → API Keys (Mail Send). Verify a sender or domain.' },
  mailgun: { label: 'Mailgun', fields: ['mailgunKey', 'mailgunDomain', 'mailgunRegion'], help: 'Mailgun → API Keys. Domain = your sending domain, e.g. mg.example.com.' },
  postmark: { label: 'Postmark', fields: ['postmarkToken'], help: 'Postmark → Server → API Tokens. Add a verified Sender Signature or domain.' },
  brevo: { label: 'Brevo (Sendinblue)', fields: ['brevoKey'], help: 'Brevo → SMTP & API → API Keys. Verify your sender domain.' },
  zeptomail: { label: 'Zoho ZeptoMail', fields: ['zeptoToken', 'zeptoRegion'], help: 'ZeptoMail → Mail Agents → SMTP/API → Send Mail Token. Region "in" for zeptomail.in accounts.' },
  smtp: { label: 'SMTP (Gmail, Zoho, Outlook, Amazon SES, Hostinger…)', fields: ['smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPass'], help: 'Any SMTP server. For Gmail use an App Password (Google Account → Security → App passwords).' },
};
export const SECRET_FIELDS = ['resendKey', 'sendgridKey', 'mailgunKey', 'postmarkToken', 'brevoKey', 'zeptoToken', 'smtpPass'];

export const SMTP_PRESETS = {
  gmail: { label: 'Gmail / Google Workspace', smtpHost: 'smtp.gmail.com', smtpPort: 465, smtpSecure: true },
  zoho: { label: 'Zoho Mail (India)', smtpHost: 'smtp.zoho.in', smtpPort: 465, smtpSecure: true },
  zohocom: { label: 'Zoho Mail (global)', smtpHost: 'smtp.zoho.com', smtpPort: 465, smtpSecure: true },
  outlook: { label: 'Microsoft 365 / Outlook', smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecure: false },
  ses: { label: 'Amazon SES (Mumbai)', smtpHost: 'email-smtp.ap-south-1.amazonaws.com', smtpPort: 587, smtpSecure: false },
  hostinger: { label: 'Hostinger email', smtpHost: 'smtp.hostinger.com', smtpPort: 465, smtpSecure: true },
  godaddy: { label: 'GoDaddy (Titan) email', smtpHost: 'smtp.titan.email', smtpPort: 465, smtpSecure: true },
  sendgrid: { label: 'SendGrid SMTP', smtpHost: 'smtp.sendgrid.net', smtpPort: 587, smtpSecure: false },
  brevo: { label: 'Brevo SMTP', smtpHost: 'smtp-relay.brevo.com', smtpPort: 587, smtpSecure: false },
};

// ---------------- Templates ----------------
// {{name}}-style placeholders. The admin can edit subject and body for each in /admin/settings/templates.
export const TEMPLATES = {
  welcome: { label: 'Welcome (new sign-up)', vars: ['name', 'appName', 'url', 'trialDays', 'trialPlan'],
    subject: 'Welcome to {{appName}}',
    body: 'Hi {{name}},\n\nYour {{appName}} account is ready. Connect your Instagram account or Facebook Page and create your first automation:\n{{url}}\n\nNeed help? Just reply to this email.' },
  password_reset: { label: 'Password reset', vars: ['name', 'appName', 'url'],
    subject: 'Reset your {{appName}} password',
    body: 'Hi {{name}},\n\nUse this link to set a new password. It works for one hour:\n{{url}}\n\nIf you didn’t ask for this, you can ignore this email. Your password won’t change.' },
  team_invite: { label: 'Team invite', vars: ['inviter', 'workspace', 'role', 'url', 'appName'],
    subject: '{{inviter}} invited you to {{workspace}} on {{appName}}',
    body: '{{inviter}} invited you to join the {{workspace}} workspace on {{appName}} as {{role}}.\n\nAccept the invite (valid for 7 days):\n{{url}}' },
  reconnect_alert: { label: 'Account needs reconnecting', vars: ['account', 'platform', 'url', 'appName'],
    subject: 'Action needed: reconnect {{account}}',
    body: 'The {{platform}} {{account}} stopped working in {{appName}}, so its automations are paused.\n\nReconnect it here: {{url}}\n\nThis usually happens when a password changes or access is removed in Instagram/Facebook settings.' },
  payment_success: { label: 'Payment received', vars: ['workspace', 'plan', 'amount', 'url', 'appName'],
    subject: 'Payment received: {{plan}} plan',
    body: 'Thank you! We received {{amount}} for the {{plan}} plan on {{workspace}}.\n\nYour invoice is available on the Billing page: {{url}}' },
  payment_failed: { label: 'Payment failed', vars: ['workspace', 'url', 'appName'],
    subject: 'Payment failed for your {{appName}} plan',
    body: 'Razorpay couldn’t charge the plan renewal for {{workspace}}. Your plan stays active until the end of the current period.\n\nUpdate your payment method from Razorpay’s email, or choose a plan again here: {{url}}' },
  plan_cancelled: { label: 'Plan cancelled', vars: ['workspace', 'url', 'appName'],
    subject: 'Your {{appName}} plan was cancelled',
    body: 'The paid plan for {{workspace}} was cancelled. You keep paid features until the end of the period you paid for, then move to Free.\n\nChange plans anytime: {{url}}' },
  trial_ending: { label: 'Trial ending soon', vars: ['name', 'workspace', 'plan', 'endDate', 'url', 'appName'],
    subject: 'Your {{appName}} trial ends on {{endDate}}',
    body: 'Hi {{name}},\n\nThe free {{plan}} trial for {{workspace}} ends on {{endDate}}. Choose a plan to keep your automations running without limits:\n{{url}}' },
  ticket_created_client: { label: 'Ticket received (to client)', vars: ['name', 'number', 'subject', 'url', 'appName'],
    subject: '[#{{number}}] We received your request: {{subject}}',
    body: 'Hi {{name}},\n\nThanks for contacting {{appName}} support. Your ticket number is #{{number}}. We usually reply within one working day.\n\nView or reply: {{url}}' },
  ticket_reply_client: { label: 'Support replied (to client)', vars: ['name', 'number', 'subject', 'message', 'url', 'appName'],
    subject: '[#{{number}}] New reply: {{subject}}',
    body: 'Hi {{name}},\n\nOur support team replied to your ticket #{{number}}:\n\n{{message}}\n\nReply or view the conversation: {{url}}' },
  ticket_new_admin: { label: 'New ticket (to support team)', vars: ['number', 'subject', 'name', 'email', 'category', 'priority', 'message', 'url'],
    subject: '[#{{number}}] New {{priority}} ticket: {{subject}}',
    body: 'From: {{name}} <{{email}}>\nCategory: {{category}}\nPriority: {{priority}}\n\n{{message}}\n\nOpen in admin: {{url}}' },
  ticket_reply_admin: { label: 'Client replied (to support team)', vars: ['number', 'subject', 'name', 'message', 'url'],
    subject: '[#{{number}}] Client replied: {{subject}}',
    body: '{{name}} replied to ticket #{{number}}:\n\n{{message}}\n\nOpen in admin: {{url}}' },
  credits_low: { label: 'Message credits running low', vars: ['workspace', 'balance', 'url', 'appName'],
    subject: 'Only {{balance}} message credits left on {{appName}}',
    body: '{{workspace}} has {{balance}} message credits left. When they run out, automations stop sending until you buy more.\n\nBuy credits: {{url}}' },
  support_action: { label: 'Support changed an automation (to client)', vars: ['workspace', 'action', 'automation', 'reason', 'url', 'appName'],
    subject: '{{appName}} support {{action}} "{{automation}}"',
    body: 'Our support team {{action}} the automation "{{automation}}" in {{workspace}}.\n\nReason: {{reason}}\n\nYou can see every change on your Activity page and change it back at any time: {{url}}\n\nQuestions? Reply to this email or open a support ticket.' },
  admin_invite: { label: 'Admin invited (to new admin)', vars: ['name', 'role', 'url', 'invitedBy'],
    subject: 'You’re now an admin ({{role}}) on the platform',
    body: 'Hi {{name}},\n\n{{invitedBy}} added you to the admin console as {{role}}. Sign in with the temporary password they gave you, then change it and turn on 2-step verification:\n{{url}}' },
  test: { label: 'Test email', vars: ['appName', 'provider'],
    subject: '{{appName}}: test email',
    body: 'This is a test email from {{appName}}, sent through {{provider}}. If you can read this, email is set up correctly.' },
};

const fill = (tpl, vars) => String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? ''));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toHtml(text, brand) {
  const body = esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#141B2E">$1</a>').split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#F4F5F9;font-family:Arial,Helvetica,sans-serif;color:#172036">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="font-weight:700;font-size:18px;margin-bottom:16px">${esc(brand.appName)}</div>
<div style="background:#fff;border-radius:12px;padding:24px;font-size:15px;line-height:1.55">${body}</div>
<div style="font-size:12px;color:#6B7280;margin-top:16px">${esc(brand.footer || '')}</div></div></body></html>`;
}

export async function getEmailSettings() {
  return getSetting('email', {});
}
async function brandInfo() {
  const g = await getSetting('general', {});
  const appName = g.appName || 'ReplyRelay';
  const company = g.companyName || process.env.NEXT_PUBLIC_COMPANY_NAME || '';
  const address = g.companyAddress || process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '';
  return { appName, footer: [company, address].filter(Boolean).join(', ') };
}

export async function renderTemplate(key, vars = {}) {
  const base = TEMPLATES[key];
  if (!base) throw new Error(`Unknown email template ${key}`);
  const overrides = (await getSetting('emailTemplates', {}))[key] || {};
  const brand = await brandInfo();
  const all = { appName: brand.appName, ...vars };
  const subject = fill(overrides.subject || base.subject, all).replace(/[\r\n]+/g, ' ').slice(0, 250);
  const text = fill(overrides.body || base.body, all);
  return { subject, text, html: toHtml(text, brand), enabled: overrides.enabled !== false };
}

// ---------------- Sending ----------------
function fromFor(cfg, kind) {
  const name = cfg.fromName || 'ReplyRelay';
  const email = (kind === 'support' && cfg.supportFrom) || (kind === 'alert' && cfg.alertsFrom) || cfg.fromEmail;
  return email ? { name, email } : null;
}

async function viaProvider(cfg, msg) {
  const { from, to, subject, text, html, replyTo } = msg;
  const fromStr = `${from.name} <${from.email}>`;
  const json = async (url, headers, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
  };
  switch (cfg.provider) {
    case 'resend':
      return json('https://api.resend.com/emails', { Authorization: `Bearer ${openSecret(cfg.resendKey)}` }, { from: fromStr, to, subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) });
    case 'sendgrid':
      return json('https://api.sendgrid.com/v3/mail/send', { Authorization: `Bearer ${openSecret(cfg.sendgridKey)}` }, {
        personalizations: [{ to: to.map((email) => ({ email })) }], from: { email: from.email, name: from.name },
        ...(replyTo ? { reply_to: { email: replyTo } } : {}), subject, content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }],
      });
    case 'postmark':
      return json('https://api.postmarkapp.com/email', { 'X-Postmark-Server-Token': openSecret(cfg.postmarkToken), Accept: 'application/json' }, {
        From: fromStr, To: to.join(','), Subject: subject, TextBody: text, HtmlBody: html, MessageStream: 'outbound', ...(replyTo ? { ReplyTo: replyTo } : {}),
      });
    case 'brevo':
      return json('https://api.brevo.com/v3/smtp/email', { 'api-key': openSecret(cfg.brevoKey), Accept: 'application/json' }, {
        sender: { name: from.name, email: from.email }, to: to.map((email) => ({ email })), subject, textContent: text, htmlContent: html, ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      });
    case 'zeptomail': {
      const host = cfg.zeptoRegion === 'com' ? 'api.zeptomail.com' : 'api.zeptomail.in';
      const token = openSecret(cfg.zeptoToken).replace(/^Zoho-enczapikey\s+/i, '');
      return json(`https://${host}/v1.1/email`, { Authorization: `Zoho-enczapikey ${token}`, Accept: 'application/json' }, {
        from: { address: from.email, name: from.name }, to: to.map((address) => ({ email_address: { address } })), subject, textbody: text, htmlbody: html,
        ...(replyTo ? { reply_to: [{ address: replyTo }] } : {}),
      });
    }
    case 'mailgun': {
      const host = cfg.mailgunRegion === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net';
      const form = new URLSearchParams({ from: fromStr, subject, text, html });
      for (const t of to) form.append('to', t);
      if (replyTo) form.set('h:Reply-To', replyTo);
      const res = await fetch(`https://${host}/v3/${encodeURIComponent(cfg.mailgunDomain || '')}/messages`, {
        method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`api:${openSecret(cfg.mailgunKey)}`).toString('base64') }, body: form,
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
      return;
    }
    case 'smtp': {
      const port = Number(cfg.smtpPort) || 587;
      const transport = nodemailer.createTransport({
        host: cfg.smtpHost, port, secure: cfg.smtpSecure === true || cfg.smtpSecure === 'true' || port === 465,
        auth: cfg.smtpUser ? { user: cfg.smtpUser, pass: openSecret(cfg.smtpPass) } : undefined,
        connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
      });
      await transport.sendMail({ from: { name: from.name, address: from.email }, to, subject, text, html, ...(replyTo ? { replyTo } : {}) });
      return;
    }
    default:
      throw new Error('No email provider chosen');
  }
}

// Effective configuration: the admin's settings, or the RESEND_API_KEY / EMAIL_FROM environment fallback.
async function effectiveConfig() {
  const cfg = await getEmailSettings();
  if (cfg.provider && cfg.enabled !== false) return { cfg, source: 'admin' };
  if (process.env.RESEND_API_KEY) {
    const m = String(process.env.EMAIL_FROM || 'ReplyRelay <onboarding@resend.dev>').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    return { cfg: { provider: 'resend', envResendKey: process.env.RESEND_API_KEY, fromName: m ? m[1] : 'ReplyRelay', fromEmail: m ? m[2] : process.env.EMAIL_FROM }, source: 'env' };
  }
  return { cfg: null, source: 'none' };
}

export async function emailConfigured() {
  return (await effectiveConfig()).cfg !== null;
}

// kind: 'system' (resets, invites, welcome) | 'alert' (reconnect, payments) | 'support' (tickets)
export async function sendMail({ to, subject, text, html, kind = 'system', replyTo, template = null, cfgOverride = null }) {
  const list = (Array.isArray(to) ? to : [to]).map((t) => String(t || '').trim()).filter((t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t));
  if (!list.length) return false;
  if (!html) html = toHtml(text, await brandInfo());
  const { cfg: base, source } = cfgOverride ? { cfg: cfgOverride, source: 'test' } : await effectiveConfig();
  const log = (status, error = null, provider = base?.provider || 'none') =>
    prisma.emailLog.create({ data: { to: list.join(', ').slice(0, 500), subject: String(subject).slice(0, 250), template, provider, status, error: error ? String(error).slice(0, 500) : null } }).catch(() => {});
  if (!base) {
    console.error('Email not sent: no email provider is set up (Admin → Settings → Email, or RESEND_API_KEY).', subject);
    await log('SKIPPED', 'No email provider set up');
    return false;
  }
  const from = fromFor(base, kind);
  if (!from) { await log('FAILED', 'No "from" email address set'); return false; }
  const reply = replyTo || (kind === 'support' ? base.supportInbox || base.replyTo : base.replyTo) || undefined;
  try {
    if (base.envResendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${base.envResendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${from.name} <${from.email}>`, to: list, subject, text, html, ...(reply ? { reply_to: reply } : {}) }),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
    } else {
      await viaProvider(base, { from, to: list, subject, text, html, replyTo: reply });
    }
    await log('SENT');
    return true;
  } catch (e) {
    console.error(`Email not sent (${base.provider}, ${source}): ${e.message}`);
    await log('FAILED', e.message);
    return false;
  }
}

export async function sendTemplate(key, to, vars = {}, { kind = 'system', replyTo, cfgOverride } = {}) {
  const t = await renderTemplate(key, vars);
  if (!t.enabled) return false;
  return sendMail({ to, subject: t.subject, text: t.text, html: t.html, kind, replyTo, template: key, cfgOverride });
}
