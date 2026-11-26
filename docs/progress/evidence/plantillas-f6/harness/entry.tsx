import { createRoot } from "react-dom/client";
import { AudioPlayer, EmbedFacade, MediaBackground, MediaImage, embedFromConfig, spotifyEmbed } from "../../../../../packages/celebration-theme/src/index.tsx";

const t = (key: string, values?: Record<string, string | number>): string => {
  const map: Record<string, string> = {
    "celebration.media.playVideo": "Ver el video: {{title}}", "celebration.media.playMusic": "Escuchar: {{title}}", "celebration.media.showMap": "Ver el mapa: {{title}}",
    "celebration.media.privacy": "Al tocar, se carga contenido de {{provider}} y ese sitio puede recibir datos de tu visita.", "celebration.media.play": "Reproducir {{title}}",
    "celebration.media.pause": "Pausar {{title}}", "celebration.media.progress": "Avance de {{title}}", "celebration.media.audioError": "No pudimos reproducir la música."
  };
  return (map[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name) => String(values?.[name] ?? ""));
};
const photo = { id: "p", width: 1600, height: 900, purpose: "background" as const, variants: { medium: "bg.webp", full: "bg.webp", webp: "bg.webp", medium_avif: "bg.avif", full_avif: "bg.avif" } };
const song = { id: "s", width: null, height: null, purpose: "music" as const, durationMs: 125000, variants: { audio: "song.mp3" } };

function App() {
  return (
    <div className="celebration" data-align="center">
      <MediaBackground media={photo} scrim={0.55}><section style={{ padding: "3rem 1.25rem", textAlign: "center" }}><h2>Nuestra historia</h2><p>El texto se lee sobre la foto gracias al velo automático.</p></section></MediaBackground>
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
