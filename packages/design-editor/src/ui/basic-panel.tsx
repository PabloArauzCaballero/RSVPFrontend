import { design } from "@rsvp/celebration-theme";
import { useEffect, useState } from "react";
import { giftsBlock, giftsPlacement } from "../model/guards.js";
import { applyPaddingPreset, applySpacingPreset, applyTemplateDocument, editableTexts, PADDING_PRESETS, setBlockConfig, setFontFamily, setPaletteColour, setSectionOrder, setSectionVisible, sharedPadding, SPACING_PRESETS, spacingPresetOf, switchableSections, type PaddingPreset, type SpacingPreset } from "../model/ops.js";
import { useEditor } from "./editor-context.js";
import { LayersIcon, SlidersIcon } from "./icons.js";

const key = (name: string): string => `designEditor.basic.${name}`;

export interface TemplateChoice { readonly id: string; readonly name: string; readonly document: design.DesignDocumentV2 }
export interface TemplateSource { readonly list: () => Promise<readonly TemplateChoice[]> }

const COLOUR_ROLES = ["accent", "canvas", "text", "surface", "muted"] as const;
const HEADING_CATEGORIES: readonly design.FontCategory[] = ["serif", "script"];

function Choice<T extends string>({ label, value, options, onChange }: { readonly label: string; readonly value: T | null; readonly options: readonly { readonly value: T; readonly text: string }[]; readonly onChange: (next: T) => void }) {
  return (
    <div className="de-field" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      <div className="de-group">{options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={option.value === value} onClick={() => onChange(option.value)}>{option.text}</button>)}</div>
    </div>
  );
}

/** The Basic level: pick a template, texts, colours, fonts from the catalogue, spacing and padding presets, sections on and off (gifts always on). */
export function BasicPanel({ templates }: { readonly templates?: TemplateSource }) {
  const { document, dispatch, t, now } = useEditor();
  const [choices, setChoices] = useState<readonly TemplateChoice[]>([]);
  useEffect(() => {
    if (!templates) return undefined;
    let live = true;
    templates.list().then((list) => { if (live) setChoices(list); }, () => undefined);
    return () => { live = false; };
  }, [templates]);

  const giftsPageId = giftsPlacement(document)?.page.id;
  const gifts = giftsBlock(document);
  const sections = document.pages.filter((page) => page.kind === "section" && page.section !== undefined);
  const switchable = switchableSections(document, giftsPageId);
  const typography = document.tokens.typography;

  const move = (section: string, by: -1 | 1): void => {
    const order = sections.map((page) => page.section ?? "");
    const at = order.indexOf(section);
    const to = at + by;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[at], next[to]] = [next[to] as string, next[at] as string];
    dispatch({ type: "edit", op: setSectionOrder(next), at: now() });
  };

  return (
    <div className="de-basic">
      {choices.length > 0 ? (
        <section aria-label={t(key("template.title"))}>
          <h2><LayersIcon />{t(key("template.title"))}</h2>
          <label className="de-field">
            <span>{t(key("template.label"))}</span>
            <select defaultValue="" onChange={(event) => { const picked = choices.find((choice) => choice.id === event.target.value); if (picked) dispatch({ type: "edit", op: applyTemplateDocument(picked.document), at: now() }); event.target.value = ""; }}>
              <option value="" disabled>{t(key("template.placeholder"))}</option>
              {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
            </select>
          </label>
          <p className="de-hint">{t(key("template.hint"))}</p>
        </section>
      ) : null}

      <section aria-label={t(key("title"))}>
        <h2><SlidersIcon />{t(key("title"))}</h2>
        {(["light", "dark"] as const).map((scheme) => (
          <fieldset key={scheme} className="de-fieldset">
            <legend>{t(key(scheme === "light" ? "schemeLight" : "schemeDark"))}</legend>
            {COLOUR_ROLES.map((role) => (
              <label key={role} className="de-field de-field--inline">
                <span>{t(key(`role.${role}`))}</span>
                <input type="color" value={document.tokens.palettes[scheme][role].toLowerCase()} onChange={(event) => dispatch({ type: "edit", op: setPaletteColour(scheme, role, event.target.value), key: `palette:${scheme}:${role}`, at: now() })} />
              </label>
            ))}
          </fieldset>
        ))}
      </section>

      <section aria-label={t(key("fonts.title"))}>
        <h2>{t(key("fonts.title"))}</h2>
        {(["heading", "body"] as const).map((role) => (
          <label key={role} className="de-field">
            <span>{t(key(role === "heading" ? "fonts.heading" : "fonts.body"))}</span>
            <select value={typography[role].family} onChange={(event) => dispatch({ type: "edit", op: setFontFamily(role, event.target.value), at: now() })}>
              {design.FONT_FAMILIES.filter((family) => (role === "heading" ? HEADING_CATEGORIES.includes(family.category) || family.category === "sans" : family.category !== "script")).map((family) => <option key={family.id} value={family.id}>{family.family}</option>)}
            </select>
          </label>
        ))}
      </section>

      <section aria-label={t(key("spacing.title"))}>
        <h2>{t(key("spacing.title"))}</h2>
        <Choice<SpacingPreset> label={t(key("spacing.section"))} value={spacingPresetOf(document)} onChange={(preset) => dispatch({ type: "edit", op: applySpacingPreset(preset), at: now() })}
          options={(Object.keys(SPACING_PRESETS) as SpacingPreset[]).map((name) => ({ value: name, text: t(key(`spacing.${name}`)) }))} />
        <Choice<PaddingPreset> label={t(key("padding.title"))} value={sharedPadding(document)} onChange={(preset) => dispatch({ type: "edit", op: applyPaddingPreset(preset), at: now() })}
          options={(Object.keys(PADDING_PRESETS) as PaddingPreset[]).map((name) => ({ value: name, text: t(key(`padding.${name}`)) }))} />
      </section>

      <section aria-label={t(key("sections.title"))}>
        <h2>{t(key("sections.title"))}</h2>
        <ul className="de-sections">
          {sections.map((page, index) => {
            const section = page.section ?? "";
            const locked = !switchable.includes(section);
            const on = page.canvases.mobile.elements.some((element) => element.visible);
            return (
              <li key={page.id}>
                <label>
                  <input type="checkbox" checked={locked || on} disabled={locked} onChange={(event) => dispatch({ type: "edit", op: setSectionVisible(section, event.target.checked), at: now() })} />
                  <span>{t(`celebration.sections.${section}`)}</span>
                </label>
                {locked ? <small className="de-hint">{t(key("sections.locked"))}</small> : null}
                <span className="de-move">
                  <button type="button" className="de-btn" aria-label={t(key("sections.up"), { section: t(`celebration.sections.${section}`) })} disabled={index === 0} onClick={() => move(section, -1)}>↑</button>
                  <button type="button" className="de-btn" aria-label={t(key("sections.down"), { section: t(`celebration.sections.${section}`) })} disabled={index === sections.length - 1} onClick={() => move(section, 1)}>↓</button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {editableTexts(document).length > 0 ? (
        <section aria-label={t(key("texts.title"))}>
          <h2>{t(key("texts.title"))}</h2>
          {editableTexts(document).map((entry) => (
            <label key={`${entry.blockId}-${entry.field}`} className="de-field">
              <span>{t(key(`texts.${entry.type}.${entry.field}`))}</span>
              <textarea rows={entry.type === "text" ? 4 : 2} value={entry.value} maxLength={entry.type === "button" ? 60 : 1000} onChange={(event) => { if (event.target.value.trim() !== "") dispatch({ type: "edit", op: setBlockConfig(entry.blockId, { [entry.field]: event.target.value }), key: `text:${entry.blockId}:${entry.field}`, at: now() }); }} />
            </label>
          ))}
        </section>
      ) : null}
      {gifts ? <p className="de-hint">{t(key("giftsNote"))}</p> : null}
    </div>
  );
}
