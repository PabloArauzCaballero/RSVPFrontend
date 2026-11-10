/**
 * The check of the DOne mark, drawn as one stroke. It is the single "celebration" gesture of the site: it draws once when it
 * appears (confirmed, sent, verified) and is simply visible when the visitor prefers reduced motion (see `.check` in globals.css).
 */
export function CheckMark({ size = 24, draw = true, title, className = "" }: Readonly<{ size?: number; draw?: boolean; title?: string; className?: string }>) {
  return (
    <svg className={`check${draw ? " check--draw" : ""} ${className}`.trim()} viewBox="0 0 40 40" width={size} height={size} {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: "false" })}>
      <path className="check__stroke" pathLength={1} d="M8.5 21 16.5 29 31.5 11.5" fill="none" stroke="currentColor" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
