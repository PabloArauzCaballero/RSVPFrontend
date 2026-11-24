import type { ReactNode } from "react";

/** One set of uniform 1.5 px strokes (DESIGN.md: no glyphs or emoji as icons). Decorative: the button's text names it. */
const draw = (children: ReactNode) => function Icon({ size = 18 }: { readonly size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
};

export const UndoIcon = draw(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>);
export const RedoIcon = draw(<><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>);
export const PhoneIcon = draw(<><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></>);
export const DesktopIcon = draw(<><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M9 20h6M12 16v4" /></>);
export const CheckIcon = draw(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const AlertIcon = draw(<><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4.5M12 17.5v.01" /></>);
export const SlidersIcon = draw(<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>);
export const LayersIcon = draw(<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>);
