import type { ReactNode } from "react";

/** The flourish of the layouts that ask for an ornament; it takes the accent colour of the template. */
export function Flourish(): ReactNode {
  return (
    <svg className="celebration-ornament" viewBox="0 0 120 24" width="120" height="24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 12h44M72 12h44" />
      <path d="M60 5c-4 3-4 11 0 14c4-3 4-11 0-14Z" />
      <path d="M52 12c-3-4-8-4-10-1c3 3 7 3 10 1ZM68 12c3-4 8-4 10-1c-3 3-7 3-10 1Z" />
    </svg>
  );
}
