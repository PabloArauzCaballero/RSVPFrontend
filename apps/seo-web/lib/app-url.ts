/** Entry to the universal app (host sign-in and sign-up). Set NEXT_PUBLIC_APP_URL per environment. */
export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8100").replace(/\/$/, "");
  return `${base}${path}`;
}
