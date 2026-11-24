import type { ReactNode } from "react";
import { Modal, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Button, OverlayEnter, StepTransition, overlayAnimation } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { useStyles } from "../host/ui";
import { StepProgress } from "../host/step-progress";
import { dialogMaxHeight } from "./editor-dialog";

const DIALOG_WIDTH = 720;

export interface StepperDialogProps {
  readonly title: string;
  /** Translated names of the steps, in order. */
  readonly steps: readonly string[];
  /** 1-based current step. */
  readonly step: number;
  /** Validates (and saves) the current step; the caller moves `step` on success. */
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly onClose: () => void;
  /** The forward action of this step ("Siguiente", "Crear partner"). */
  readonly nextLabel: string;
  readonly nextIcon?: string;
  readonly nextTestID?: string;
  /** A request of this step is in flight: Next shows progress and nothing else can be pressed. */
  readonly busy?: boolean;
  /** "Guardar y cerrar" when closing keeps a draft; "Cancelar" by default. */
  readonly closeLabel?: string;
  /** Hides Back/Next (a final success view shows its own actions). */
  readonly footer?: boolean;
  readonly testID?: string;
  readonly children: ReactNode;
}

/**
 * A long form in steps, over the screen: the progress bar and the step name on top (StepProgress), the step's fields in the
 * middle (StepTransition: the new step slides in from the side you are going to and receives the focus, so the screen reader
 * reads "Paso 2 de 6: Identidad"), Back and Next at the foot. Per-step validation belongs to the caller's `onNext`.
 */
export function StepperDialog({ title, steps, step, onNext, onBack, onClose, nextLabel, nextIcon = "arrow", nextTestID = "stepper-next", busy = false, closeLabel, footer = true, testID = "stepper", children }: StepperDialogProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const name = steps[step - 1] ?? "";
  const stepText = t("admin.stepper.step", { step, total: steps.length });
  return (
    <Modal visible transparent animationType={overlayAnimation("fade")} onRequestClose={busy ? () => undefined : onClose}>
      <View style={styles.overlay}>
        <OverlayEnter from="none">
          <View accessibilityViewIsModal role="dialog" aria-label={title} testID={testID} style={[styles.dialog, { maxWidth: DIALOG_WIDTH, maxHeight: dialogMaxHeight(height) }]}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing[3] }}>
              <Text accessibilityRole="header" style={[styles.subtitle, { flex: 1 }]}>{title}</Text>
              <Button variant="ghost" icon="close" state={busy ? "disabled" : "default"} onPress={onClose} testID={`${testID}-close`}>{closeLabel ?? t("host.common.cancel")}</Button>
            </View>
            <StepProgress step={step} total={steps.length} name={name} progressLabel={t("admin.stepper.progress")} stepText={stepText} />
            <ScrollView tabIndex={0} aria-label={name} style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: spacing[1] }} keyboardShouldPersistTaps="handled">
              <StepTransition step={step} announce={`${stepText}: ${name}`}><View style={{ gap: spacing[4] }}>{children}</View></StepTransition>
            </ScrollView>
            {footer ? (
              <View style={{ flexDirection: "row", gap: spacing[2] }}>
                <View style={{ flex: 1 }}>{step > 1 ? <Button variant="secondary" icon="back" block state={busy ? "disabled" : "default"} onPress={onBack} testID={`${testID}-back`}>{t("host.common.back")}</Button> : null}</View>
                <View style={{ flex: 1 }}><Button icon={nextIcon} block state={busy ? "loading" : "default"} onPress={onNext} testID={nextTestID}>{nextLabel}</Button></View>
              </View>
            ) : null}
          </View>
        </OverlayEnter>
      </View>
    </Modal>
  );
}
