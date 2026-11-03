import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Web document shell: brand fonts (Bricolage Grotesque for display, Figtree for text) with system fallbacks. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es-BO">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Figtree:wght@400;600;700&display=swap" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'body{background:#FBF8FB;color:#24101F}::selection{background:#F2A900;color:#2B1400}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
