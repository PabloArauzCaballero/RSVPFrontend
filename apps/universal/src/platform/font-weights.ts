import { StyleSheet, type TextStyle } from "react-native";

/** React Native picks a font file by family name, not by `fontWeight`: this maps the weight a style asks for to the bundled Plus Jakarta Sans file. */
const FAMILY: Readonly<Record<string, string>> = {
  "400": "PlusJakartaSans_400Regular", "500": "PlusJakartaSans_500Medium", "600": "PlusJakartaSans_600SemiBold",
  "700": "PlusJakartaSans_700Bold", "800": "PlusJakartaSans_800ExtraBold", "900": "PlusJakartaSans_800ExtraBold"
};
const ALIAS: Readonly<Record<string, string>> = { normal: "400", bold: "700" };

/** The family for a style, or `undefined` when the style already names its own family (that always wins). */
export function brandFamilyFor(style: unknown): string | undefined {
  const flat = StyleSheet.flatten(style as TextStyle | undefined);
  if (flat?.fontFamily) return undefined;
  const weight = String(flat?.fontWeight ?? "400");
  return FAMILY[ALIAS[weight] ?? weight] ?? FAMILY["400"];
}
