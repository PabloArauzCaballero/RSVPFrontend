import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { ConfirmDialog } from "../host/ui";
import { useT } from "../platform/providers";
import { useAuth } from "./auth-context";

type RequestSignOut = (restoreFocus?: () => void) => void;
const SignOutContext = createContext<RequestSignOut | null>(null);

/** Every visible sign-out entry point requests the same confirmation, outside navigation sheets. */
export function useConfirmSignOut(): RequestSignOut {
  const request = useContext(SignOutContext);
  if (!request) throw new Error("Wrap sign-out controls in <SignOutProvider>");
  return request;
}

export function SignOutProvider({ children }: PropsWithChildren): ReactNode {
  const auth = useAuth();
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const returnFocus = useRef<(() => void) | null>(null);
  const request = useCallback<RequestSignOut>((restoreFocus) => { returnFocus.current = restoreFocus ?? null; setVisible(true); }, []);
  const dismissed = (): void => {
    const restore = returnFocus.current;
    returnFocus.current = null;
    // Wait for the modal's focus trap to unmount before focusing the menu trigger that remains on screen.
    if (restore) requestAnimationFrame(restore);
  };
  const confirm = async (): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    returnFocus.current = null;
    setBusy(true);
    try { await auth.signOut(); }
    finally { pending.current = false; setBusy(false); setVisible(false); }
  };
  return (
    <SignOutContext.Provider value={request}>
      {children}
      <ConfirmDialog visible={visible} title={t("auth.signOut.title")} body={t("auth.signOut.body")} confirmLabel={t("common.signOut")} busy={busy}
        confirmTestID="confirm-sign-out" cancelTestID="cancel-sign-out" onCancel={() => setVisible(false)} onDismiss={dismissed} onConfirm={() => { void confirm(); }} />
    </SignOutContext.Provider>
  );
}
