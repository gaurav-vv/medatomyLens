import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { withBase } from "@/lib/basePath";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnatomyLens",
  description:
    "Educational 3D anatomy viewer. Visualizes where findings in a medical report are associated in the body. Not a diagnosis.",
  applicationName: "AnatomyLens",
  appleWebApp: { capable: true, title: "AnatomyLens", statusBarStyle: "black-translucent" },
  icons: { icon: withBase("/icons/icon.svg"), apple: withBase("/icons/icon.svg") },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
