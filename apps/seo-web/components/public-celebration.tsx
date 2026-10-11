import { CelebrationRenderer, type CelebrationSection } from "@rsvp/celebration-theme";
import type { PublicCelebration } from "../lib/celebration";

const sections: Record<CelebrationSection, (celebration: PublicCelebration) => React.ReactNode> = {
  story: (celebration) => <><h2>Una celebración para recordar</h2><p>{celebration.hosts.join(" y ")} te esperan para compartir este momento especial.</p></>,
  schedule: (celebration) => <><h2>Itinerario</h2><p><time dateTime={celebration.startsAt}>{new Intl.DateTimeFormat("es-BO", { dateStyle: "full", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date(celebration.startsAt))}</time> — Bienvenida y ceremonia.</p></>,
  venues: (celebration) => <><h2>Lugar</h2><p>{celebration.venue}</p></>,
  gallery: () => <><h2>Galería</h2><p>Los recuerdos de la celebración aparecerán aquí.</p></>,
  dressCode: () => <><h2>Código de vestimenta</h2><p>Elegante y cómodo para celebrar.</p></>,
  faq: () => <><h2>Preguntas frecuentes</h2><details><summary>¿Cómo confirmo mi asistencia?</summary><p>Usa el enlace de invitación personal que recibiste.</p></details></>,
  recommendations: () => <><h2>Recomendaciones</h2><p>Planifica tu llegada con anticipación y guarda esta página.</p></>
};

export function PublicCelebration({ celebration, only }: { celebration: PublicCelebration; only?: CelebrationSection }) {
  const renderedSections = only ? { [only]: sections[only](celebration) } : Object.fromEntries(Object.entries(sections).map(([key, render]) => [key, render(celebration)]));
  return <main className="celebration-shell"><header className="celebration-hero"><p>{celebration.eventType}</p><h1>{celebration.title.replace(" | RSVP", "")}</h1><p>{celebration.description}</p></header><CelebrationRenderer theme={{ ...celebration.theme, enabledSections: only ? [only] : celebration.theme.enabledSections }} sections={renderedSections} /></main>;
}
