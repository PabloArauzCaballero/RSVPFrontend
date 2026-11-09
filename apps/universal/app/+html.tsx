import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { themeBootCss, themeBootScript } from '../src/platform/theme-boot';

/** Web document shell: the three faces of the minimalist system (Newsreader for titles, Geist for the interface, Geist Mono for codes) with system fallbacks. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es-BO">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" />
        <ScrollViewStyleReset />
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <style dangerouslySetInnerHTML={{ __html: themeBootCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
