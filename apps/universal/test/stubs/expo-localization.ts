/** Test stub: the operating system's preferred languages, most preferred first (reset with `setDeviceLocales([])`). */
let tags: readonly string[] = [];
let failing = false;

export const setDeviceLocales = (next: readonly string[], options: { readonly fail?: boolean } = {}): void => { tags = next; failing = options.fail ?? false; };
export const getLocales = (): { languageTag: string; languageCode: string | null }[] => {
  if (failing) throw new Error("native module unavailable");
  return tags.map((languageTag) => ({ languageTag, languageCode: languageTag.split("-")[0] ?? null }));
};
