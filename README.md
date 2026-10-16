# ReplyRelay — comment → DM automation for Instagram and Facebook (enterprise SaaS)

**Going live for everyone (no testers): follow `APP_REVIEW.md`. Production setup, billing, email and domain: `PRODUCTION.md`.**

Customers sign in with Instagram or Facebook (or email), pick a post, set keywords and a message.
When someone comments, ReplyRelay sends them a private message and replies under the comment.

Stack: Next.js 14 · Prisma · PostgreSQL · Meta Graph APIs · Vercel

## Automation types
1. **Comment reply** — public reply under matching comments only.
2. **Comment to DM** — private message to the commenter. Either a plain message with a (tracked) link,
   or an opener with a button that starts a conversation flow.
3. **DM conversation** — someone sends a keyword in DMs; a conversation with buttons starts.

Conversation flows: up to 20 messages, each with optional image, up to 3 buttons ("go to message" or
"open link"), and an optional automatic next message. Typing a button's label works like tapping it.

**Follow check (Instagram):** optional per automation. Runs on every incoming message and every tap.
If the person doesn't follow, they get the follow message with an "I've followed" button; the flow
continues as soon as a check passes. Meta only allows this check after the person has messaged the
account or tapped a button, which is why comment automations send an opener button first.
Facebook doesn't expose Page follows, so the check is Instagram-only.

## More automations
- **Story reply** (Instagram): a reply to your story with a keyword (or any reply) starts a conversation.
- **Story mention** (Instagram): someone mentions you in their story and gets your thank-you conversation.
- **Comment moderation** (both): hide or delete comments with blocked words and/or links, on one post or all posts.
- **Welcome menu** (both): Accounts → Welcome menu. Up to 4 questions shown when someone opens a new chat; each starts a conversation.
- **Lead capture** (both): any conversation message can ask for name, phone, email or a custom question. Answers are validated
  and saved to **Leads** (CSV export). Facebook shows one-tap phone/email buttons.
- **Smart reminder** (both): one follow-up if the person didn't tap a link, after a delay you choose, only inside Meta's 24-hour window.
  Reminders are sent by the scheduled checker, so keep the cron-job.org job running (every 5 minutes is enough).

## Billing
Plans and limits live in `lib/plans.js` (Free, Starter ₹499, Pro ₹1,499, Agency ₹3,999). Limits: messages per month,
connected accounts, team members. Razorpay subscriptions with hosted checkout; the webhook activates and renews plans.
Cancelling keeps the plan until the paid period ends.

## Features
- Sign in with Instagram, Facebook or email; one-step connect
- Workspaces with roles (Owner, Admin, Member, Viewer), invite links, workspace switcher
- Automations on one post or all posts; keyword / exact / any-comment triggers; random public replies
- Start/stop dates, reply limits, edit, duplicate, pause
- Tracked links (`/l/<code>`): clicks per person, click-through rate
- Overview analytics (30 days), per-automation log with filters, CSV export
- Activity (audit) log, reconnect alerts, comment checker + webhooks

## Customer flow
1. **Continue with Instagram** or **Continue with Facebook** → Allow. (Creates the account and connects in one step.)
2. Pick a post → keywords → message → **Start automation**.
Agencies can also sign up with email and connect several accounts from the dashboard.

## Platforms
Each platform is one file in `lib/platforms/` with the same functions. Add a new platform by
creating a file there, registering it in `lib/platforms/index.js`, and adding it to the `Platform`
enum in `prisma/schema.prisma`. See the comment in `index.js` for the full list of functions.

| | Instagram | Facebook Pages |
|---|---|---|
| Login | Business Login for Instagram | Facebook Login for Business |
| Comments | `/{media}/comments` + `comments` webhook | `/{post}/comments` + Page `feed` webhook |
| Private reply | `/me/messages` with `comment_id` | `/{page}/messages` with `comment_id` (Messenger) |
| Public reply | `/{comment}/replies` | `/{comment}/comments` |
| Token | 60 days, refreshed daily by cron | Page token, doesn't expire |

## Meta setup (one Meta app for both)
1. **Instagram:** Use cases → *Manage messaging & content on Instagram* → API setup with Instagram business login.
   Copy the Instagram app ID/secret to `IG_APP_ID`/`IG_APP_SECRET`.
   Redirect URI: `https://YOUR_DOMAIN/api/instagram/callback`.
   Webhook: `https://YOUR_DOMAIN/api/webhooks/instagram`, fields `comments`, `messages`, `messaging_postbacks`.
2. **Facebook:** Add use case → *Engage with customers on Messenger from Meta* (and/or *Manage everything on your Page*),
   plus *Facebook Login for Business*. App settings → Basic gives `FB_APP_ID`/`FB_APP_SECRET`.
   Valid OAuth redirect URI: `https://YOUR_DOMAIN/api/facebook/callback`.
   Webhooks → Page → callback `https://YOUR_DOMAIN/api/webhooks/facebook`, fields `feed`, `messages`, `messaging_postbacks`.
3. Both webhooks use the same verify token: `WEBHOOK_VERIFY_TOKEN`.
4. App settings → Basic: Privacy Policy `https://YOUR_DOMAIN/privacy`, Data deletion `https://YOUR_DOMAIN/data-deletion`.
5. **App Review (Advanced Access)** is required before customers who aren't app testers can connect,
   and before Meta shares comment data/webhooks. Request:
   - Instagram: `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages`
   - Facebook: `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `pages_manage_engagement`, `pages_manage_metadata`, `pages_messaging`
   Business Verification is required too.

## Run / deploy
```bash
cp .env.example .env      # fill in values
npm install
npx prisma db push        # creates tables
npm run dev
```
Deploy on Vercel from GitHub; add the same env vars in Vercel.

## Upgrading
From v4 (enterprise): `npx prisma db push` (no reset needed; adds automation types, flows, conversations).
From anything older: the structure changed (workspaces, roles, click tracking). Test data must be reset:
```bash
npx prisma db push --force-reset
```
Then sign in again and reconnect accounts.

## Checker (works before webhook approval)
- **Check for new comments / messages** button on each automation.
- The cron also reads recent DMs for accounts with conversation flows (fallback for message webhooks).
  Taps can't be read this way, but typing a button's label works, so flows are testable before approval.
- `/api/cron/check-comments?key=CRON_SECRET` every minute from cron-job.org.
- Each check saves a note explaining what Meta returned.
- Diagnostics: `/api/automations/<id>/debug` (logged in).

## Rules the code follows
- Instagram/Facebook allow one private reply per comment, within 7 days.
- Own comments and replies inside threads are ignored (no loops).
- Duplicate deliveries are ignored (unique comment ID).
- Reply limits are reserved atomically.
- Expired or revoked connections show a Reconnect banner.
