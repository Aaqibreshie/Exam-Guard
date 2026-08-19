import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ExamGuard | AI-Proofed Online Exams & Anti-Cheat Platform',
  description: 'Create secure online exams, coding assessments, and certification tests. Features AI proctoring, webcam monitoring, and automated grading.',
  keywords: [
    'online exam platform',
    'anti-cheat test',
    'AI proctored exam',
    'coding assessment tool',
    'secure online testing',
    'prevent chatgpt cheating',
    'teacher dashboard',
    'automated grading'
  ],
  openGraph: {
    title: 'ExamGuard | Secure Online Examinations',
    description: 'The ultimate AI-proctored platform for schools and coding bootcamps to host secure, cheat-proof exams.',
    url: 'https://exam-guard-eight.vercel.app',
    siteName: 'ExamGuard',
    images: [
      {
        url: 'https://exam-guard-eight.vercel.app/og-image.jpg', // You can add an actual image later
        width: 1200,
        height: 630,
        alt: 'ExamGuard Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExamGuard | Secure Online Examinations',
    description: 'The ultimate AI-proctored platform for schools and coding bootcamps to host secure, cheat-proof exams.',
  },
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
