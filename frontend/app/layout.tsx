import "./globals.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import { Inter, Space_Grotesk } from "next/font/google";

config.autoAddCss = false;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", 
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk", 
});

export const metadata = {
  title: "Scholask",
  description: "AI Advisor for Every School — multi-tenant RAG + multilingual + offline-first."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body 
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

