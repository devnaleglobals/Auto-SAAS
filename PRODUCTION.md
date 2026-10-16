# Going to production

## 1. Custom domain (e.g. app.yourbrand.in)
1. Buy the domain (GoDaddy, Hostinger, Namecheap, Cloudflare).
2. Vercel → project → Settings → Domains → Add `app.yourbrand.in`. Vercel shows a DNS record
   (usually CNAME `app` → `cname.vercel-dns.com`). Add it at your domain registrar. HTTPS is automatic.
3. Vercel → Environment Variables: `APP_URL=https://app.yourbrand.in` → Redeploy.
4. Update every URL in Meta (they're listed on the app's Settings page under "Meta app links"):
   - App settings → Basic: App domains, Privacy, Terms, Data deletion, Website site URL
   - Instagram: Business login redirect URI, webhook callback
   - Facebook Login for Business: Valid OAuth Redirect URIs; Messenger/Page webhook callback
5. Razorpay webhook URL and cron-job.org URL → new domain.
6. Reconnect each Instagram/Facebook account once (Accounts → Reconnect).

## 2. Razorpay billing
1. Sign up at razorpay.com and complete KYC (business PAN, bank account). Start in **Test mode**.
2. Subscriptions → Plans → create 3 monthly plans matching `lib/plans.js` (₹499, ₹1,499, ₹3,999).
   Copy each `plan_...` ID into `RAZORPAY_PLAN_STARTER / PRO / AGENCY`.
3. Settings → API Keys → generate → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
4. Settings → Webhooks → Add: URL `https://YOUR_DOMAIN/api/billing/webhook`, a secret
   (→ `RAZORPAY_WEBHOOK_SECRET`), events: subscription.authenticated, activated, charged, pending,
   halted, cancelled, completed, resumed.
5. Test with Razorpay's test cards/UPI, then switch to Live keys and live plans.
To change prices or limits: edit `lib/plans.js` and create matching Razorpay plans.

## 3. Email (Resend)
1. resend.com → add and verify your domain (DNS records) → API key → `RESEND_API_KEY`.
2. `EMAIL_FROM="ReplyRelay <hello@yourbrand.in>"`.
Used for: reconnect alerts (max once a day per account), payment failed/cancelled, password resets.

## 4. Monitoring
- UptimeRobot or Better Stack (free): monitor `https://YOUR_DOMAIN/api/health` every 5 minutes, alert by email/WhatsApp.
- cron-job.org: `/api/cron/check-comments?key=CRON_SECRET` every 5 minutes (reminders + backup checks).
- Vercel → Logs for errors.

## 5. Database
- Neon: upgrade from the free plan before paying customers (point-in-time restore / backups).
- Run `npx prisma db push` after every update that changes `prisma/schema.prisma`.

## 6. Platform admin console
1. Vercel → Environment Variables: `SUPER_ADMIN_EMAILS = you@yourmail.com` (comma-separate several). These people must
   have signed up with that email (email login) → Redeploy.
2. Open `/admin` (or the "Platform admin" link at the bottom of the sidebar). Everyone else gets a 404.
3. What you can do: see MRR, revenue, clients, usage and broken connections; open a client to give a complimentary
   plan until a date, reset this month's usage, suspend/resume (stops all sending; the client sees your reason),
   and keep private notes. Every action is recorded in System → Admin log.

## 7. Before launch checklist
- [ ] Meta App Review approved (see APP_REVIEW.md)
- [ ] Custom domain live, all Meta URLs updated
- [ ] Razorpay live keys + live plans + webhook
- [ ] Resend domain verified, test password reset works
- [ ] Uptime monitor and cron job running
- [ ] NEXT_PUBLIC_SUPPORT_EMAIL set to a real support inbox
