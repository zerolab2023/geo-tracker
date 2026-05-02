import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GEO Tracker — AI 검색 가시성 모니터',
  description: 'ChatGPT, Gemini, Perplexity에서 브랜드 언급 트래킹',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
