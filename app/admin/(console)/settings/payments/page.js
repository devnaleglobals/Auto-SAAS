import { requireAdminPage } from '@/lib/admin';
import { getSetting, redact } from '@/lib/settings';
import { paymentConfig } from '@/lib/razorpay';
import { appUrl } from '@/lib/platforms';
import { PaymentsForm } from '@/components/AdminSettings';

export const dynamic = 'force-dynamic';

export default async function PaymentSettings() {
  await requireAdminPage('billing');
  const saved = redact(await getSetting('payments', {}));
  const cfg = await paymentConfig();
  return (
    <PaymentsForm
      initial={{ enabled: saved.enabled !== false, keyId: saved.keyId || '' }}
      secretsSet={{ keySecret: Boolean(saved.keySecret?.set), webhookSecret: Boolean(saved.webhookSecret?.set) }}
      envInfo={{ mode: cfg.mode, source: cfg.source, keyId: cfg.keyId }}
      webhookUrl={`${appUrl()}/api/billing/webhook`}
    />
  );
}
