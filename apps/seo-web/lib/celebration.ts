import type { GalleryImage, PublicCelebrationView, TemplateDocument } from "@rsvp/celebration-theme";
import type { ApiClient } from "@rsvp/api-client";
import { orNull, publicClient } from "./api";

/** Everything one public page needs, loaded in parallel. */
export interface PublicPage {
  readonly view: PublicCelebrationView;
  readonly template: TemplateDocument | null;
  readonly gallery: readonly GalleryImage[];
}

export interface PublicSlug {
  readonly slug: string;
  readonly updatedAt: string;
  readonly supportedLocales: readonly string[];
}

/** GET /celebrations/public/{slug} (read model), then its template and gallery. Unpublished → null (A21). */
export async function loadPublicPage(slug: string, language: string, client: ApiClient = publicClient()): Promise<PublicPage | null> {
  const view = await orNull(client.request<PublicCelebrationView>(`/celebrations/public/${encodeURIComponent(slug)}`, { auth: false, headers: language ? { "accept-language": language } : {} }));
  if (!view) return null;
  const [template, gallery] = await Promise.all([
    view.templateId ? orNull(client.request<TemplateDocument>(`/media/templates/${view.templateId}`, { auth: false })) : Promise.resolve(null),
    orNull(client.request<{ readonly items: readonly GalleryImage[] }>(`/media/public/celebrations/${view.celebrationId}/assets`, { auth: false }))
  ]);
  return { view, template, gallery: gallery?.items ?? [] };
}

const SITEMAP_PAGE = 100;

/** Published slugs for the sitemap (GET /celebrations/public). */
export async function loadPublicSlugs(client: ApiClient = publicClient()): Promise<readonly PublicSlug[]> {
  const page = await client.request<{ readonly items: readonly PublicSlug[] }>(`/celebrations/public?limit=${SITEMAP_PAGE}`, { auth: false });
  return page.items;
}

/**
 * @deprecated Title from the slug only, kept for the RSVP pages of lane F15 until they load
 * the celebration with `loadPublicPage`. Never use it for anything a guest relies on.
 */
export function celebrationFor(slug: string): { readonly slug: string; readonly title: string } {
  const displayName = slug.split("-").filter(Boolean).map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
  return { slug, title: `${displayName} | RSVP` };
}
