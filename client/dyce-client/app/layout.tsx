import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import {
  DM_Serif_Text,
  Poppins,
  M_PLUS_Rounded_1c,
  Pacifico,
} from "next/font/google";

const dmSerif = DM_Serif_Text({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
});
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "700"],
});
const rounded = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  variable: "--font-rounded",
  weight: ["400", "700"],
});
const pacifico = Pacifico({
  subsets: ["latin"],
  variable: "--font-pacifico",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Dyce - Dating App",
  description: "A modern dating app for college students",
  keywords: ["dating", "app", "college", "students", "social", "networking"],
  authors: [{ name: "Roshan Sharma" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-128.png",
    apple: "/icon-128.png",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    noimageindex: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${dmSerif.variable} ${poppins.variable} ${rounded.variable} ${pacifico.variable}`}
    >
      <body
        className={`${dmSerif.variable} ${poppins.variable} ${rounded.variable} ${pacifico.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
