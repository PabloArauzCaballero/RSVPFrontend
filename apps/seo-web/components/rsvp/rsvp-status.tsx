export function RsvpStatus({ state, deadline }: { state: 'confirmed' | 'closed' | 'invalid' | 'guest'; deadline?: string }) {
  if (state === 'invalid') return <main className="rsvp-status"><h1>Este enlace no está disponible</h1><p>Verifica que hayas abierto el enlace completo que te compartieron.</p></main>;
  if (state === 'closed') return <main className="rsvp-status"><h1>El plazo de confirmación cerró</h1><p>{deadline ? `Cerró el ${deadline}.` : 'Comunícate con el anfitrión si necesitas ayuda.'}</p></main>;
  if (state === 'guest') return <main className="rsvp-status"><h1>Confirma tu asistencia</h1><p>El anfitrión habilitó una respuesta para invitados no registrados.</p></main>;
  return <main className="rsvp-status"><h1>Asistencia confirmada</h1><p>Puedes volver a este enlace para editarla antes de que cierre el plazo.</p></main>;
}
