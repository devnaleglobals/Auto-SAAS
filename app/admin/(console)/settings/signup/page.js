import { requireAdminPage } from '@/lib/admin';
import { getSignupSettings } from '@/lib/settings';
import { PLANS, PLAN_KEYS } from '@/lib/plans';
import { SignupForm } from '@/components/AdminSettings';

export const dynamic = 'force-dynamic';

export default async function SignupSettings() {
  await requireAdminPage('settings');
  return <SignupForm initial={await getSignupSettings()} plans={PLAN_KEYS.map((k) => ({ key: k, name: PLANS[k].name }))} />;
}
