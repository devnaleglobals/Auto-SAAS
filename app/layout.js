import { Bricolage_Grotesque, Manrope } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700', '800'] });
const body = Manrope({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  title: 'ReplyRelay — Instagram comment to DM automation',
  description: 'Send links in DMs when people comment a keyword on your posts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
