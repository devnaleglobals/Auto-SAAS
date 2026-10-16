# Meta App Review kit — ReplyRelay

Approval removes the tester requirement: after it, ANY Instagram Business/Creator account or
Facebook Page can sign in and connect. Until then only accounts with a role on the Meta app work.

## Before you submit
1. **Business Verification** — Meta Business Suite → Settings → Security Center → Start verification.
   Use Devnale Globals' legal name, address, phone, website and a document (GST certificate,
   Udyam registration, or a utility bill/bank statement in the business name).
2. **App settings → Basic** — fill in:
   - App icon (1024×1024): `replyrelay-app-icon-1024.png`, Category: Business and pages, Contact email
   - Privacy Policy URL: `https://YOUR_DOMAIN/privacy`
   - Terms of Service URL: `https://YOUR_DOMAIN/terms`
   - User data deletion → Data deletion instructions URL: `https://YOUR_DOMAIN/data-deletion`
   - App domains: `YOUR_DOMAIN`
3. Make sure the full flow works with a tester account (it's what you'll record).
4. Create a reviewer test login: sign up on your site with email (e.g. `review@yourdomain.com`)
   and connect a tester Instagram account + Facebook Page to it. Give Meta these credentials.

## Permissions to request (Advanced Access) and what to write

### instagram_business_basic
> ReplyRelay lets Instagram professional accounts automatically reply to comments. We use
> instagram_business_basic to show the connected account's username and profile picture and to list
> its posts, so the user can choose which post an automation runs on. We do not display this data to
> anyone other than the account owner and their workspace team.

### instagram_business_manage_comments
> Also used for comment moderation: owners list blocked words; matching comments on their posts are hidden (or deleted).
> Users create an automation for a post with keywords (for example "link"). We use
> instagram_business_manage_comments to receive comment webhooks and read new comments on the posts
> the user selected, check them against the user's keywords, and post the user's configured public
> reply under matching comments (for example "Sent you a DM"). We only act on posts in an active
> automation that the user created.

### instagram_business_manage_messages
> Two uses, both initiated by the Instagram user:
> 1. When a comment matches the account owner's keywords, we send one private reply to that commenter
>    (comment_id private-reply endpoint) with the owner's message, optionally with one button.
> 2. When someone messages the account with a keyword, or taps a button we sent, we reply with the next
>    message of a conversation the owner designed (button templates with postback and URL buttons).
>    If the owner enabled it, we read is_user_follow_business from the User Profile API (only after
>    the person messaged or tapped, as Meta requires) and ask them to follow before continuing.
> 3. When someone replies to the account's story or mentions it in their story, we reply with the owner's conversation.
> 4. We set the account's ice breakers (welcome questions) chosen by the owner.
> 5. If the owner adds questions to a conversation, we save the answers the person types (name, phone, email) for the owner.
> 6. One optional reminder may be sent within 24 hours of the person's last message if they didn't open the link.
> We only reply within the standard messaging window. No unsolicited or bulk messages.

### Facebook: pages_show_list, pages_read_engagement, pages_read_user_content
> Users sign in with Facebook and choose the Pages they manage. We list their Pages and each Page's
> posts so they can pick a post, and read new comments on those posts to match the user's keywords.

### pages_manage_engagement
> We post the user's configured public reply under matching comments on their Page posts, and hide or delete comments
> that match the owner's blocked words (comment moderation).

### pages_manage_metadata
> We subscribe the connected Page to the feed webhook so we receive new comments in real time.

### pages_messaging
> When a comment matches, we send one private reply in Messenger to the commenter (comment_id private
> reply) with the message and link the Page admin wrote. Standard messaging window rules apply.

## Screencast script (record one video per platform, 2–4 minutes each, with voice or captions)
1. Open `https://YOUR_DOMAIN`, click **Get started → Continue with Instagram** (or Facebook).
2. Show Meta's permission screen with every permission listed, click **Allow**.
3. Land on **Overview** showing the connected account. Open **Accounts** to show it.
4. **Automations → New automation**: pick a post (shows `instagram_business_basic` / `pages_read_engagement`),
   add keyword "link", write the message with a link and a public reply, tick the confirm box, **Start**.
5. On a phone, from a different (tester) account, comment "link" on that post.
6. Show a **DM conversation** automation too: from the phone, send its keyword in DMs, tap the buttons,
   and (with the follow check on) show the follow message, follow the account, tap "I've followed",
   and the conversation continuing.
7. Back in ReplyRelay, click **Check for new comments** (or wait for the webhook) — show the row appear
   in **Who got the message** (manage_comments).
8. Show the phone receiving the private message (manage_messages / pages_messaging) and the public
   reply under the comment (manage_comments / pages_manage_engagement).
9. Show **Pause** and **Delete**, and the **Privacy Policy** link in the footer.

## Submission checklist
- [ ] Business Verification approved
- [ ] Icon, category, privacy, terms, data deletion, app domain filled in (both the Facebook app and the Instagram app name)
- [ ] Reviewer test login created (email + password) with a tester Instagram account and Facebook Page connected
- [ ] One screencast per platform showing every requested permission in use
- [ ] Permission descriptions pasted from this file
- [ ] "Testing instructions" in App settings → Basic → Website filled with the reviewer login and steps

## Tips that avoid rejections
- Every permission you request must appear in the video. Don't request ones you don't use.
- Captions that name the permission at the moment it's used help reviewers a lot.
- If comment data doesn't arrive in Standard Access, say so in the notes: "Comment webhooks are not
  delivered before Advanced Access; we demonstrate with our polling fallback, which uses the same
  permission."
- Rejections come with a reason; fix and resubmit. 1–3 rounds is normal.
