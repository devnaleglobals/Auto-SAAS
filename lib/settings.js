import { prisma } from './db';

// Platform announcement banner shown to every client in the dashboard (set in /admin/system).
export async function getAnnouncement() {
  const row = await prisma.setting.findUnique({ where: { key: 'announcement' } }).catch(() => null);
  const a = row?.value;
  if (!a?.active || !a.text) return null;
  if (a.until && new Date(a.until) < new Date()) return null;
  return a;
}
