// Plans and trial settings for the public website.
import { loadPlans, PLANS, PLAN_KEYS, FEATURES_ALL } from './plans';
import { getSignupSettings } from './settings';
import { getCreditSettings, bestRate } from './credits';

export async function publicPricing() {
  await loadPlans();
  const s = await getSignupSettings();
  const c = await getCreditSettings();
  const credits = c.enabled ? c.packs.filter((p) => p.credits > 0 && p.price > 0) : [];
  const rate = bestRate(credits);
  const plans = PLAN_KEYS.filter((k) => PLANS[k].active !== false && (k !== 'PAYG' || rate)).map((k) => ({ key: k, ...PLANS[k], ...(k === 'PAYG' ? { rate } : {}) }));
  const trial = s.trialEnabled && s.trialDays > 0 ? { days: s.trialDays, plan: PLANS[s.trialPlan]?.name || s.trialPlan } : null;
  return { plans, trial, credits, features: [...FEATURES_ALL], signupOpen: s.signupOpen };
}
