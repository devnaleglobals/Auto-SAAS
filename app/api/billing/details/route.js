import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Business details printed on Razorpay invoices.
export async function PUT(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const b = await req.json().catch(() => ({}));
  const clean = (v, n) => String(v || '').trim().slice(0, n) || null;
  const data = {
    billingName: clean(b.billingName, 80),
    billingEmail: clean(b.billingEmail, 120)?.toLowerCase() || null,
    billingPhone: clean(b.billingPhone, 20),
    billingGstin: clean(b.billingGstin, 15)?.toUpperCase() || null,
    billingAddress: clean(b.billingAddress, 300),
  };
  if (!data.billingName) return NextResponse.json({ error: 'Enter the business name for invoices.' }, { status: 400 });
  if (data.billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.billingEmail)) return NextResponse.json({ error: 'Check the billing email.' }, { status: 400 });
  if (data.billingPhone && data.billingPhone.replace(/[^\d]/g, '').length < 10) return NextResponse.json({ error: 'Enter a 10-digit phone number, with country code if outside India.' }, { status: 400 });
  if (data.billingGstin && !GSTIN.test(data.billingGstin)) return NextResponse.json({ error: 'That GSTIN doesn’t look right. It has 15 characters, like 29ABCDE1234F1Z5.' }, { status: 400 });
  await prisma.workspace.update({ where: { id: ctx.workspace.id }, data });
  await audit(ctx, 'billing.details_updated', data.billingName);
  return NextResponse.json({ ok: true });
}
