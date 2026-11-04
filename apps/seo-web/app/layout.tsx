import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import "@rsvp/celebration-theme/styles.css";
import "./globals.css";
import { siteUrl } from "../lib/metadata";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

const text = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-text", display: "swap" });

const t = createTranslator(defaultLocale);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: t("celebration.site.title"), template: "%s · DOne" },
  description: t("celebration.site.description"),
  applicationName: "DOne",
  formatDetection: { telephone: false }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={defaultLocale} className={text.variable}>
      <body>
        <SiteHeader t={t} />
        <div id="contenido">{children}</div>
        <SiteFooter t={t} />
      </body>
    </html>
  );
}
