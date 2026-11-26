import { NAV_ICONS, NAV_ICON_STROKE } from "@rsvp/design-tokens";
import type { ReactNode } from "react";

/** Icons the invitation's buttons carry (DESIGN.md: every button is icon + text), named as in the product's one icon set. */
export type CelebrationIcon = "gifts" | "check" | "invitation";

/**
 * Web: the icon set's shape drawn in the button's ink (`currentColor`). Decorative, because the label next to it names
 * the action. The native renderer receives the app's `NavIcon` instead (`renderIcon`), which draws the same shapes.
 */
export function ActionIcon({ name, size = 20 }: { readonly name: CelebrationIcon; readonly size?: number }): ReactNode {
  const shapes = NAV_ICONS[name];
  if (!shapes) return null;
  return (
    <svg className="celebration-icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={NAV_ICON_STROKE}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-icon={name}>
      {shapes.map((shape) => {
        if (shape.t === "path") return <path key={shape.d} d={shape.d} />;
        if (shape.t === "circle") return <circle key={`c${shape.cx}-${shape.cy}-${shape.r}`} cx={shape.cx} cy={shape.cy} r={shape.r} />;
        return <rect key={`r${shape.x}-${shape.y}-${shape.w}-${shape.h}`} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} />;
      })}
    </svg>
  );
}
