const TONES = ["yellow", "green", "gray"] as const;

/** Photo-less stand-in for a provider: the first letter on a flat pastel ground (never a saturated block). The tone is stable per name. */
export function Monogram({ name, className = "" }: Readonly<{ name: string; className?: string }>) {
  const letter = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "";
  const tone = TONES[[...name].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0) % TONES.length];
  return <span className={`monogram ${className}`.trim()} data-tone={tone} aria-hidden="true">{letter}</span>;
}
