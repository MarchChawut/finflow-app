import type { Metadata } from "next";
import { Prompt, Inter } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FinFlow — ระบบจัดการการเงินผ่าน LINE OA",
  description: "ระบบจัดการการเงินส่วนบุคคลผ่าน LINE Official Account",
  icons: {
    // Resized from the 1.18MB source logo (public/img/finflow_logo.png) —
    // pointing the favicon/apple-touch-icon straight at the full-res
    // original meant every browser tab fetched ~1.18MB just for the tab
    // icon.
    icon: "/img/favicon-32.png",
    apple: "/img/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${prompt.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-pastel-bg text-slate-700 selection:bg-purple-100 selection:text-purple-600">
        {children}
      </body>
    </html>
  );
}
