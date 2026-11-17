import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { sendTemplate, getEmailSettings, emailConfigured, PROVIDERS } from '@/lib/mailer';
import { limitOr429 } from '@/lib/ratelimit';

// Sends a test email with the saved settings and reports the provider's answer.
export async function POST(req) {
  const [admin, err] = await requireAdminApi('settings');
  if (err) return err;
  const limited = await limitOr429([[`emailtest:${admin.id}`, 10, 600]]);
  if (limited) return limited;
  const { to } = await req.json().catch(() => ({}));
  const target = String(to || admin.email).trim();
  if (!(await emailConfigured())) return NextResponse.json({ error: 'Choose a provider and save the settings first.' }, { status: 400 });
  const cfg = await getEmailSettings();
  const ok = await sendTemplate('test', target, { provider: PROVIDERS[cfg.provider]?.label || 'Resend (environment)' });
  return ok ? NextResponse.json({ ok: true, to: target })
    : NextResponse.json({ error: 'The provider refused the email. See the reason in Admin → Emails.' }, { status: 502 });
}
