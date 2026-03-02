import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Young Manager",
  description: "스마트한 학원 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
