// People can reply STOP to stop automatic messages from an account, and START to allow them again.
import { prisma } from './db';

const STOP_WORDS = ['stop', 'unsubscribe', 'stop all', 'opt out', 'optout'];
const START_WORDS = ['start', 'subscribe', 'unstop'];
const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

export const isStopWord = (text) => STOP_WORDS.includes(norm(text));
export const isStartWord = (text) => START_WORDS.includes(norm(text));

export async function isOptedOut(channelId, contactId) {
  if (!contactId) return false;
  return Boolean(await prisma.contactOptOut.findUnique({ where: { channelId_contactId: { channelId, contactId } } }).catch(() => null));
}

export async function optOut(channelId, contactId) {
  await prisma.contactOptOut.upsert({ where: { channelId_contactId: { channelId, contactId } }, create: { channelId, contactId }, update: {} });
  // End running conversations and cancel any pending reminder.
  await prisma.conversation.updateMany({
    where: { contactId, automation: { channelId }, state: { not: 'DONE' } },
    data: { state: 'DONE', pendingStepId: null, inputStepId: null },
  });
  await prisma.conversation.updateMany({ where: { contactId, automation: { channelId }, followUpSentAt: null }, data: { followUpSentAt: new Date() } });
}

export async function optIn(channelId, contactId) {
  await prisma.contactOptOut.deleteMany({ where: { channelId, contactId } });
}
