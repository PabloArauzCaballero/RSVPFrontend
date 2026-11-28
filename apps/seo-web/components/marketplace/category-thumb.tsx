import { isMarketplaceThumb, marketplaceThumbSrc, marketplaceThumbSrcSet } from "@rsvp/query-hooks";

/**
 * The 3D tile of a category: one image per colour scheme (the tile is baked into the image, so the CSS adds no padding or fill around it).
 * A slug without art (a category an administrator created) gets the generic tile, so the row never breaks. Decorative: the name is always
 * written next to it. Fixed width and height, and lazy outside the first screen, so nothing moves while it loads.
 */
export function CategoryThumb({ slug, name, eager = false }: { readonly slug: string; readonly name: string; readonly eager?: boolean }) {
  if (!isMarketplaceThumb(slug)) return <span className="mkt-thumb mkt-thumb--generic" aria-hidden="true">{Array.from(name.trim())[0]?.toLocaleUpperCase() ?? ""}</span>;
  // Both colour schemes are lazy on purpose: the browser does not fetch a lazy image that is display:none, so only the variant of the active scheme downloads
  // (an eager hidden image would download twice). `eager` is kept for the signature and only raises fetch priority of the visible ones.
  const loading = "lazy";
  void eager;
  return (
    <span className="mkt-thumb" aria-hidden="true">
      <img className="mkt-thumb__img mkt-thumb__img--light" src={marketplaceThumbSrc(slug, "light", 88)} srcSet={marketplaceThumbSrcSet(slug, "light")} width={72} height={72} alt="" loading={loading} decoding="async" />
      <img className="mkt-thumb__img mkt-thumb__img--dark" src={marketplaceThumbSrc(slug, "dark", 88)} srcSet={marketplaceThumbSrcSet(slug, "dark")} width={72} height={72} alt="" loading={loading} decoding="async" />
    </span>
  );
}

/** «Todas»: four rounded squares in the ink stroke of the interface icons (no glyph, no emoji). */
export function AllThumb() {
  return (
    <span className="mkt-thumb mkt-thumb--all" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
      </svg>
    </span>
  );
}
