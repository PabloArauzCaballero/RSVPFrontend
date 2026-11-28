import { CORRELATION_HEADER, REDIRECT_STATUS, resolveRedirect } from "../../../lib/redirect";
import { redirectErrorPage } from "../../../lib/redirect-page";
import { clientAddressOf, trustedProxyHops } from "../../../lib/client-address";

/**
 * B13 · Partner redirector. 302 (never 301) to the partner destination after Provider Catalog records the lead;
 * UTM parameters and the correlationId are preserved. When the catalogue cannot answer, the visitor gets a
 * clear error page with a way back instead of a blank failure.
 */
export const dynamic = "force-dynamic";
/** Back to where the visitor came from only when it is a same-origin path; otherwise the directory. */
function backLink(referrer: string | null, origin: string): string {
  try {
    const url = new URL(referrer ?? "", origin);
    // A leading run of slashes would make the href protocol-relative (`//host/x`); one slash keeps it a path of this site.
    return url.origin === origin && !url.pathname.startsWith("/r/") ? `${url.pathname.replace(/^\/+/, "/")}${url.search}` : "/proveedores";
  } catch {
    return "/proveedores";
  }
}

export async function GET(request: Request, { params }: { readonly params: Promise<{ readonly listingId: string }> }): Promise<Response> {
  const { listingId } = await params;
  const url = new URL(request.url);
  const outcome = await resolveRedirect({
    listingId,
    searchParams: url.searchParams,
    userAgent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
    correlationId: request.headers.get(CORRELATION_HEADER),
    clientAddress: clientAddressOf(request.headers, trustedProxyHops())
  });
  const noStore = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", [CORRELATION_HEADER]: outcome.correlationId };
  if (outcome.kind === "redirect") {
    return new Response(null, { status: REDIRECT_STATUS, headers: { ...noStore, location: outcome.location } });
  }
  return new Response(redirectErrorPage(outcome.reason, backLink(request.headers.get("referer"), url.origin)), {
    status: outcome.status,
    // no-referrer only on the failure page (not on the 302, which would change what the partner sees): its URL may carry the member's `ctx` (a bearer) until the script strips it.
    // The next.config.js global rule overrides this header in the served response; the page's <meta name="referrer"> (lib/redirect-page.ts) is what holds.
    headers: { ...noStore, "content-type": "text/html; charset=utf-8", "referrer-policy": "no-referrer" }
  });
}
