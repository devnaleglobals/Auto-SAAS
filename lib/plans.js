// Plans and limits. These are the defaults; the platform admin can change names, prices, limits,
// Razorpay plan IDs and the feature list in /admin/settings (stored in the "plans" setting).
// Call `await loadPlans()` once per request before using PLANS (getContext and the billing routes do).
import { getSetting } from './settings';

export const DEFAULT_PLANS = {
  FREE: { name: 'Free', price: 0, messages: 200, accounts: 1, members: 1, blurb: 'Try it on one account.', active: true },
  PAYG: { name: 'Pay as you go', price: 0, payg: true, messages: 0, accounts: 3, members: 3, blurb: 'No monthly fee. Buy message credits and pay only for the messages you send.', active: true },
  STARTER: { name: 'Starter', price: 499, messages: 2500, accounts: 2, members: 2, blurb: 'For shops and creators getting regular comments.', active: true },
  PRO: { name: 'Pro', price: 1499, messages: 15000, accounts: 5, members: 5, blurb: 'For growing brands running campaigns and lives.', popular: true, active: true },
  AGENCY: { name: 'Agency', price: 3999, messages: 60000, accounts: 20, members: 20, blurb: 'For agencies managing many clients.', active: true },
};
export const DEFAULT_FEATURES = [
  'Comment replies and comment to DM',
  'DM and Messenger conversations with buttons',
  'Follow check before sending',
  'Story replies and mentions',
  'Lead capture and reminders',
  'Comment moderation',
  'Click tracking and analytics',
];
export const PLAN_KEYS = ['FREE', 'PAYG', 'STARTER', 'PRO', 'AGENCY'];
// Monthly subscription plans (Razorpay). PAYG has no subscription: the client prepays with message credits.
export const PAID = ['STARTER', 'PRO', 'AGENCY'];
export const NO_FEE = ['FREE', 'PAYG'];

// Live values (mutated in place by loadPlans so existing imports see admin changes).
export const PLANS = JSON.parse(JSON.stringify(DEFAULT_PLANS));
export const FEATURES_ALL = [...DEFAULT_FEATURES];

export async function loadPlans() {
  const saved = await getSetting('plans', {});
  for (const k of PLAN_KEYS) {
    const o = saved?.[k] || {};
    const d = DEFAULT_PLANS[k];
    PLANS[k] = {
      ...d,
      ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '')),
    };
    if (NO_FEE.includes(k)) PLANS[k].price = 0;
    if (k === 'PAYG') PLANS[k].payg = true;
  }
  if (Array.isArray(saved?.features) && saved.features.length) FEATURES_ALL.splice(0, FEATURES_ALL.length, ...saved.features);
  else FEATURES_ALL.splice(0, FEATURES_ALL.length, ...DEFAULT_FEATURES);
  return PLANS;
}

// Razorpay plan ID: the one saved by the admin, else the RAZORPAY_PLAN_<KEY> environment variable.
export const razorpayPlanId = (plan) => (PLANS[plan]?.razorpayPlanId || process.env[`RAZORPAY_PLAN_${plan}`] || '').trim() || null;
export const planFromRazorpayId = (id) => PAID.find((p) => razorpayPlanId(p) === id) || null;

// The plan a workspace can use right now.
export function effectivePlan(ws) {
  const paid = paidPlan(ws);
  // Free trial: the trial plan until trialEndsAt, unless the workspace already pays for a plan.
  if (NO_FEE.includes(paid) && ws?.trialPlan && PLANS[ws.trialPlan] && ws.trialEndsAt && new Date(ws.trialEndsAt).getTime() > Date.now()) return ws.trialPlan;
  return paid;
}
export const onTrial = (ws) => NO_FEE.includes(paidPlan(ws)) && effectivePlan(ws) !== paidPlan(ws);

function paidPlan(ws) {
  if (!ws || ws.plan === 'FREE' || !PLANS[ws.plan]) return 'FREE';
  // Pay as you go: no subscription and no end date; runs until the client changes plan.
  if (ws.plan === 'PAYG') return 'PAYG';
  const paidUntil = ws.periodEnd ? new Date(ws.periodEnd).getTime() : 0;
  // Complimentary plan (given by a platform admin, no Razorpay subscription): ends on its end date.
  if (!ws.razorpaySubId && ws.subStatus === 'active') return !ws.periodEnd || paidUntil > Date.now() ? ws.plan : 'FREE';
  if (['active', 'authenticated'].includes(ws.subStatus)) return ws.plan;
  // Cancelled, or a renewal failed: keep access until the paid period ends.
  if (['cancelled', 'pending', 'halted', 'completed'].includes(ws.subStatus) && paidUntil > Date.now()) return ws.plan;
  // A subscription the client ended to move to pay as you go.
  if (ws.nextPlan === 'PAYG' && !ws.nextSubId) return 'PAYG';
  return 'FREE';
}
// Plan limits, with any custom limits the platform admin set for this client.
export function limitsOf(ws) {
  const base = PLANS[effectivePlan(ws)];
  const c = ws?.customLimits && typeof ws.customLimits === 'object' ? ws.customLimits : null;
  if (!c) return base;
  const pick = (k) => (Number.isFinite(Number(c[k])) && c[k] !== null && c[k] !== '' ? Number(c[k]) : base[k]);
  return { ...base, messages: pick('messages'), accounts: pick('accounts'), members: pick('members'), custom: true };
}
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const usageThisMonth = (ws) => (ws?.usageMonth === currentMonth() ? ws.usageCount : 0);
export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
