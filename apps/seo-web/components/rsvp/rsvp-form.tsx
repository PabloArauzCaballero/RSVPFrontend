'use client';

import { rsvpSchema, type RsvpInput } from '@rsvp/forms';
import { useEffect, useState } from 'react';

const initialDraft: RsvpInput = { attendance: 'accepted', companions: 0, dietaryNotes: '', message: '' };
const storageKey = (slug: string, token: string) => `rsvp:draft:${slug}:${token}`;

export function RsvpForm({ slug, token }: { slug: string; token: string }) {
  const [draft, setDraft] = useState<RsvpInput>(initialDraft); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  useEffect(() => { const saved = window.sessionStorage.getItem(storageKey(slug, token)); if (saved) { const parsed = rsvpSchema.safeParse(JSON.parse(saved)); if (parsed.success) setDraft(parsed.data); } }, [slug, token]);
  useEffect(() => { window.sessionStorage.setItem(storageKey(slug, token), JSON.stringify(draft)); }, [draft, slug, token]);
  function update<K extends keyof RsvpInput>(key: K, value: RsvpInput[K]) { setDraft((current) => ({ ...current, [key]: value })); setNotice(''); setError(''); }
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const parsed = rsvpSchema.safeParse(draft); if (!parsed.success) { setError('Revisa los campos marcados antes de continuar.'); return; } setNotice('Tu respuesta está lista para enviarse. El borrador permanece guardado hasta recibir la confirmación del servicio.'); }
  return <form className="rsvp-form" onSubmit={submit} noValidate><fieldset><legend>¿Podrás acompañarnos?</legend><label><input type="radio" name="attendance" checked={draft.attendance === 'accepted'} onChange={() => update('attendance', 'accepted')} /> Sí, asistiré</label><label><input type="radio" name="attendance" checked={draft.attendance === 'declined'} onChange={() => update('attendance', 'declined')} /> No podré asistir</label></fieldset><label>Acompañantes<input type="number" min="0" max="10" value={draft.companions} onChange={(event) => update('companions', Number(event.target.value))} /></label><label>Restricciones alimentarias<textarea value={draft.dietaryNotes} maxLength={500} onChange={(event) => update('dietaryNotes', event.target.value)} /></label><label>Mensaje para los anfitriones<textarea value={draft.message} maxLength={1000} onChange={(event) => update('message', event.target.value)} /></label>{error ? <p role="alert">{error}</p> : null}{notice ? <p role="status">{notice}</p> : null}<button type="submit">Guardar respuesta</button></form>;
}
