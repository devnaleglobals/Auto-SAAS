# Security & compliance update — November 2026

## Deploy in this order (important)

1. **Database first.** Neon → SQL Editor → paste and run `prisma/security-update-2026-11.sql`.
   (Or run `npx prisma db push` locally with the production `DATABASE_URL`.)
   Skipping this crashes the dashboard, like the earlier `notifyReconnect` error.
2. **Vercel → Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_COMPANY_JURISDICTION` = city of your registered address, e.g. `Bidar, Karnataka`
   - `NEXT_PUBLIC_GRIEVANCE_OFFICER` = `Meena Bai` (or whoever handles complaints)
   - `NEXT_PUBLIC_COMPANY_ADDRESS` = full address exactly as on the GST certificate (check it is set)
   - Check `CRON_SECRET` is **at least 16 characters**. Cron routes now refuse to run without it.
3. Replace the files, then `git add -A`, `git commit`, `git push`. Vercel redeploys.
   Delete `app/api/instagram/media/route.js` and `lib/instagram.js` (dead code that referenced a model that no longer exists).
4. **Meta App Dashboard** — add the callback URLs (replace the domain with yours):
   - App settings → Basic → **Data deletion**: choose "Data deletion callback URL" →
     `https://auto-saas-dun.vercel.app/api/meta/data-deletion`
   - Facebook Login for Business → Settings → **Deauthorize callback URL** →
     `https://auto-saas-dun.vercel.app/api/meta/deauthorize`
   - Instagram → API setup with Instagram business login → Business login settings:
     **Deauthorize callback URL** → `.../api/meta/deauthorize`, **Data deletion request URL** → `.../api/meta/data-deletion`
5. **Razorpay** (needed for Live activation): Settings → Website/app details, enter:
   Terms `/terms`, Privacy `/privacy`, **Refund & cancellation `/refunds`**, **Shipping/delivery `/delivery`**, Contact `/contact`.
6. Test: sign up (the new consent box), log in, Settings → Privacy & data → Download your data.

Everyone stays signed in after the update. Old password-reset links stop working (people request a new one).

## What was fixed

### Security
| Issue | Risk | Fix |
|---|---|---|
| Login page followed any `?next=` URL, including other websites | Phishing via an open redirect after login | Only same-site paths accepted (login form and OAuth) |
| Sessions stayed valid 7 days after a password change or reset | A stolen session couldn't be cut off | Session version: password change/reset signs out all other devices; new "Log out other devices" button |
| No limit on login, signup, forgot/reset password | Password guessing, email flooding | Database-backed rate limits (8 tries / 15 min per email, 20 per IP) |
| Reset tokens stored in plain text | Database leak = account takeover | Only a SHA-256 hash is stored; older unused links are invalidated |
| Unknown-email logins answered faster | Reveals which emails have accounts | Constant-time comparison against a dummy hash |
| Facebook sign-in matched by Page | Any other admin of a client's Page could log into that client's workspace as its owner | Facebook sign-in only matches the same Facebook person |
| No CSRF origin check | Another site could trigger actions | Middleware blocks cross-site POST/PUT/PATCH/DELETE to the API |
| Cron routes ran if `CRON_SECRET` was missing (`Bearer undefined`) | Anyone could trigger jobs | Refuse to run without a 16+ char secret; constant-time compare |
| Webhook verify accepted if the token env was empty | Webhook hijack in a misconfigured deploy | Requires the token to be set; challenge sanitised |
| CSV exports of comments/leads | Commenter types `=HYPERLINK(...)` → runs in Excel | Formula cells are neutralised; exports are audit-logged |
| Debug endpoint open to Viewers | Read-only users saw comment samples | Requires the "edit automations" role |
| Tracked link redirect didn't recheck the target | Redirect to non-web schemes | Only `http(s)` targets; code format validated |
| Health check returned database error text | Leaked infrastructure details | Generic response; details only in logs |
| Invite could be accepted twice at the same moment | Plan member limit bypass | Atomic claim |
| Missing CSP | Clickjacking/plugin/base-tag attacks | `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`, `form-action` |
| Cookies without `secure` in some places | Sent over HTTP | One cookie helper, secure in production |
| Disconnecting an account left Meta webhooks subscribed | Meta kept sending data for that account | Unsubscribes at Meta before deleting |
| Saved post link shown as "View post" wasn't checked | A team member could save a `javascript:` link that runs in an admin's browser when clicked (stored XSS) | Only `https://` links are saved and shown |
| Pending invite links (including Admin invites) were sent to every member's browser | A Viewer could copy an Admin invite and join again as Admin | Only Owners/Admins receive invite links |
| Admin pages checked access only in the shared layout | A crafted page request can skip a layout in Next.js | Every admin page checks admin access itself (tested: non-admins get 404) |
| Razorpay "subscription.authenticated" granted the paid plan | Paid access before the first charge succeeded | Plan is granted on "activated"/"charged" (or verified checkout) |
| Suspended workspaces still hid/deleted comments and answered DMs | Suspension didn't fully stop the client | Suspended workspaces do nothing |
| Invalid email/phone after one retry was saved as the lead's email/phone | Bad data in Leads | Saved as an "unchecked" answer instead |
| Malformed request bodies crashed some APIs with a 500 | Noisy errors | They return a clear 400 |
| Email failures were silent | Hard to see why reset emails don't arrive | Vercel logs now show "Email not sent" with Resend's reason |

### Compliance (DPDP Act 2023, IT Act 2000, Meta Platform Terms, Razorpay)
- **Right to erasure:** Settings → Privacy & data → Delete my account (deletes owned workspaces, unsubscribes Meta webhooks, cancels Razorpay immediately).
- **Right to access:** Download your data (JSON, no tokens or password hashes).
- **Meta data deletion callback** with confirmation code and public status page (`/data-deletion/status?code=…`). Meta requires this or an instructions URL; the callback is the stronger option.
- **Meta deauthorize callback:** marks the account as needing reconnection, logs it and emails the workspace.
- **STOP / START** opt-out for people who comment or message: no more automatic DMs from that account until they message again.
- **Data retention:** daily cleanup cron (`/api/cron/cleanup`, added to `vercel.json`): logs and conversations 365 days, leads 730 days after last update, audit logs 2 years, dedupe IDs 30 days. The Privacy Policy shows these numbers automatically.
- **Consent record:** signup requires ticking Terms + Privacy; `termsAcceptedAt` is stored.
- **Privacy Policy rewritten:** Data Fiduciary vs Processor roles, all data categories (leads, messages, billing), sub-processors and cross-border transfer, retention, DPDP rights, cookies, breach notice, children, Grievance Officer. Removed the wrong claim that we request the `email` permission.
- **Terms updated:** 18+, client duties as Data Fiduciary, acceptable use, refunds link, your content, indemnity, changes, grievance timelines; jurisdiction now comes from `NEXT_PUBLIC_COMPANY_JURISDICTION` (was hard-coded to Pune).
- **New pages:** Refund & Cancellation (`/refunds`) and Service Delivery (`/delivery`), required by Razorpay; Grievance Officer on Contact.
- **Pricing:** INR and GST wording; removed an unverifiable comparison claim.

## Decisions for you to confirm
- The refund policy promises a **full refund within 7 days of the first payment**. Change `app/refunds/page.js` if you don't want that.
- Jurisdiction defaults to **Bidar, Karnataka** (your Meta-verified address). Set the env var if it should be different.
- Retention periods can be changed with `RETENTION_ACTIVITY_DAYS` / `RETENTION_LEAD_DAYS`.

## Still recommended (not code)
- Make sure every email in `SUPER_ADMIN_EMAILS` already has an account. Emails aren't verified at signup, so an unclaimed admin email could be registered by someone else.
- Change the reviewer account password you used in the Meta submission once review is fully done, and never share App Secrets in screenshots.
- Turn on 2-factor login for Vercel, Neon, GitHub, Razorpay, Meta Business and Resend.
- Rotate `CRON_SECRET` if it has appeared in a screenshot (cron-job.org URLs show it).
- Have a lawyer review the Privacy Policy, Terms and Refund policy before scaling. These pages follow common practice but aren't legal advice.
