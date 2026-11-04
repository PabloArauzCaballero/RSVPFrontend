import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Web document shell: brand font (Plus Jakarta Sans, one family) with system fallbacks. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es-BO">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'body{background:#F6F7FB;color:#0A1033;font-family:"Plus Jakarta Sans","Avenir Next","Segoe UI",system-ui,sans-serif}::selection{background:#8FA6FF;color:#0A1033}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
