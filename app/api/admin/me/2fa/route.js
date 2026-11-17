import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { newSecret, verifyCode, otpauthUrl } from '@/lib/totp';
import { requireAdminApi, adminLog } from '@/lib/admin';

// GET: starts 2-step setup (new secret + QR code). POST {code}: turns it on. DELETE {password}: turns it off.
export async function GET() {
  const [admin, err] = await requireAdminApi();
  if (err) return err;
  if (admin.totpEnabled) return NextResponse.json({ error: '2-step verification is already on.' }, { status: 400 });
  const secret = newSecret();
  await prisma.admin.update({ where: { id: admin.id }, data: { totpSecretEnc: encrypt(secret) } });
  const url = otpauthUrl(secret, admin.email);
  return NextResponse.json({ secret, qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const [admin, err] = await requireAdminApi();
  if (err) return err;
  const { code } = await req.json().catch(() => ({}));
  if (!admin.totpSecretEnc || !verifyCode(decrypt(admin.totpSecretEnc), code)) return NextResponse.json({ error: 'That code isn’t right. Scan the QR code again and use the newest code.' }, { status: 400 });
  await prisma.admin.update({ where: { id: admin.id }, data: { totpEnabled: true } });
  await adminLog(admin, 'admin_2fa_enabled');
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const [admin, err] = await requireAdminApi();
  if (err) return err;
  const { password } = await req.json().catch(() => ({}));
  if (!(await bcrypt.compare(String(password || '').slice(0, 200), admin.passwordHash))) return NextResponse.json({ error: 'Your password isn’t right.' }, { status: 400 });
  await prisma.admin.update({ where: { id: admin.id }, data: { totpEnabled: false, totpSecretEnc: null } });
  await adminLog(admin, 'admin_2fa_disabled');
  return NextResponse.json({ ok: true });
}
