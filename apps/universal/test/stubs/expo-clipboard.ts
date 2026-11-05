export const clipboard = { value: "" };
export async function setStringAsync(text: string): Promise<boolean> { clipboard.value = text; return true; }
