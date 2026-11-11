import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { mapUrl, pointOf, pointUrl } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { MAP_PICKER_AVAILABLE, MapPicker } from "./map-picker";
import { ActionButton, Field, useStyles } from "./ui";

/**
 * Where the celebration is: the name guests will read and, with it, the exact place. The host marks it on a map or pastes
 * the link their maps app shares; either way one maps link is stored (`venueMapUrl`) and the invitation's "how to get
 * there" opens exactly there instead of searching for the name.
 */

/** A link was written and it is not a link of a maps service: it would never be shown, so it is refused while typing. */
export const mapLinkProblem = (link: string): boolean => Boolean(link.trim()) && !mapUrl(link);

export interface LocationFieldProps {
  readonly name: string;
  readonly onName: (value: string) => void;
  readonly link: string;
  readonly onLink: (value: string) => void;
  readonly nameError?: string;
  readonly placeholder?: string;
  readonly testID?: string;
}

export function LocationField({ name, onName, link, onLink, nameError, placeholder, testID = "location" }: LocationFieldProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [picking, setPicking] = useState(false);
  const marked = Boolean(mapUrl(link));
  return (
    <View style={{ gap: spacing[3] }}>
      <Field label={t("host.editor.general.venueName")} value={name} onChange={onName} testID={`${testID}-name`} {...(placeholder ? { placeholder } : {})} {...(nameError ? { error: nameError } : {})} />
      {MAP_PICKER_AVAILABLE ? (
        <View style={[styles.row, { alignItems: "center" }]}>
          <ActionButton variant="secondary" icon="pin" label={t(marked ? "host.location.change" : "host.location.mark")} onPress={() => setPicking(true)} testID={`${testID}-map`} />
          {marked ? <Text role="status" style={styles.muted}>{t("host.location.marked")}</Text> : null}
        </View>
      ) : null}
      <Field label={t("host.location.link")} help={t(MAP_PICKER_AVAILABLE ? "host.location.linkHelp" : "host.location.linkHelpNative")} placeholder={t("host.location.linkPlaceholder")} value={link} onChange={onLink} keyboardType="url" testID={`${testID}-link`} {...(mapLinkProblem(link) ? { error: t("host.location.linkInvalid") } : {})} />
      {picking ? <MapPicker initial={pointOf(link)} query={name.trim()} onClose={() => setPicking(false)} onPick={(point) => { onLink(pointUrl(point)); setPicking(false); }} /> : null}
    </View>
  );
}
