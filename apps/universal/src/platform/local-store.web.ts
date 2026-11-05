export async function readLocal(key: string): Promise<string | null> {
  try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
}
export async function writeLocal(key: string, value: string): Promise<void> {
  try { globalThis.localStorage?.setItem(key, value); } catch { /* blocked storage: the value still applies for this run */ }
}
