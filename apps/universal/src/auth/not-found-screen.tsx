import type { ReactNode } from "react";
import { View } from "react-native";
import { useT } from "../platform/providers";
import { AuthLayout, TextLink, authStyles } from "./auth-ui";

/** Any address the app does not know: the same words in the person's language and one way back, instead of the router's English default. */
export function NotFoundScreen({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  return (
    <AuthLayout title={t("notFound.title")} intro={t("notFound.intro")}>
      <View style={authStyles.form}>
        <TextLink label={t("notFound.home")} onPress={() => onNavigate("/")} />
      </View>
    </AuthLayout>
  );
}

