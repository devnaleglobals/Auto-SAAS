import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';
import { clearSession } from '@/lib/auth';
import { deleteUserAccount } from '@/lib/account';
import { WS_COOKIE } from '@/lib/context';

export async function PATCH(req) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const { name } = await req.json().catch(() => ({}));
  const clean = String(name || '').trim().slice(0, 60);
  if (clean.length < 2) return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  await prisma.user.update({ where: { id: ctx.user.id }, data: { name: clean } });
  return NextResponse.json({ ok: true });
}

// Deletes the signed-in person's account and every workspace they own (right to erasure).
// Paid plans on owned workspaces are cancelled immediately so nothing is charged again.
export async function DELETE(req) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const { confirm, password } = await req.json().catch(() => ({}));
  if (String(confirm || '').trim().toUpperCase() !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
  if (user.passwordHash && !(await bcrypt.compare(String(password || '').slice(0, 200), user.passwordHash))) {
    return NextResponse.json({ error: 'Your password isn’t right.' }, { status: 400 });
  }
  const result = await deleteUserAccount(user.id);
  console.info('account deleted by user', user.id, result);
  await clearSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(WS_COOKIE);
  return res;
}
