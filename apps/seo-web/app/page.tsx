import { Card } from '@rsvp/ui-web';
export const dynamic = 'force-dynamic';
export default async function Home() { const renderedAt = new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date()); return <main className="seo-home"><h1>RSVP para celebraciones memorables</h1><Card><p>Esta ruta se renderiza en el servidor con Next.js App Router.</p><p>Renderizado: {renderedAt} UTC</p></Card></main>; }
