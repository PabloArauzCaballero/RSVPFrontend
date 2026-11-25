import type { Metadata } from "next";
import { PreviewReceiver } from "../../components/preview-receiver";
import { previewParentOrigins } from "../../lib/preview-origins";

/** P10 · The preview the app frames (host preview, editors, admin templates). Not a page for anyone else: never indexed. */
export const metadata: Metadata = { title: "DOne", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function PreviewPage() {
  return (
    <>
      <span hidden data-quiet-chrome="" />
      <PreviewReceiver origins={previewParentOrigins()} />
    </>
  );
}
