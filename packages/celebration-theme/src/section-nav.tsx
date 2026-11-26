import type { ReactNode } from "react";
import { SECTION_PATHS } from "./content.js";
import type { SectionId, Translate } from "./types.js";

/** The section links under the cover. Shared by the v1 renderer and the design renderer; absent without a base path. */
export function SectionNav({ props, sections }: { readonly props: { readonly basePath?: string; readonly only?: SectionId; readonly t: Translate }; readonly sections: readonly SectionId[] }): ReactNode {
  const linked = sections.filter((section) => SECTION_PATHS[section]);
  if (!props.basePath || !linked.length) return null;
  return (
    <nav className="celebration-nav" aria-label={props.t("celebration.nav.label")}>
      <a href={props.basePath} aria-current={props.only ? undefined : "page"} data-link-kind="internal">{props.t("celebration.nav.home")}</a>
      {linked.map((section) => (
        <a key={section} href={`${props.basePath}/${SECTION_PATHS[section]}`} aria-current={props.only === section ? "page" : undefined} data-link-kind="internal">
          {props.t(`celebration.sections.${section}`)}
        </a>
      ))}
    </nav>
  );
}
