import { Bricolage_Grotesque, Manrope } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700', '800'] });
const body = Manrope({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  title: 'ReplyRelay — Instagram comment to DM automation',
  description: 'Send links in DMs when people comment a keyword on your posts.',
};

// Applies the saved theme before the page paints, so there is no white flash in dark mode.
const themeScript = `(function(){try{var t=localStorage.getItem('rr_theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
