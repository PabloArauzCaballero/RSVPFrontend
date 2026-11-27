import { design } from "@rsvp/celebration-theme";
import { useMemo } from "react";
import { setPaletteColour } from "../model/ops.js";
import { useEditor } from "./editor-context.js";
import { AlertIcon, CheckIcon } from "./icons.js";

const key = (name: string): string => `designEditor.${name}`;

export interface ContrastPanelProps {
  /** What the server answered about the draft it holds, or null when it has not said (then the colours are read here). */
  readonly server: readonly design.DesignWarning[] | null;
  /** True when that answer is about the document on screen (the last save went through and nothing changed since). */
  readonly fresh: boolean;
}

/**
 * P19, the single list of contrast warnings. It is the server's list when the server has answered about this very document and,
 * until then (an edit not saved yet, no answer), a preview computed with the same rule (`design.contrastWarnings`, a mirror of
 * colour.py), so both never disagree on the pair, the ratio or the suggested colour. It warns and offers the nearest colour that
 * passes; it never blocks saving or publishing (the host decides).
 */
export function ContrastPanel({ server, fresh }: ContrastPanelProps) {
  const { document, dispatch, t, now } = useEditor();
  const preview = useMemo(() => design.contrastWarnings(document), [document]);
  const warnings = fresh && server !== null ? server : preview;
  return (
    <section className="de-contrast" aria-labelledby="de-contrast-title">
      <h2 id="de-contrast-title">{t(key("contrast.title"))}</h2>
      <div aria-live="polite">
        {warnings.length === 0
          ? <p className="de-hint"><CheckIcon size={16} />{t(key("contrast.ok"))}</p>
          : (
            <div className="de-warnings" data-testid="design-warnings">
              <h3 id="de-warnings-title"><AlertIcon size={16} />{t(key("warnings.title"))}</h3>
              <ul>
                {warnings.map((warning) => {
                  const names = { scheme: t(key(`scheme.${warning.scheme}`)), foreground: t(key(`role.${warning.foreground}`)), background: t(key(`role.${warning.background}`)) };
                  return (
                    <li key={`${warning.scheme}:${warning.foreground}:${warning.background}`}>
                      <span>{t(key("warnings.item"), { ...names, ratio: warning.ratio.toFixed(2), minimum: warning.minimum })}</span>
                      <button type="button" className="de-btn de-btn--small" aria-label={t(key("warnings.useLabel"), { foreground: names.foreground, scheme: names.scheme, background: names.background, colour: warning.suggestion })}
                        onClick={() => dispatch({ type: "edit", op: setPaletteColour(warning.scheme, warning.foreground, warning.suggestion), at: now() })}>
                        <span className="de-swatch" style={{ background: warning.suggestion }} aria-hidden="true" />{t(key("warnings.use"), { colour: warning.suggestion })}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="de-hint">{t(key("warnings.hint"))}</p>
            </div>
          )}
      </div>
    </section>
  );
}
