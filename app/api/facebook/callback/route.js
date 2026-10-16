import { finishOAuth } from '@/lib/oauth';
export async function GET(req) { return finishOAuth('FACEBOOK', req); }
