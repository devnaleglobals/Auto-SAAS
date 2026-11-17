# ReplyRelay v13 — what's new and how to set it up

## Deploy in this order

1. **Database (Neon → SQL Editor):** run `prisma/update-v13.sql` once. It's safe to run again and also includes the
   November security update. Skipping it crashes the app (missing tables/columns).
2. **Vercel → Settings → Environment Variables:**
   - Add `ADMIN_SETUP_TOKEN` = a random value, 16+ characters
     (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`).
   - Check **Settings → General → Node.js Version is 20.x or 22.x** (Next.js 16 needs Node 20.9+).
   - `SUPER_ADMIN_EMAILS` is no longer used. You can delete it.
3. **Push the code** (replace your project files with this version, then `git add -A`, `git commit`, `git push`).
   Delete `middleware.js` from your repo if it's still there: it was renamed to `proxy.js` (Next.js 16).
4. Open **/admin/setup**, enter the token, create your Owner account (a separate admin login, not your client account).
5. Sign in at **/admin/login** → Settings → **My security** → turn on 2-step verification.
6. Settings → **Email delivery**: choose your provider, fill in the keys and sender addresses, **Send test**.
7. Settings → **Plans & pricing**, **Payments**, **Sign-up & trial**, **General**: check the values.

## Two separate logins

| Who | Sign in at | Account type | Session |
|---|---|---|---|
| Clients (businesses using the tool) | `/login` (email, Instagram or Facebook) | User + workspace | 7 days |
| You and your staff | `/admin/login` | Admin (own table, own password, optional 2-step) | 8 hours, strict cookie |

A client password never opens the admin console, and an admin session never opens a client dashboard.

## Admin console

| Page | What you can do |
|---|---|
| **Overview** | Revenue (MRR, collected this month), clients, trials, open tickets, failed emails, signups chart |
| **Clients** | Search/filter all workspaces. Per client: edit name and billing/GST details, give a complimentary plan until a date, start/extend/end a free trial, cancel the Razorpay subscription (at period end or now), reset monthly usage, suspend/resume with a reason, private notes, see team, accounts, automations, tickets, payments, delete client |
| **Users** | Search; edit name/email, send password-reset email, sign out of all devices, disable/enable sign-in, delete user |
| **Tickets** | Support desk: open / waiting for client / assigned to me / resolved; reply (emailed to client), internal notes (never shown to client), status, priority, assign to an admin |
| **Payments** | Every Razorpay payment |
| **Emails** | Every email sent, with status and the provider's error message when it failed |
| **Settings → General** | Product name, business name, proprietor, GSTIN, address, phone, support email, courts city, Grievance Officer, reply time (website, legal pages, emails) |
| **Settings → Sign-up & trial** | Open/close sign-ups, free trial on/off, trial days and plan, maintenance mode (pauses all sending + banner) |
| **Settings → Plans & pricing** | Name, price, messages, accounts, team members, description, "most popular", available to buy, Razorpay plan ID per plan; features list. Pricing and Billing pages update within a minute |
| **Settings → Payments** | Razorpay Key ID, Key secret, Webhook secret (encrypted), payments on/off, shows Test/Live mode and the webhook URL |
| **Settings → Email delivery** | Provider: Resend, SendGrid, Mailgun, Postmark, Brevo, Zoho ZeptoMail, or SMTP (presets for Gmail/Google Workspace, Zoho Mail, Microsoft 365, Amazon SES, Hostinger, GoDaddy/Titan, SendGrid SMTP, Brevo SMTP). Sender name; separate From addresses for account emails, alerts and support; reply-to; support team inbox; sending on/off; send test |
| **Settings → Email templates** | Edit subject and text of 14 emails (welcome, password reset, team invite, reconnect alert, payment received/failed, plan cancelled, trial ending, ticket emails, admin invite, test) or switch any off |
| **Settings → Announcement** | Banner on every client's dashboard |
| **Settings → Admin team** | Add admins (Owner / Admin / Support / Billing), change role, deactivate, reset their 2-step, remove |
| **Settings → My security** | Change password, 2-step verification (QR code for Google/Microsoft Authenticator, Authy) |
| **System** | Every setting checked (Working/Missing), last 24 hours of processing, broken connections, all URLs for Meta/Razorpay/cron |
| **Audit log** | Every admin sign-in and change, searchable |

### Roles

| Role | Clients & users | Billing & plans | Tickets | Settings & email | Admin team | Delete clients/users |
|---|---|---|---|---|---|---|
| Owner | View + edit | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | View + edit | ✓ | ✓ | ✓ | – | ✓ |
| Support | View | – | ✓ | Email log only | – | – |
| Billing | View | ✓ | – | – | – | – |

## For clients

- **Support** page in the dashboard: raise a ticket (topic, urgency), see replies, reply, close/reopen. Emails on every reply.
- Free-trial banner with days left; billing page shows the trial and hides plans you turned off.
- Disabled accounts can't sign in; maintenance banner when you turn maintenance on.

## Website

`/` home (how it works, features, trial call-to-action) · `/features` · `/demo` (interactive comment-to-DM simulator:
set a keyword, comment as a follower, see public reply, DM, follow check and lead capture) · `/pricing` (live plans and
trial from the admin) · `/contact` (contact form creates a support ticket) · legal pages (Terms, Privacy, Refunds,
Delivery, Data deletion) using the business details from Settings → General.

## Security in this version

- **Next.js upgraded 14.2.35 → 16.4.6 and React 18 → 19.2.9.** Next 14 no longer gets fixes and had published critical
  advisories; `npm audit` now reports 0 vulnerabilities.
- Separate admin accounts, roles, 8-hour sessions, `SameSite=Strict` cookie, optional TOTP 2-step, rate-limited admin
  login (5 tries per email / 15 min), admin sign-ins logged with IP.
- First admin can only be created with `ADMIN_SETUP_TOKEN` while no admin exists.
- All API keys and passwords saved in the console (email provider, Razorpay) are encrypted with `ENCRYPTION_KEY`
  (AES-256-GCM) and never sent back to the browser.
- Payment configuration and plan IDs are never shown to clients; error details go to logs only.
- Contact form: rate limits per IP and email, hidden bot field.
- Internal ticket notes never reach the client; clients only see their own workspace's tickets.

## Environment variables (complete list)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooled connection string |
| `APP_URL` | Yes | No trailing slash |
| `AUTH_SECRET` | Yes | Random 64 chars; signs client and admin sessions |
| `ENCRYPTION_KEY` | Yes | 64 hex chars; **never change** (encrypts Meta tokens and console secrets) |
| `CRON_SECRET` | Yes | 16+ chars |
| `ADMIN_SETUP_TOKEN` | Once | For /admin/setup; can be removed after |
| `WEBHOOK_VERIFY_TOKEN` or `IG_WEBHOOK_VERIFY_TOKEN` | Yes | Same value in Meta webhook settings |
| `IG_APP_ID`, `IG_APP_SECRET`, `FB_APP_ID`, `FB_APP_SECRET` | Yes | Meta apps |
| `META_API_VERSION` | Yes | `v23.0` |
| `FB_CONFIG_ID` | No | Facebook Login for Business configuration |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_*` | Fallback | Can be set in Admin → Settings instead |
| `RESEND_API_KEY`, `EMAIL_FROM` | Fallback | Used only if no provider is set in Admin → Settings → Email delivery |
| `NEXT_PUBLIC_COMPANY_*`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_GRIEVANCE_*` | Fallback | Admin → Settings → General overrides them |
| `RETENTION_ACTIVITY_DAYS`, `RETENTION_LEAD_DAYS` | No | Data retention (defaults 365 / 730) |

## Not included (possible next steps)

- "Log in as client" (impersonation) for support — left out on purpose for privacy; can be added with consent and audit.
- Replies to ticket emails don't flow back into the ticket automatically (they go to your support inbox); clients reply in
  the dashboard. Inbound email parsing can be added with your email provider's inbound webhook.
- Coupons/discount codes and yearly plans (Razorpay offers can be added).
