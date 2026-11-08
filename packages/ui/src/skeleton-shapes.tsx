import { View, type DimensionValue } from 'react-native';
import { radius, spacing } from '@rsvp/design-tokens';
import { useTheme } from './theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Corner radius in px; `circle` makes it a disc (width = height). */
  radius?: number;
  circle?: boolean;
}

/** A quiet block that stands for text or an image while data loads. Decorative: the group announces the loading. */
export function Skeleton({ width = '100%', height = 14, radius: corner = 6, circle = false }: SkeletonProps) {
  const { palette } = useTheme();
  return <View aria-hidden style={{ width: circle ? height : width, height, borderRadius: circle ? radius.full : corner, backgroundColor: palette.surfaceMuted }} />;
}

export interface SkeletonRowProps {
  /** Text lines next to the avatar (1 or 2; the first is the title). */
  lines?: 1 | 2;
  /** Shows the 36 px avatar disc (the people rows). */
  avatar?: boolean;
  /** Shows the chip placeholder on the right (the answer state). */
  trailing?: boolean;
  /** Height of the real row, so swapping skeleton for data does not move the page. Default 56. */
  minHeight?: number;
}

/** The shape of a real list row (Avatar 36 + title and detail + Chip), so the loaded list lands where the skeleton was. */
export function SkeletonRow({ lines = 2, avatar = true, trailing = true, minHeight = 56 }: SkeletonRowProps) {
  return (
    <View aria-hidden style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], minHeight, paddingVertical: spacing[2] }}>
      {avatar ? <Skeleton circle height={36} /> : null}
      <View style={{ flex: 1, gap: spacing[2] }}>
        <Skeleton width="55%" height={14} />
        {lines === 2 ? <Skeleton width="35%" height={12} /> : null}
      </View>
      {trailing ? <Skeleton width={64} height={24} radius={radius.full} /> : null}
    </View>
  );
}
