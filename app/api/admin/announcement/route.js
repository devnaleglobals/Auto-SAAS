import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';

// Sets or clears the banner every client sees at the top of their dashboard.
export async function PUT(req) {
  const [admin, err] = await requireAdminApi();
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  const text = String(b.text || '').trim().slice(0, 240);
  const link = String(b.link || '').trim();
  if (b.active && !text) return NextResponse.json({ error: 'Write the announcement text.' }, { status: 400 });
  if (link && !/^https?:\/\//i.test(link)) return NextResponse.json({ error: 'The link must start with https://' }, { status: 400 });
  const value = { active: Boolean(b.active), text, link: link || null, tone: b.tone === 'warn' ? 'warn' : 'info', until: b.until || null };
  await prisma.setting.upsert({ where: { key: 'announcement' }, create: { key: 'announcement', value }, update: { value } });
  await adminLog(admin, value.active ? 'announcement_published' : 'announcement_removed', { detail: text.slice(0, 120) });
  return NextResponse.json({ ok: true });
}
