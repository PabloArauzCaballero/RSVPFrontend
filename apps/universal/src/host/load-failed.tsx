import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { errorKind } from "./celebration-errors";
import { ActionButton, EmptyState, errorMessage } from "./ui";

/** Buttons centred under an empty or milestone message (the shared button hugs the left edge from 640 px up). */
export function CenteredActions({ children }: PropsWithChildren): ReactNode {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing[2] }}>{children}</View>;
}

/** A list that could not load: the drawing for what happened (cracked server or dropped connection), what happened in plain words and one way to try again. */
export function LoadFailed({ title, error, onRetry, testID }: { readonly title: string; readonly error: unknown; readonly onRetry: () => void; readonly testID?: string }): ReactNode {
  const t = useT();
  const kind = errorKind(error);
  // Nothing was typed here, so "what you wrote is still here" would be noise: the load messages only say what happened and how to go on.
  const body = kind === "server" ? t("host.errors.serverLoad") : kind === "network" ? t("host.errors.networkLoad") : errorMessage(error, t);
  return <EmptyState illustration={kind === "server" ? "serverError" : "offline"} title={title} body={body} action={<CenteredActions><ActionButton icon="refresh" label={t("host.common.retry")} onPress={onRetry} {...(testID ? { testID } : {})} /></CenteredActions>} />;
}
