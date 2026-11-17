// Support access: the client decides whether platform support may EDIT or DELETE their automations, and for how long.
// Viewing settings and pausing/resuming (for safety, abuse or a broken flow) don't need it, but are always logged
// in the client's Activity and emailed to the client's owners/admins.
export const ACCESS_DAYS = [1, 7, 30];
export const hasSupportAccess = (ws) => Boolean(ws?.supportAccessUntil && new Date(ws.supportAccessUntil) > new Date());
