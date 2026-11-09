import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@rsvp/design-tokens/tokens.css";
import "@rsvp/celebration-theme/styles.css";
import "./globals.css";
import { siteUrl } from "../lib/metadata";
import { siteI18n, siteRequestPath } from "../lib/site-locale";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

/** Invitation paper: one sans (Geist) for names, headlines and the interface, and a mono for metadata. */
const text = Geist({ subsets: ["latin"], variable: "--font-text", display: "swap", fallback: ["system-ui", "Helvetica Neue", "sans-serif"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap", fallback: ["ui-monospace", "SF Mono", "monospace"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await siteI18n();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("celebration.site.title"), template: "%s · DOne" },
    description: t("celebration.site.description"),
    applicationName: "DOne",
    // Declared explicitly so the 404 page (which gets no file-based icon links) does not make browsers ask for /favicon.ico.
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: [{ url: "/apple-icon.png", sizes: "180x180" }] },
    formatDetection: { telephone: false }
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t, locale } = await siteI18n();
  const path = await siteRequestPath();
  return (
    <html lang={locale} className={`${text.variable} ${mono.variable}`}>
      <body>
        <SiteHeader t={t} />
        <div id="contenido">{children}</div>
        <SiteFooter t={t} locale={locale} path={path} />
      </body>
    </html>
  );
}
