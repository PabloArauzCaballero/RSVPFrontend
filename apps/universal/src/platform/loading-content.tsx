import type { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { MOTION, Skeleton, SkeletonList, SkeletonRow, useColors } from "@rsvp/ui";
import { Row, RowList } from "../host/gifts/offer-row";
import { useT } from "./providers";
import { useAfterDelay } from "./use-after-delay";

const ROWS = [0, 1, 2, 3] as const;
const FORM_WIDTH = 720;

function Modes() {
  return (
    <View style={{ gap: spacing[6] }}>
      <View style={{ maxWidth: FORM_WIDTH }}><Skeleton width="92%" height={15} /></View>
      <RowList>
        {ROWS.map((row) => (
          <Row key={row} first={row === 0}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] }}>
              <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 220 }}><Skeleton width="68%" height={24} /></View>
              <Skeleton width={116} height={24} radius={radius.full} />
            </View>
            <View style={{ gap: spacing[2], maxWidth: 640 }}>
              <Skeleton width="100%" height={14} />
              <Skeleton width={row === 0 ? "64%" : "50%"} height={14} />
            </View>
            <Skeleton width={194} height={44} radius={radius.md} />
          </Row>
        ))}
      </RowList>
    </View>
  );
}

function Form() {
  return (
    <View style={{ gap: spacing[6], width: "100%", maxWidth: FORM_WIDTH }}>
      <Skeleton width="48%" height={22} />
      {ROWS.slice(0, 3).map((row) => (
        <View key={row} style={{ gap: spacing[2] }}>
          <Skeleton width={row === 1 ? "36%" : "24%"} height={14} />
          <Skeleton height={44} radius={radius.md} />
        </View>
      ))}
      <Skeleton width={148} height={44} radius={radius.md} />
    </View>
  );
}

function Field() {
  return (
    <View style={{ gap: spacing[2], maxWidth: FORM_WIDTH }}>
      <Skeleton width="32%" height={14} />
      <Skeleton height={44} radius={radius.md} />
    </View>
  );
}

function Filters() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[3] }}>
      <View style={{ flexGrow: 2, flexBasis: 190 }}><Skeleton height={44} radius={radius.md} /></View>
      <View style={{ flexGrow: 1, flexBasis: 128 }}><Skeleton height={44} radius={radius.md} /></View>
    </View>
  );
}

function List({ people = false, gifts = false }: { readonly people?: boolean; readonly gifts?: boolean }) {
  return (
    <View style={{ gap: spacing[5] }}>
      {people || gifts ? <Filters /> : null}
      <RowList>
        {ROWS.map((row) => (
          <Row key={row} first={row === 0}>
            <SkeletonRow minHeight={38} avatar={people} trailing={people || gifts} />
          </Row>
        ))}
      </RowList>
    </View>
  );
}

function Gallery() {
  const { width } = useWindowDimensions();
  const palette = useColors();
  const tileWidth = width >= 768 ? "31%" : "46%";
  return (
    <View style={{ gap: spacing[5] }}>
      <Skeleton width={156} height={44} radius={radius.md} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[3] }}>
        {ROWS.map((row) => (
          <View key={row} aria-hidden style={{ width: tileWidth, aspectRatio: 4 / 3, backgroundColor: palette.surfaceMuted, borderRadius: radius.lg }} />
        ))}
      </View>
    </View>
  );
}

function Agenda() {
  return (
    <View style={{ gap: spacing[6] }}>
      <RowList>
        <Row first><Skeleton width="48%" height={22} /><Skeleton width="72%" height={14} /></Row>
      </RowList>
      <View style={{ gap: spacing[4], maxWidth: FORM_WIDTH }}>
        <Skeleton width="42%" height={22} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {Array.from({ length: 7 }, (_, day) => <Skeleton key={day} width={42} height={36} radius={radius.md} />)}
        </View>
        <Filters />
      </View>
    </View>
  );
}

function Summary() {
  return (
    <View style={{ gap: spacing[6] }}>
      <RowList>
        <Row first>
          <Skeleton width="48%" height={24} />
          <Skeleton width="72%" height={14} />
          <Skeleton height={24} radius={radius.md} />
        </Row>
      </RowList>
      <RowList>
        <Row first><Skeleton width="42%" height={22} /><Skeleton width="88%" height={14} /></Row>
        <Row><Skeleton width="50%" height={22} /><Skeleton width="69%" height={14} /></Row>
      </RowList>
    </View>
  );
}

function Preview() {
  return (
    <View style={{ alignItems: "center", gap: spacing[5] }}>
      <Skeleton width={216} height={44} radius={radius.md} />
      <View style={{ width: "100%", maxWidth: 360 }}><Skeleton height={420} radius={radius.xl} /></View>
    </View>
  );
}

function Checklist() {
  return (
    <RowList>
      {ROWS.map((row) => (
        <Row key={row} first={row === 0}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <Skeleton width={20} height={20} />
            <View style={{ flex: 1 }}><Skeleton width="64%" height={16} /></View>
          </View>
        </Row>
      ))}
    </RowList>
  );
}

const layouts = {
  modes: Modes,
  form: Form,
  field: Field,
  list: List,
  people: () => <List people />,
  gifts: () => <List gifts />,
  gallery: Gallery,
  agenda: Agenda,
  summary: Summary,
  preview: Preview,
  checklist: Checklist
};

export type LoadingKind = keyof typeof layouts;

/**
 * Decorative shapes with one localized announcement, reused for code and data loading. Nothing is drawn for the first
 * `MOTION.loadingDelayMs`: a load that ends sooner (cached chunk, cached query) never flashes a skeleton. `delayMs={0}` draws it at once.
 */
export function LoadingContent({ kind, delayMs = MOTION.loadingDelayMs }: { readonly kind: LoadingKind; readonly delayMs?: number }): ReactNode {
  const t = useT();
  const Layout = layouts[kind];
  const visible = useAfterDelay(delayMs);
  if (!visible) return null;
  return (
    <View testID={`loading-${kind}`}>
      <SkeletonList label={t("common.loading")}><Layout /></SkeletonList>
    </View>
  );
}
