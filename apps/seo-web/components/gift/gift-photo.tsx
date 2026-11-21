'use client';

import { useState } from 'react';
import type { Translate } from '@rsvp/i18n/server';
import type { GiftItem } from '@rsvp/query-hooks';

/** Photos are optional public catalog data. Their failure never prevents viewing or reserving the gift. */
export function GiftPhoto({ item, url, t }: { readonly item: GiftItem; readonly url: string | undefined; readonly t: Translate }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || url === failedUrl || !safeImage(url)) return null;
  return <img className="gift-card__photo" src={url} alt={t('gifts.card.photo', { title: item.title })} width={480} height={320} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />;
}

function safeImage(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
