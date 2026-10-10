import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'RSVP', description: 'Celebraciones que se sienten personales.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es-BO"><body>{children}</body></html>; }
