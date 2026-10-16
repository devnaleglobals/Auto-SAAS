import { startOAuth } from '@/lib/oauth';
export async function GET(req) { return startOAuth('FACEBOOK', req); }
