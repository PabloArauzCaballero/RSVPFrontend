import { Text, TextInput } from "react-native";
import { brandFamilyFor } from "./font-weights";
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";

/**
 * iOS and Android: the brand face is bundled (not the system font). React Native picks a font file by family name,
 * not by `fontWeight`, so every Text/TextInput gets the family that matches the weight its style asks for.
 * Done once, here, so no screen has to name a family; an explicit `fontFamily` in a style always wins.
 */
interface Renderable { render?: (props: { style?: unknown }, ref: unknown) => unknown }
let installed = false;

function patch(component: unknown): void {
  const target = component as Renderable;
  const original = target.render;
  if (typeof original !== "function") return;
  target.render = function render(this: unknown, props, ref) {
    const family = brandFamilyFor(props.style);
    return original.call(this, family ? { ...props, style: [props.style, { fontFamily: family, fontWeight: "normal" }] } : props, ref);
  };
}

export function installBrandFont(): void {
  if (installed) return;
  installed = true;
  patch(Text);
  patch(TextInput);
}

/** Loads the font files and installs the weight mapping. False until the files are ready (keep the splash up). */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const ready = loaded || Boolean(error);
  if (loaded) installBrandFont();
  return ready;
}
