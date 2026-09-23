import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '../components/ui/toast';
import { ThemeProvider } from '../components/ui/theme-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Braid — Real-Time Collaborative Documents',
  description: 'Pure CRDT collaborative document editor. Write, think, and collaborate in real time without conflicts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('braid:theme');var dark=t==='dark';document.documentElement.classList.toggle('dark',dark);document.documentElement.classList.toggle('light',!dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){document.documentElement.classList.add('light');}})()`,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-[var(--background)] text-[var(--text)]"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
