// Conversation flow runner: steps, buttons, questions (lead capture), follow check, follow-ups.
import crypto from 'crypto';
import { prisma } from './db';
import { decrypt } from './crypto';
import { getPlatform, appUrl } from './platforms';
import { canSend, recordSend, LIMIT_NOTE } from './usage';

const PREFIX = 'RR';
export const payload = (automationId, action, arg = '') => `${PREFIX}:${automationId}:${action}:${arg}`;
function parsePayload(p) {
  if (!p || !p.startsWith(`${PREFIX}:`)) return null;
  const [, automationId, action, ...rest] = p.split(':');
  return { automationId, action, arg: rest.join(':') };
}

const clip = (s, n) => (s || '').slice(0, n);
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const newCode = () => crypto.randomBytes(5).toString('base64url');
export const FLOW_TYPES = ['DM_FLOW', 'STORY_REPLY', 'STORY_MENTION'];

// The steps an automation runs. A comment->DM automation with "require follow" but no
// custom flow gets one automatic step: the message plus an "Open link" button.
export function stepsOf(a) {
  const steps = Array.isArray(a.flow?.steps) ? a.flow.steps.filter((s) => s?.id) : [];
  if (steps.length) return steps;
  if (a.type === 'COMMENT_DM' && a.requireFollow) {
    return [{ id: 'auto', text: a.linkUrl ? 'Here you go 👇' : a.dmMessage, image: null, buttons: a.linkUrl ? [{ title: 'Open link', action: 'url', target: a.linkUrl }] : [], next: null }];
  }
  return [];
}
export const hasFlow = (a) => stepsOf(a).length > 0;

async function log(conv, kind, detail) {
  await prisma.flowLog.create({ data: { conversationId: conv.id, kind, detail: detail ? String(detail).slice(0, 300) : null } }).catch(() => {});
}

function runtime(channel, automation) {
  return { channel, automation, platform: getPlatform(channel.platform), token: decrypt(channel.accessTokenEnc) };
}

function buttonUrl(rt, conv, target, stepId, index) {
  if (conv.linkCode && target === rt.automation.linkUrl) return `${appUrl()}/l/${conv.linkCode}`;
  if (rt.automation.trackClicks && conv.trackCode && stepId != null) return `${appUrl()}/l/${conv.trackCode}.${stepId}.${index}`;
  return target;
}

const ASK_TEXT = {
  name: 'What’s your name?',
  phone: 'What’s your phone number?',
  email: 'What’s your email address?',
};

function stepMessage(rt, conv, step) {
  const text = clip(step.text || (step.ask ? ASK_TEXT[step.ask.field] : '…'), 640);
  if (step.ask) {
    // Facebook offers one-tap phone and email answers.
    if (rt.channel.platform === 'FACEBOOK' && (step.ask.field === 'phone' || step.ask.field === 'email')) {
      return { text, quick_replies: [{ content_type: step.ask.field === 'phone' ? 'user_phone_number' : 'user_email' }] };
    }
    return { text };
  }
  const buttons = (step.buttons || []).slice(0, 3).filter((b) => b.title && b.target).map((b, i) => (
    b.action === 'url'
      ? { type: 'web_url', url: buttonUrl(rt, conv, b.target, step.id, i), title: clip(b.title, 20) }
      : { type: 'postback', title: clip(b.title, 20), payload: payload(rt.automation.id, 'STEP', b.target) }
  ));
  if (!buttons.length) return { text };
  return { attachment: { type: 'template', payload: { template_type: 'button', text, buttons } } };
}

async function send(rt, conv, message) {
  if (!(await canSend(rt.channel.workspaceId))) throw new Error(LIMIT_NOTE);
  await rt.platform.sendMessage(rt.channel, rt.token, { id: conv.contactId }, message);
  await recordSend(rt.channel.workspaceId);
  await prisma.conversation.update({ where: { id: conv.id }, data: { lastSentAt: new Date() } }).catch(() => {});
}

export async function sendStep(rt, conv, stepId, depth = 0) {
  const steps = stepsOf(rt.automation);
  const step = steps.find((s) => s.id === stepId) || steps[0];
  if (!step || depth > 6) return conv;
  try {
    if (step.image) await send(rt, conv, { attachment: { type: 'image', payload: { url: step.image } } });
    await send(rt, conv, stepMessage(rt, conv, step));
  } catch (e) {
    await log(conv, 'error', `Message "${step.name || step.id}": ${e.message}`);
    return conv;
  }
  if (step.ask) {
    conv = await prisma.conversation.update({ where: { id: conv.id }, data: { currentStepId: step.id, pendingStepId: null, state: 'AWAITING_INPUT', inputStepId: step.id, inputTries: 0 } });
    await log(conv, 'step', step.id);
    return conv; // wait for the answer
  }
  const done = !(step.buttons || []).some((b) => b.action !== 'url') && !step.next;
  conv = await prisma.conversation.update({ where: { id: conv.id }, data: { currentStepId: step.id, pendingStepId: null, state: done ? 'DONE' : 'ACTIVE' } });
  await log(conv, 'step', step.id);
  if (step.next) return sendStep(rt, conv, step.next, depth + 1);
  return conv;
}

// Returns true when the flow may continue. Runs on every message and every tap.
async function passesFollowGate(rt, conv, thenStepId) {
  const a = rt.automation;
  if (!a.requireFollow || !rt.platform.supportsFollowCheck) return true;

  let contact;
  try { contact = await rt.platform.getContact(rt.channel, rt.token, conv.contactId); }
  catch (e) { await log(conv, 'error', `Follow check failed: ${e.message}`); return true; } // fail open
  if (contact.username && !conv.username) await prisma.conversation.update({ where: { id: conv.id }, data: { username: contact.username } });

  if (contact.follows !== false) {
    if (conv.state === 'AWAITING_FOLLOW') await log(conv, 'follow_ok', `after ${conv.followPrompts} prompt(s)`);
    await prisma.conversation.update({ where: { id: conv.id }, data: { followed: contact.follows === true ? true : conv.followed } });
    return true;
  }

  const again = conv.followPrompts > 0;
  const text = clip(again ? (a.followRetry || "We still can't see your follow 🙈 Follow us, then tap the button again.") : (a.followPrompt || 'Please follow us to continue 🙏 Then tap the button below.'), 640);
  await send(rt, conv, {
    attachment: { type: 'template', payload: { template_type: 'button', text, buttons: [{ type: 'postback', title: clip(a.followButton || "I've followed ✅", 20), payload: payload(a.id, 'FOLLOW') }] } },
  }).catch((e) => log(conv, 'error', `Follow prompt: ${e.message}`));
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { state: 'AWAITING_FOLLOW', pendingStepId: thenStepId, followed: false, followPrompts: { increment: 1 } },
  });
  await log(conv, 'follow_prompt', again ? 'repeat' : 'first');
  return false;
}

// ---- Lead capture ----
const VALID = {
  email: (t) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t),
  phone: (t) => { const d = t.replace(/[^\d]/g, ''); return d.length >= 7 && d.length <= 15; },
  name: (t) => t.length >= 2 && t.length <= 60,
  custom: (t) => t.length >= 1,
};
const RETRY = {
  email: 'That doesn’t look like an email address. Could you check it and send it again?',
  phone: 'That doesn’t look like a phone number. Please send it with the country code, like +91 98765 43210.',
  name: 'Please send your name.',
  custom: 'Please type your answer.',
};

async function handleAnswer(rt, conv, text) {
  const step = stepsOf(rt.automation).find((s) => s.id === conv.inputStepId);
  if (!step?.ask) {
    await prisma.conversation.update({ where: { id: conv.id }, data: { state: 'ACTIVE', inputStepId: null } });
    return;
  }
  const field = step.ask.field;
  const answer = (text || '').trim();
  if (!VALID[field]?.(answer) && conv.inputTries < 1) {
    await prisma.conversation.update({ where: { id: conv.id }, data: { inputTries: { increment: 1 } } });
    await send(rt, conv, { text: RETRY[field] }).catch(() => {});
    return;
  }
  const label = step.ask.label || step.name || clip(step.text, 60) || 'Answer';
  const existing = await prisma.lead.findUnique({ where: { channelId_contactId: { channelId: rt.channel.id, contactId: conv.contactId } } });
  const data = {
    username: conv.username || existing?.username || null,
    source: rt.automation.name,
    ...(field === 'name' ? { name: clip(answer, 80) } : {}),
    ...(field === 'phone' ? { phone: clip(answer, 30) } : {}),
    ...(field === 'email' ? { email: clip(answer.toLowerCase(), 120) } : {}),
    ...(field === 'custom' ? { answers: { ...(existing?.answers || {}), [clip(label, 80)]: clip(answer, 500) } } : {}),
  };
  await prisma.lead.upsert({
    where: { channelId_contactId: { channelId: rt.channel.id, contactId: conv.contactId } },
    create: { workspaceId: rt.automation.workspaceId, channelId: rt.channel.id, contactId: conv.contactId, ...data },
    update: data,
  });
  await log(conv, 'lead', `${field}: ${clip(answer, 80)}`);
  conv = await prisma.conversation.update({ where: { id: conv.id }, data: { state: step.next ? 'ACTIVE' : 'DONE', inputStepId: null, inputTries: 0 } });
  if (step.next) await sendStep(rt, conv, step.next);
}

async function withinLimits(a) {
  const now = new Date();
  if (a.status !== 'ACTIVE') return false;
  if (a.startAt && now < a.startAt) return false;
  if (a.endAt && now > a.endAt) { await prisma.automation.update({ where: { id: a.id }, data: { status: 'COMPLETED' } }); return false; }
  return true;
}

// Starts (or restarts) the flow for a person.
export async function startFlow(channel, automation, contactId, { username = null, linkCode = null, countIt = true } = {}) {
  const rt = runtime(channel, automation);
  const first = stepsOf(automation)[0];
  if (!first) return null;

  const existing = await prisma.conversation.findUnique({ where: { automationId_contactId: { automationId: automation.id, contactId } } });
  if (countIt && !existing && FLOW_TYPES.includes(automation.type)) {
    if (automation.maxReplies) {
      const r = await prisma.automation.updateMany({ where: { id: automation.id, replyCount: { lt: automation.maxReplies } }, data: { replyCount: { increment: 1 } } });
      if (!r.count) { await prisma.automation.update({ where: { id: automation.id }, data: { status: 'COMPLETED' } }); return null; }
    } else {
      await prisma.automation.update({ where: { id: automation.id }, data: { replyCount: { increment: 1 } } });
    }
  }
  const now = new Date();
  const conv = await prisma.conversation.upsert({
    where: { automationId_contactId: { automationId: automation.id, contactId } },
    create: { automationId: automation.id, contactId, username, linkCode, trackCode: newCode(), state: 'ACTIVE', lastInboundAt: now },
    update: { state: 'ACTIVE', currentStepId: null, pendingStepId: null, inputStepId: null, followUpSentAt: null, lastInboundAt: now, ...(linkCode ? { linkCode } : {}), ...(username ? { username } : {}) },
  });
  await log(conv, 'started', existing ? 'restart' : null);
  let current = conv;
  if (!current.username) {
    // The person messaged or tapped, so Meta allows reading their name now.
    const contact = await rt.platform.getContact(channel, rt.token, contactId).catch(() => null);
    if (contact?.username) current = await prisma.conversation.update({ where: { id: conv.id }, data: { username: contact.username } });
  }
  if (await passesFollowGate(rt, current, first.id)) return sendStep(rt, current, first.id);
  return current;
}

function matches(a, text) {
  const t = normalize(text);
  if (a.matchType === 'ANY') return true;
  if (!t) return false;
  return a.keywords.some((kw) => {
    const k = normalize(kw);
    if (!k) return false;
    if (a.matchType === 'EXACT') return t === k;
    return new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(t);
  });
}

const touch = (conv) => prisma.conversation.update({ where: { id: conv.id }, data: { lastInboundAt: new Date() } }).catch(() => {});

// Handles one incoming DM, story reply/mention, or button tap.
// item = { contactId, mid, text, payload, username?, storyReply?, storyMention? }
export async function handleInbound(channel, item) {
  if (!item?.contactId || !item.mid) return { skipped: 'missing ids' };
  try { await prisma.inboundMessage.create({ data: { mid: item.mid } }); }
  catch (e) { if (e.code === 'P2002') return { skipped: 'duplicate' }; throw e; }

  // 1. Button taps and welcome-menu questions carry our payload.
  const p = parsePayload(item.payload);
  if (p) {
    const a = await prisma.automation.findFirst({ where: { id: p.automationId, channelId: channel.id } });
    if (!a || !(await withinLimits(a))) return { skipped: 'automation not running' };
    const rt = runtime(channel, a);
    if (p.action === 'START') return { started: Boolean(await startFlow(channel, a, item.contactId, { username: item.username, linkCode: p.arg || null, countIt: !p.arg })) };

    let conv = await prisma.conversation.findUnique({ where: { automationId_contactId: { automationId: a.id, contactId: item.contactId } } });
    if (!conv) conv = await prisma.conversation.create({ data: { automationId: a.id, contactId: item.contactId, username: item.username, trackCode: newCode() } });
    await touch(conv);
    if (p.action === 'STEP') {
      await log(conv, 'tap', item.text || p.arg);
      if (await passesFollowGate(rt, conv, p.arg)) await sendStep(rt, conv, p.arg);
      return { tapped: p.arg };
    }
    if (p.action === 'FOLLOW') {
      const target = conv.pendingStepId || stepsOf(a)[0]?.id;
      if (await passesFollowGate(rt, conv, target)) await sendStep(rt, conv, target);
      return { followCheck: true };
    }
    return { skipped: 'unknown action' };
  }

  // 2. A typed message inside an ongoing conversation (last 24 hours).
  if (!item.storyMention) {
    const recent = await prisma.conversation.findFirst({
      where: { contactId: item.contactId, automation: { channelId: channel.id, status: 'ACTIVE' }, state: { in: ['ACTIVE', 'AWAITING_FOLLOW', 'AWAITING_INPUT'] }, updatedAt: { gt: new Date(Date.now() - 86400000) } },
      orderBy: { updatedAt: 'desc' }, include: { automation: true },
    });
    if (recent) {
      const rt = runtime(channel, recent.automation);
      await touch(recent);
      if (recent.state === 'AWAITING_INPUT') { await handleAnswer(rt, recent, item.text); return { answered: true }; }
      if (recent.state === 'AWAITING_FOLLOW') {
        // Any message re-checks the follow.
        if (await passesFollowGate(rt, recent, recent.pendingStepId)) await sendStep(rt, recent, recent.pendingStepId);
        return { followCheck: true };
      }
      // Typed the text of a button instead of tapping it.
      const step = stepsOf(recent.automation).find((s) => s.id === recent.currentStepId);
      const bi = step?.buttons?.findIndex((b) => normalize(b.title) === normalize(item.text)) ?? -1;
      const btn = bi >= 0 ? step.buttons[bi] : null;
      if (btn) {
        await log(recent, 'tap', `${btn.title} (typed)`);
        if (btn.action === 'url') { await send(rt, recent, { text: buttonUrl(rt, recent, btn.target, step.id, bi) }).catch(() => {}); return { tapped: 'url' }; }
        if (await passesFollowGate(rt, recent, btn.target)) await sendStep(rt, recent, btn.target);
        return { tapped: btn.target };
      }
    }
  }

  // 3. Something that starts a flow: story mention, story reply, or a keyword.
  const candidates = await prisma.automation.findMany({
    where: { channelId: channel.id, status: 'ACTIVE', type: { in: ['DM_FLOW', 'COMMENT_DM', 'STORY_REPLY', 'STORY_MENTION'] } },
    orderBy: { createdAt: 'asc' },
  });
  const pick = async (list) => {
    for (const a of list) {
      if (!hasFlow(a) || !(await withinLimits(a))) continue;
      const conv = await startFlow(channel, a, item.contactId, { username: item.username });
      return { started: Boolean(conv), automation: a.id };
    }
    return null;
  };
  if (item.storyMention) {
    return (await pick(candidates.filter((a) => a.type === 'STORY_MENTION'))) || { skipped: 'no story mention automation' };
  }
  if (item.storyReply) {
    const r = await pick(candidates.filter((a) => a.type === 'STORY_REPLY' && matches(a, item.text)));
    if (r) return r;
  }
  const dm = candidates.filter((a) => (a.type === 'DM_FLOW' || (a.type === 'COMMENT_DM' && a.matchType !== 'ANY')) && matches(a, item.text));
  return (await pick(dm)) || { skipped: 'no matching flow' };
}

// Fallback before Meta delivers message webhooks: read recent messages and process new ones.
export async function checkInbox(channel) {
  const rt = { platform: getPlatform(channel.platform), token: decrypt(channel.accessTokenEnc) };
  const since = Date.now() - 2 * 3600000;
  const messages = await rt.platform.listRecentMessages(channel, rt.token);
  let handled = 0;
  for (const m of messages.sort((x, y) => new Date(x.timestamp) - new Date(y.timestamp))) {
    if (m.timestamp && new Date(m.timestamp).getTime() < since) continue;
    const r = await handleInbound(channel, m);
    if (!r.skipped) handled++;
  }
  return { read: messages.length, handled };
}

// ---- Smart follow-up: one reminder if no link was tapped ----
function lastLinkButtons(rt, conv) {
  const steps = stepsOf(rt.automation);
  const order = [conv.currentStepId, ...steps.map((s) => s.id).reverse()];
  for (const id of order) {
    const step = steps.find((s) => s.id === id);
    const links = (step?.buttons || []).map((b, i) => ({ b, i })).filter(({ b }) => b.action === 'url');
    if (links.length) return links.slice(0, 3).map(({ b, i }) => ({ type: 'web_url', url: buttonUrl(rt, conv, b.target, step.id, i), title: clip(b.title, 20) }));
  }
  return [];
}

export async function runFollowUps(limit = 50) {
  const now = Date.now();
  const candidates = await prisma.conversation.findMany({
    where: {
      followUpSentAt: null, clicks: 0, state: { in: ['ACTIVE', 'DONE'] },
      lastInboundAt: { gt: new Date(now - 23 * 3600000) }, // stay inside Meta's 24-hour window
      automation: { status: 'ACTIVE', followUpMins: { not: null } },
    },
    include: { automation: { include: { channel: true } } },
    take: limit,
  });
  let sent = 0;
  for (const conv of candidates) {
    const a = conv.automation;
    if (!conv.lastSentAt || now - conv.lastSentAt.getTime() < a.followUpMins * 60000) continue;
    if (conv.linkCode) {
      const ev = await prisma.event.findUnique({ where: { linkCode: conv.linkCode }, select: { clickCount: true } });
      if (ev?.clickCount) continue;
    }
    const rt = runtime(a.channel, a);
    const buttons = lastLinkButtons(rt, conv);
    if (!buttons.length) continue;
    const text = clip(a.followUpText || 'Just checking in 👋 Here’s the link again in case you missed it.', 640);
    try {
      await send(rt, conv, { attachment: { type: 'template', payload: { template_type: 'button', text, buttons } } });
      await prisma.conversation.update({ where: { id: conv.id }, data: { followUpSentAt: new Date() } });
      await log(conv, 'follow_up', null);
      sent++;
    } catch (e) {
      await prisma.conversation.update({ where: { id: conv.id }, data: { followUpSentAt: new Date() } });
      await log(conv, 'error', `Follow-up: ${e.message}`);
    }
  }
  return { considered: candidates.length, sent };
}
