import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { validateAutomation } from '@/lib/validate';

export async function POST(req) {
  const [ctx, err] = await requireApi('editAutomations');
  if (err) return err;
  const b = await req.json();
  const channel = await prisma.channel.findFirst({ where: { id: b.channelId, workspaceId: ctx.workspace.id } });
  if (!channel) return NextResponse.json({ error: 'Choose a connected account.' }, { status: 400 });
  const [data, msg] = validateAutomation(b, { platform: channel.platform });
  if (msg) return NextResponse.json({ error: msg }, { status: 400 });

  const { flow: _f, ...rest } = data;
  const automation = await prisma.automation.create({
    data: {
      ...rest,
      name: data.name || ({ COMMENT_REPLY: 'Comment replies', COMMENT_DM: 'Comment to DM', DM_FLOW: 'DM conversation', STORY_REPLY: 'Story replies', STORY_MENTION: 'Story mentions', COMMENT_MODERATION: 'Comment moderation' }[data.type]) + ` – ${channel.username}`,
      workspaceId: ctx.workspace.id,
      createdById: ctx.user.id,
      channelId: channel.id,
      flow: data.flow ?? undefined,
      mediaId: data.scope === 'POST' ? b.mediaId : null,
      mediaPermalink: data.scope === 'POST' ? b.mediaPermalink || null : null,
      mediaThumb: data.scope === 'POST' ? b.mediaThumb || null : null,
      mediaCaption: data.scope === 'POST' ? (b.mediaCaption || '').slice(0, 500) || null : null,
    },
  });
  await audit(ctx, 'automation.created', automation.name);
  return NextResponse.json({ id: automation.id });
}
