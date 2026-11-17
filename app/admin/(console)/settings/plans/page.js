import { requireAdminPage } from '@/lib/admin';
import { PLANS, PLAN_KEYS, FEATURES_ALL, razorpayPlanId } from '@/lib/plans';
import { paymentConfig } from '@/lib/razorpay';
import { PlansForm, CreditsForm } from '@/components/AdminSettings';
import { getCreditSettings } from '@/lib/credits';

export const dynamic = 'force-dynamic';

export default async function PlanSettings() {
  await requireAdminPage('billing');
  const initial = Object.fromEntries(PLAN_KEYS.map((k) => [k, { ...PLANS[k], razorpayPlanId: k === 'FREE' ? undefined : razorpayPlanId(k) || '' }]));
  initial.features = [...FEATURES_ALL];
  return (
    <>
      <PlansForm initial={initial} keys={PLAN_KEYS} mode={(await paymentConfig()).mode} />
      <CreditsForm initial={await getCreditSettings()} />
    </>
  );
}
