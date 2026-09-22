import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "birimO App - Birebir Eğitim Platformu",
  description: "Modern, Premium Eğitim Yönetim Platformu",
  openGraph: {
    title: "birimO App - Birebir Eğitim Platformu",
    description: "Modern, Premium Eğitim Yönetim Platformu",
    url: "https://www.birimo.ableajans.com",
    siteName: "birimO App",
    images: [
      {
        url: "/images/Logo.png",
        width: 300,
        height: 100,
        alt: "birimO Logo",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${font.variable} h-full antialiased overflow-hidden`}
    >
      <body className="h-full overflow-hidden flex flex-col font-sans bg-gray-50">{children}</body>
    </html>
  );
}
