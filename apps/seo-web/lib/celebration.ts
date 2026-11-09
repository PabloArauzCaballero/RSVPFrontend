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
    view.templateId ? optional(client.request<TemplateDocument>(`/media/templates/${view.templateId}`, { auth: false })) : Promise.resolve(null),
    optional(client.request<{ readonly items: readonly GalleryImage[] }>(`/media/public/celebrations/${view.celebrationId}/assets`, { auth: false }))
  ]);
  return { view, template, gallery: gallery?.items ?? [] };
}

/**
 * The template and the gallery only dress the page: if the media service is down (502/503, timeout) the celebration still
 * renders with the default look and no photos, instead of a 500 for the whole invitation. The celebration itself is never optional.
 */
async function optional<TValue>(request: Promise<TValue>): Promise<TValue | null> {
  try { return await request; } catch { return null; }
}

const SITEMAP_PAGE = 100;

/** Published slugs for the sitemap (GET /celebrations/public). */
export async function loadPublicSlugs(client: ApiClient = publicClient()): Promise<readonly PublicSlug[]> {
  const page = await client.request<{ readonly items: readonly PublicSlug[] }>(`/celebrations/public?limit=${SITEMAP_PAGE}`, { auth: false });
  return page.items;
}
