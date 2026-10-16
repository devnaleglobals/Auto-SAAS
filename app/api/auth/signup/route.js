import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { createWorkspaceFor } from '@/lib/context';

export async function POST(req) {
  const { name, email, password, company } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  const e = email.toLowerCase().trim();
  if (await prisma.user.findUnique({ where: { email: e } })) {
    return NextResponse.json({ error: 'An account with this email already exists. Log in instead.' }, { status: 409 });
  }
  const user = await prisma.user.create({ data: { name: name.trim(), email: e, passwordHash: await bcrypt.hash(password, 12) } });
  await createWorkspaceFor(user, company?.trim() || null);
  await createSession(user);
  return NextResponse.json({ ok: true });
}
