// Plans and limits. Change prices/limits here; create matching plans in the Razorpay dashboard
// and put their IDs in RAZORPAY_PLAN_STARTER / _PRO / _AGENCY.
export const PLANS = {
  FREE: { name: 'Free', price: 0, messages: 200, accounts: 1, members: 1, blurb: 'Try it on one account.' },
  STARTER: { name: 'Starter', price: 499, messages: 2500, accounts: 2, members: 2, blurb: 'For shops and creators getting regular comments.' },
  PRO: { name: 'Pro', price: 1499, messages: 15000, accounts: 5, members: 5, blurb: 'For growing brands running campaigns and lives.', popular: true },
  AGENCY: { name: 'Agency', price: 3999, messages: 60000, accounts: 20, members: 20, blurb: 'For agencies managing many clients.' },
};
export const PAID = ['STARTER', 'PRO', 'AGENCY'];
export const FEATURES_ALL = [
  'Comment replies and comment to DM',
  'DM and Messenger conversations with buttons',
  'Follow check before sending',
  'Story replies and mentions',
  'Lead capture and reminders',
  'Comment moderation',
  'Click tracking and analytics',
];

export const razorpayPlanId = (plan) => process.env[`RAZORPAY_PLAN_${plan}`] || null;
export const planFromRazorpayId = (id) => PAID.find((p) => razorpayPlanId(p) === id) || null;

// The plan a workspace can use right now.
export function effectivePlan(ws) {
  if (!ws || ws.plan === 'FREE' || !PLANS[ws.plan]) return 'FREE';
  const paidUntil = ws.periodEnd ? new Date(ws.periodEnd).getTime() : 0;
  if (['active', 'authenticated'].includes(ws.subStatus)) return ws.plan;
  // Cancelled, or a renewal failed: keep access until the paid period ends.
  if (['cancelled', 'pending', 'halted', 'completed'].includes(ws.subStatus) && paidUntil > Date.now()) return ws.plan;
  return 'FREE';
}
export const limitsOf = (ws) => PLANS[effectivePlan(ws)];
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const usageThisMonth = (ws) => (ws?.usageMonth === currentMonth() ? ws.usageCount : 0);
export const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;
