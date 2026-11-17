import { requireAdminPage } from '@/lib/admin';
import { getSetting, redact } from '@/lib/settings';
import { PROVIDERS, SMTP_PRESETS, SECRET_FIELDS } from '@/lib/mailer';
import { EmailForm } from '@/components/AdminSettings';

export const dynamic = 'force-dynamic';

export default async function EmailSettings() {
  await requireAdminPage('settings');
  const saved = redact(await getSetting('email', {}));
  const secretsSet = Object.fromEntries(SECRET_FIELDS.map((f) => [f, Boolean(saved[f]?.set)]));
  const initial = Object.fromEntries(Object.entries(saved).filter(([k]) => !SECRET_FIELDS.includes(k)));
  const providers = Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, { label: p.label, help: p.help }]));
  return <EmailForm initial={initial} providers={providers} presets={SMTP_PRESETS} secretsSet={secretsSet} envFallback={Boolean(process.env.RESEND_API_KEY)} />;
}
