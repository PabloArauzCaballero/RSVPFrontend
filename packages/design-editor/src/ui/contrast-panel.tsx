import { design } from "@rsvp/celebration-theme";
import { useMemo } from "react";
import { setPaletteColour } from "../model/ops.js";
import { useEditor } from "./editor-context.js";
import { AlertIcon, CheckIcon } from "./icons.js";

const key = (name: string): string => `designEditor.contrast.${name}`;

/**
 * P19: live WCAG contrast of every text/background pair of both palettes. It warns and offers the nearest colour that passes;
 * it never blocks saving or publishing (the host decides).
 */
export function ContrastPanel() {
  const { document, dispatch, t, now } = useEditor();
  const warnings = useMemo(() => design.contrastWarnings(document), [document]);
  return (
    <section className="de-contrast" aria-label={t(key("title"))}>
      <h2>{t(key("title"))}</h2>
      <div role="status" aria-live="polite">
        {warnings.length === 0
          ? <p className="de-hint"><CheckIcon />{t(key("ok"))}</p>
          : (
            <>
              <ul className="de-warnings">
                {warnings.map((warning) => (
                  <li key={`${warning.scheme}-${warning.foreground}-${warning.background}`}>
                    <p><AlertIcon />{t(key("warning"), { foreground: t(key(`role.${warning.foreground}`)), background: t(key(`role.${warning.background}`)), scheme: t(key(`scheme.${warning.scheme}`)), ratio: warning.ratio.toFixed(2), minimum: warning.minimum })}</p>
                    <button type="button" className="de-btn" onClick={() => dispatch({ type: "edit", op: setPaletteColour(warning.scheme, warning.foreground, warning.suggestion), at: now() })}>
                      <span className="de-swatch" style={{ background: warning.suggestion }} aria-hidden="true" />{t(key("apply"), { hex: warning.suggestion })}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="de-hint">{t(key("note"))}</p>
            </>
          )}
      </div>
    </section>
  );
}
