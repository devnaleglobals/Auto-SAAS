import { ResetForm } from '@/components/PasswordForms';
export const metadata = { title: 'New password — ReplyRelay' };
export default async function Page({ params }) { const { token } = await params; return <ResetForm token={token} />; }
