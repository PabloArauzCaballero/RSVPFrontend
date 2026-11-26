import { contrastRatio, nearestPassing, TEXT_CONTRAST } from "./colour.js";
import type { ColourScheme, DesignDocumentV2, DesignWarning, PaletteRole } from "./types.js";

const SCHEMES: readonly ColourScheme[] = ["light", "dark"];
/** (foreground role, background role). `line` is decorative and has no text contrast requirement. */
const PAIRS: readonly (readonly [PaletteRole, PaletteRole])[] = [
  ["text", "canvas"], ["text", "surface"], ["muted", "canvas"], ["muted", "surface"],
  ["accent", "canvas"], ["accent", "surface"], ["onAccent", "accentFill"]
];

/** P19: palette pairs under WCAG AA. They are warnings, never errors; mirror of BE design/contrast.py. */
export function contrastWarnings(document: Pick<DesignDocumentV2, "tokens">): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  for (const scheme of SCHEMES) {
    const palette = document.tokens.palettes[scheme];
    for (const [foreground, background] of PAIRS) {
      const ratio = contrastRatio(palette[foreground], palette[background]);
      if (ratio < TEXT_CONTRAST) {
        warnings.push({
          code: "LOW_CONTRAST", scheme, foreground, background, ratio: Math.round(ratio * 100) / 100, minimum: TEXT_CONTRAST,
          suggestion: nearestPassing(palette[foreground], palette[background])
        });
      }
    }
  }
  return warnings;
}
