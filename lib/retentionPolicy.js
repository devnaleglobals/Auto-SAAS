// Retention periods stated in the Privacy Policy and enforced by /api/cron/cleanup. Change both together.
export const RETENTION = {
  activityDays: Number(process.env.RETENTION_ACTIVITY_DAYS || 365), // comment logs, conversations and their logs
  leadDays: Number(process.env.RETENTION_LEAD_DAYS || 730), // leads not updated for this long
  auditDays: 730, // workspace audit log and admin log
  dedupeDays: 30, // message IDs kept only to avoid double replies
};
