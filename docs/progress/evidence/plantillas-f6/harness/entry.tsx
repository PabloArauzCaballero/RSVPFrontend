import { createRoot } from "react-dom/client";
import { AudioPlayer, EmbedFacade, MediaBackdrop, embedFromConfig, spotifyEmbed } from "../../../../../packages/celebration-theme/src/index.tsx";
import { requiredScrim } from "../../../../../packages/celebration-theme/src/design/colour.ts";

// The same palettes as shoot.mjs: the veil of each scheme is what the palette needs (requiredScrim), exactly as the renderer sets it.
const LIGHT = { canvas: "#FBF7F0", text: "#2B2622" };
const DARK = { canvas: "#141218", text: "#ECE6EE" };

const t = (key: string, values?: Record<string, string | number>): string => {
  const map: Record<string, string> = {
    "celebration.media.playVideo": "Ver el video: {{title}}", "celebration.media.playMusic": "Escuchar: {{title}}", "celebration.media.showMap": "Ver el mapa: {{title}}",
    "celebration.media.privacy": "Al tocar, se carga contenido de {{provider}} y ese sitio puede recibir datos de tu visita.", "celebration.media.play": "Reproducir {{title}}", "celebration.media.playShort": "Reproducir", "celebration.media.openVideo": "Ver el video", "celebration.media.openMusic": "Escuchar", "celebration.media.openMap": "Ver el mapa", "celebration.media.retryShort": "Reintentar", "celebration.media.pauseShort": "Pausar",
    "celebration.media.pause": "Pausar {{title}}", "celebration.media.progress": "Avance de {{title}}", "celebration.media.audioError": "No pudimos reproducir la música."
  };
  return (map[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name) => String(values?.[name] ?? ""));
};
const photo = { id: "p", width: 1600, height: 900, purpose: "background" as const, variants: { medium: "bg.webp", full: "bg.webp", webp: "bg.webp", medium_avif: "bg.avif", full_avif: "bg.avif" } };
const song = { id: "s", width: null, height: null, purpose: "music" as const, durationMs: 125000, variants: { audio: "song.mp3" } };

function App() {
  return (
    <div className="celebration" data-align="center">
      <div className="celebration-design" data-scheme-source="system" style={{ position: "relative", isolation: "isolate", overflow: "hidden" }}>
        <MediaBackdrop media={photo} light={requiredScrim(LIGHT)} dark={requiredScrim(DARK)} />
        <section style={{ position: "relative", padding: "3rem 1.25rem", textAlign: "center", color: "var(--celebration-text)" }}><h2>Nuestra historia</h2><p>El texto se lee sobre la foto gracias al velo que pide la paleta.</p></section>
      </div>
      <section style={{ padding: "2rem 1.25rem", display: "grid", gap: "1.5rem", justifyItems: "center" }}>
        <h2>Video</h2><EmbedFacade embed={embedFromConfig("video", { provider: "youtube", videoId: "dQw4w9WgXcQ" })} title="Nuestro video" t={t} poster={photo} />
        <h2>Música</h2><EmbedFacade embed={spotifyEmbed("track/4uLU6hMCjMI75M1A2tKUQC")} title="Nuestra canción" t={t} />
        <AudioPlayer media={song} title="Vals de los novios" t={t} />
        <h2>Mapa</h2><EmbedFacade embed={embedFromConfig("map", {}, "Casa de la Libertad, Sucre")} title="Casa de la Libertad" t={t} />
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
