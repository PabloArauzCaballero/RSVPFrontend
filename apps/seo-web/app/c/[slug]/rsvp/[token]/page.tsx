import { RsvpForm } from '../../../../../components/rsvp/rsvp-form';
import { celebrationFor } from '../../../../../lib/celebration';

export const dynamic = 'force-dynamic';
export default async function RsvpTokenPage({ params }: { params: Promise<{ slug: string; token: string }> }) { const { slug, token } = await params; const celebration = celebrationFor(slug); return <main className="rsvp-shell"><p>{celebration.title.replace(' | RSVP', '')}</p><h1>Confirma tu asistencia</h1><p>Tu información se guarda como borrador si la conexión falla.</p><RsvpForm slug={slug} token={token} /></main>; }
