/** Same shape as a resource object, with every leaf widened to string: translations must mirror es-BO key by key. */
export type DeepStrings<TResource> = { readonly [Key in keyof TResource]: TResource[Key] extends string ? string : DeepStrings<TResource[Key]> };
