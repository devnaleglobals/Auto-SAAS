const styles = {
  ACTIVE: 'bg-ok/10 text-ok', PAUSED: 'bg-slate/10 text-slate', COMPLETED: 'bg-ink/10 text-ink',
  SENT: 'bg-ok/10 text-ok', HIDDEN: 'bg-marigold/20 text-ink', DELETED: 'bg-bad/10 text-bad', FAILED: 'bg-bad/10 text-bad', SKIPPED: 'bg-slate/10 text-slate', PENDING: 'bg-marigold/20 text-ink',
  OWNER: 'bg-navy text-white', ADMIN: 'bg-sky/10 text-sky', MEMBER: 'bg-slate/10 text-ink', VIEWER: 'bg-slate/10 text-slate',
};
const words = {
  ACTIVE: 'Running', PAUSED: 'Paused', COMPLETED: 'Finished', SENT: 'Sent', HIDDEN: 'Hidden', DELETED: 'Deleted', FAILED: 'Failed', SKIPPED: 'Skipped', PENDING: 'Sending',
  OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer',
};
export default function StatusBadge({ s }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[s] || ''}`}>{words[s] || s}</span>;
}
