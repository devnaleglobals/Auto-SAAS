import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { rzp } from '@/lib/razorpay';

// Opens Razorpay's invoice page for one of the workspace's payments.
export async function GET(req, { params }) {
  const ctx = await getContext();
  if (!ctx) return new Response('Sign in first.', { status: 401 });
  const { id } = await params;
  const pay = await prisma.payment.findFirst({ where: { id, workspaceId: ctx.workspace.id } });
  if (!pay?.invoiceId) return new Response('No invoice for this payment yet.', { status: 404 });
  try {
    const inv = await rzp(`/invoices/${pay.invoiceId}`);
    if (!inv.short_url) throw new Error('missing');
    return Response.redirect(inv.short_url, 302);
  } catch {
    return new Response('Razorpay couldn’t open this invoice right now. Try again in a minute.', { status: 502 });
  }
}
