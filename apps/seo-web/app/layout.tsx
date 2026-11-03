import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import "@rsvp/celebration-theme/styles.css";
import "./globals.css";
import { siteUrl } from "../lib/metadata";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const text = Figtree({ subsets: ["latin"], variable: "--font-text", display: "swap" });

const t = createTranslator(defaultLocale);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: t("celebration.site.title"), template: "%s · RSVP" },
  description: t("celebration.site.description"),
  applicationName: "RSVP",
  formatDetection: { telephone: false }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={defaultLocale} className={`${display.variable} ${text.variable}`}>
      <body>
        <SiteHeader t={t} />
        <div id="contenido">{children}</div>
        <SiteFooter t={t} />
      </body>
    </html>
  );
}
