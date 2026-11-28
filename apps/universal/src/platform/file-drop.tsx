import { forwardRef, type PropsWithChildren } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

export type DragState = "idle" | "valid" | "invalid";

export interface FileDropAreaProps {
  /** Accessible name of the group and the id of the text that explains what it takes. */
  readonly label: string;
  readonly describedBy: string;
  /** False takes only the first of the dropped files. */
  readonly multiple: boolean;
  /** MIME types it takes, only to paint the drag as valid or not: every dropped file still gets its own answer. */
  readonly accept: readonly string[];
  readonly onFiles: (files: readonly File[]) => void;
  /** Something that is not a file was dropped, such as a picture dragged from another page (it arrives as an address). */
  readonly onNoFiles: () => void;
  readonly onDragState: (state: DragState) => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

/** Whether files can be dragged in. iOS and Android have no drag and drop: the buttons are the way in. */
export const supportsFileDrop = (): boolean => false;

/** iOS and Android: a plain labelled group. The web version (`file-drop.web.tsx`) listens to the drag events. */
export const FileDropArea = forwardRef<View, PropsWithChildren<FileDropAreaProps>>(function FileDropArea({ label, style, testID, children }, ref) {
  return <View ref={ref} accessibilityLabel={label} style={style} testID={testID}>{children}</View>;
});
