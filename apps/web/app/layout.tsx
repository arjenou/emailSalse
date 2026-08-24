import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "Kylon | 日本市场 AI B2B 开发", template: "%s | Kylon" },
  description: "自动发现日本潜在企业，判断商业匹配，并完成合规的官网联系。",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Kylon | 日本市场 AI B2B 开发",
    description: "从产品资料到日本企业联系，全流程自动执行。",
    type: "website",
    locale: "zh_CN"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
