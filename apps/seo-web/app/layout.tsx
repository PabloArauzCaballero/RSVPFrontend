import type { Metadata, Viewport } from "next";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import "@rsvp/celebration-theme/styles.css";
import "./globals.css";
import { siteUrl } from "../lib/metadata";

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
  return <html lang={defaultLocale}><body>{children}</body></html>;
}
