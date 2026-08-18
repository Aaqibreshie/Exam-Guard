import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ExamGuard | AI-Proofed Online Exams',
  description: 'Secure online examination platform with built-in anti-cheating detection',
  verification: {
    google: 'fM9I9HH0SJiz1mu_8KFbp97raAzNYN1WAcFL5izR474',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={inter.className}>{children}</body>
      <GoogleAnalytics gaId="G-VF00PS7E02" />
    </html>
  );
}
