import { androidAssetLinks, verificationConfigFromEnvironment } from "@rsvp/auth/verification";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const config = verificationConfigFromEnvironment(process.env);
  if (!config) return new Response("Verification is not configured", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(androidAssetLinks(config), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } });
}
