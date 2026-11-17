// Plans and trial settings for the public website.
import { loadPlans, PLANS, PLAN_KEYS, FEATURES_ALL } from './plans';
import { getSignupSettings } from './settings';

export async function publicPricing() {
  await loadPlans();
  const s = await getSignupSettings();
  const plans = PLAN_KEYS.filter((k) => PLANS[k].active !== false).map((k) => ({ key: k, ...PLANS[k] }));
  const trial = s.trialEnabled && s.trialDays > 0 ? { days: s.trialDays, plan: PLANS[s.trialPlan]?.name || s.trialPlan } : null;
  return { plans, trial, features: [...FEATURES_ALL], signupOpen: s.signupOpen };
}
