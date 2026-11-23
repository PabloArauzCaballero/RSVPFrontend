'use client';

import { useEffect, useId, useRef } from 'react';
import type { Translate } from '@rsvp/i18n/server';
import type { GiftItem } from '@rsvp/query-hooks';

/**
 * D-3 · the guest confirms cancelling their own reservation (the app's `ConfirmDialog` on the gift list, same words:
 * `gifts.guest.mine.*`). A native <dialog>: focus is trapped, Escape keeps the reservation and focus returns to the opener.
 * The two buttons name both outcomes, because «Cancelar» alone would be ambiguous. `failure` is the already-translated reason.
 */
export function CancelReservationDialog({ item, t, pending, failure, onKeep, onConfirm }: {
  readonly item: GiftItem | null; readonly t: Translate; readonly pending: boolean; readonly failure: string | null;
  readonly onKeep: () => void; readonly onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);
  return (
    <dialog ref={ref} className="gift-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} onCancel={(event) => { event.preventDefault(); if (!pending) onKeep(); }}>
      {item ? (
        <form method="dialog" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
          <h2 id={`${id}-title`}>{t('gifts.guest.mine.confirmTitle')}</h2>
          <p id={`${id}-body`}>{t('gifts.guest.mine.confirmBody', { title: item.title })}</p>
          {failure ? <p className="rsvp-error" role="alert">{failure}</p> : null}
          <div className="rsvp-actions">
            <button type="submit" className="rsvp-button" disabled={pending} aria-disabled={pending}>{pending ? t('gifts.guest.mine.cancelling') : t('gifts.guest.mine.confirm')}</button>
            <button type="button" className="rsvp-button rsvp-button--secondary" disabled={pending} onClick={onKeep}>{t('gifts.guest.mine.keep')}</button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
