import { StyleSheet, type TextStyle } from "react-native";

/** React Native picks a font file by family name, not by `fontWeight`: this maps the weight a style asks for to the bundled Geist file (the same face the web uses; Geist has no 800 or 900 in the bundle, so those use Bold). */
const FAMILY: Readonly<Record<string, string>> = {
  "400": "Geist_400Regular", "500": "Geist_500Medium", "600": "Geist_600SemiBold",
  "700": "Geist_700Bold", "800": "Geist_700Bold", "900": "Geist_700Bold"
};
const ALIAS: Readonly<Record<string, string>> = { normal: "400", bold: "700" };

/** The family for a style, or `undefined` when the style already names its own family (that always wins). */
export function brandFamilyFor(style: unknown): string | undefined {
  const flat = StyleSheet.flatten(style as TextStyle | undefined);
  if (flat?.fontFamily) return undefined;
  const weight = String(flat?.fontWeight ?? "400");
  return FAMILY[ALIAS[weight] ?? weight] ?? FAMILY["400"];
}
