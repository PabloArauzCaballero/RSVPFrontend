import { forwardRef, useEffect, useImperativeHandle, useRef, type PropsWithChildren } from "react";
import { View } from "react-native";
import type { DragState, FileDropAreaProps } from "./file-drop";

export type { DragState, FileDropAreaProps };

export const supportsFileDrop = (): boolean => typeof window !== "undefined" && !(window.matchMedia?.("(pointer: coarse)").matches ?? false);

const typesOf = (event: DragEvent): readonly string[] => Array.from(event.dataTransfer?.types ?? []);
const carriesFiles = (event: DragEvent): boolean => typesOf(event).includes("Files");
/** A picture or a link dragged from another page: it is taken only to explain that the file itself is needed. */
const carriesAddress = (event: DragEvent): boolean => typesOf(event).includes("text/uri-list");

/** Invalid only when the browser tells every type and none is accepted; some hide them or leave HEIC empty. */
function dragState(event: DragEvent, accept: readonly string[]): DragState {
  if (!carriesFiles(event)) return "invalid";
  const types = Array.from(event.dataTransfer?.items ?? [], (item) => item.type);
  return types.length && types.every((type) => type && !accept.includes(type)) ? "invalid" : "valid";
}

/**
 * react-native-web does not forward drag events from `View`, so this listens on the DOM node. While it is on screen, a file
 * dropped outside it does nothing: without that the browser leaves the app to open the file.
 */
export const FileDropArea = forwardRef<View, PropsWithChildren<FileDropAreaProps>>(function FileDropArea(props, forwarded) {
  const { label, describedBy, style, testID, children } = props;
  const ref = useRef<View>(null);
  useImperativeHandle(forwarded, () => ref.current as View, []);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node) return undefined;
    // Programmatic focus only (after a row is removed): it is not a stop of the Tab key, its buttons are.
    node.tabIndex = -1;
    let depth = 0;
    const takes = (event: DragEvent): boolean => carriesFiles(event) || carriesAddress(event);
    const enter = (event: DragEvent): void => {
      if (!takes(event)) return;
      event.preventDefault();
      depth += 1;
      latest.current.onDragState(latest.current.disabled ? "idle" : dragState(event, latest.current.accept));
    };
    const over = (event: DragEvent): void => {
      if (!takes(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = latest.current.disabled ? "none" : "copy";
    };
    const leave = (event: DragEvent): void => {
      if (!takes(event)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) latest.current.onDragState("idle");
    };
    const drop = (event: DragEvent): void => {
      if (!takes(event)) return;
      event.preventDefault();
      depth = 0;
      latest.current.onDragState("idle");
      if (latest.current.disabled) return;
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (!files.length) latest.current.onNoFiles();
      else latest.current.onFiles(latest.current.multiple ? files : files.slice(0, 1));
    };
    const guard = (event: DragEvent): void => {
      if (event.defaultPrevented || !carriesFiles(event)) return;
      event.preventDefault();
      if (event.type === "dragover" && event.dataTransfer) event.dataTransfer.dropEffect = "none";
    };
    const own = [["dragenter", enter], ["dragover", over], ["dragleave", leave], ["drop", drop]] as const;
    own.forEach(([name, listener]) => node.addEventListener(name, listener));
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      own.forEach(([name, listener]) => node.removeEventListener(name, listener));
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  return <View ref={ref} role="group" aria-label={label} aria-describedby={describedBy} style={style} testID={testID}>{children}</View>;
});
