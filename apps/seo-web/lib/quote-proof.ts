/**
 * Browser side of the anonymous quote's proof of work (Provider Catalog 3.15.0, PROVIDER_ANON_QUOTES=proof): find a nonce so that
 * SHA-256(`${challenge}:${nonce}`) starts with `difficulty` zero bits. It costs the sender a moment of CPU and nothing else: no third-party
 * script, no cookie, no identifier. The work yields to the page often, so the form stays responsive and the screen reader hears the status.
 */
const encoder = new TextEncoder();

export function leadingZeroBits(digest: Uint8Array, bits: number): boolean {
  const whole = Math.floor(bits / 8);
  for (let index = 0; index < whole; index += 1) if (digest[index] !== 0) return false;
  const rest = bits % 8;
  return rest === 0 || ((digest[whole] ?? 0xff) >> (8 - rest)) === 0;
}

export interface SolveOptions { readonly signal?: AbortSignal; readonly batch?: number; readonly subtle?: Pick<SubtleCrypto, "digest"> }
const MAX_DIFFICULTY = 24;

export async function solveQuoteProof(challenge: string, difficulty: number, options: SolveOptions = {}): Promise<string> {
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > MAX_DIFFICULTY) throw new Error("quote-proof-difficulty");
  const subtle = options.subtle ?? globalThis.crypto?.subtle;
  if (!subtle) throw new Error("quote-proof-unsupported");
  const batch = options.batch ?? 1500;
  for (let n = 0; ; n += 1) {
    if (n % batch === 0) {
      if (options.signal?.aborted) throw new DOMException("aborted", "AbortError");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    const nonce = n.toString(36);
    const digest = new Uint8Array(await subtle.digest("SHA-256", encoder.encode(`${challenge}:${nonce}`)));
    if (leadingZeroBits(digest, difficulty)) return nonce;
  }
}
