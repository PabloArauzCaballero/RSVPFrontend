'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '@rsvp/api-client';
import type { Translate } from '@rsvp/i18n/server';
import type { GiftItem } from '@rsvp/query-hooks';

const MAX_NAME = 120;
const MAX_MESSAGE = 500;

/** A16 · Reserve request. A native <dialog>: focus is trapped, Escape closes it and focus returns to the opener. */
export function ReserveDialog({ item, t, pending, error, onCancel, onSubmit }: {
  readonly item: GiftItem | null; readonly t: Translate; readonly pending: boolean; readonly error: unknown;
  readonly onCancel: () => void; readonly onSubmit: (item: GiftItem, input: { guestDisplayName?: string; message?: string }) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);
  const failure = error instanceof ApiError ? (error.status === 422 && error.problem?.code !== 'RESERVATION_LIMIT_REACHED' ? t('gifts.error.validation') : error.status === 403 ? t('gifts.error.forbiddenBody') : error.status === 401 ? t('gifts.error.expiredBody') : error.status === 404 ? t('gifts.error.otherBody') : error.status === 429 ? t('gifts.error.busyBody') : error.problem?.code === 'RESERVATION_LIMIT_REACHED' ? t('gifts.error.limit') : t('gifts.error.generic')) : error ? t('gifts.error.generic') : null;
  return (
    <dialog ref={ref} className="gift-dialog" aria-labelledby={`${id}-title`} onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      {item ? (
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(item, { ...(name.trim() ? { guestDisplayName: name.trim() } : {}), ...(message.trim() ? { message: message.trim() } : {}) }); }}>
          <h2 id={`${id}-title`}>{t('gifts.reserve.title')}</h2>
          <p><strong>{item.title}</strong></p>
          <p>{t('gifts.reserve.intro')}</p>
          <div className="rsvp-field"><label htmlFor={`${id}-name`}>{t('gifts.reserve.name')}</label><input id={`${id}-name`} type="text" autoComplete="name" maxLength={MAX_NAME} value={name} onChange={(event) => setName(event.target.value)} aria-describedby={`${id}-name-help`} /><span id={`${id}-name-help`} className="rsvp-hint">{t('gifts.reserve.nameHelp')}</span></div>
          <div className="rsvp-field"><label htmlFor={`${id}-msg`}>{t('gifts.reserve.message')}</label><textarea id={`${id}-msg`} maxLength={MAX_MESSAGE} value={message} onChange={(event) => setMessage(event.target.value)} aria-describedby={`${id}-msg-help`} /><span id={`${id}-msg-help`} className="rsvp-hint">{t('gifts.reserve.messageHelp')}</span></div>
          {failure ? <p className="rsvp-error" role="alert">{failure}</p> : null}
          <div className="rsvp-actions">
            <button type="submit" className="rsvp-button" disabled={pending} aria-disabled={pending}>{pending ? t('gifts.reserve.submitting') : t('gifts.reserve.submit')}</button>
            <button type="button" className="rsvp-button rsvp-button--secondary" onClick={onCancel}>{t('gifts.reserve.cancel')}</button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
