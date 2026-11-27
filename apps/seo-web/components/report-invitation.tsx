'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { createTranslator, type AppLocale } from '@rsvp/i18n/server';
import type { ApiClient } from '@rsvp/api-client';
import { MUSIC_ELEMENT, REPORT_COMMENT_MAX, REPORT_REASONS, reportDraftProblem, reportFailure, submitPublicReport, type ReportFailure, type ReportReason } from '@rsvp/query-hooks';
import { createGuestClient } from '../lib/guest-client';
import './report.css';

type Target = 'page' | 'music';

/**
 * F7 · the discreet foot of every public invitation: «Denunciar esta invitación» and, only when the page plays the host's own MP3,
 * «Denunciar la música» (a separate report: only the music is reviewed and the invitation stays up). Open to anyone, no session, no
 * personal data: the form asks for a reason from the closed list and an optional comment. A native <dialog> traps focus, Escape closes
 * it and focus returns to the button that opened it. Whatever the guest typed survives a failed send. The gifts and reply buttons are
 * the renderer's dock and nothing here can cover them: this is page chrome below the article.
 */
export function ReportInvitation({ slug, locale, hasOwnMusic, client }: { readonly slug: string; readonly locale: AppLocale; readonly hasOwnMusic: boolean; readonly client?: ApiClient }) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [target, setTarget] = useState<Target | null>(null);
  return (
    <footer className="report-footer" data-report-footer="">
      <button type="button" className="report-link" onClick={() => setTarget('page')} data-report-open="page">{t('moderation.report.open')}</button>
      {hasOwnMusic ? <button type="button" className="report-link" onClick={() => setTarget('music')} data-report-open="music">{t('moderation.report.openMusic')}</button> : null}
      <ReportDialog slug={slug} locale={locale} target={target} onClose={() => setTarget(null)} {...(client ? { client } : {})} />
    </footer>
  );
}

type Phase = 'editing' | 'sending' | 'done';

function ReportDialog({ slug, locale, target, onClose, client }: { readonly slug: string; readonly locale: AppLocale; readonly target: Target | null; readonly onClose: () => void; readonly client?: ApiClient }) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<Phase>('editing');
  const [failure, setFailure] = useState<ReportFailure | null>(null);
  const [shown, setShown] = useState<Target>('page');
  const http = useRef<ApiClient | null>(client ?? null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const doneTitleRef = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (target) {
      if (!dialog.open) { setShown(target); dialog.showModal(); }
      return;
    }
    if (dialog.open) dialog.close();
    // The form is cleared on the way out: showModal() focuses what is in the DOM at that instant, so a leftover confirmation would
    // take the focus of the next report and then unmount with it.
    setPhase('editing'); setFailure(null); setTouched(false); setReason(''); setComment('');
  }, [target]);

  // The form unmounts with the focus inside it: the confirmation's title takes it.
  useEffect(() => { if (phase === 'done') doneTitleRef.current?.focus(); }, [phase]);

  const problem = touched ? reportDraftProblem({ reason: reason || null, comment }) : null;
  const send = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (inFlight.current) return;
    setTouched(true);
    if (reportDraftProblem({ reason: reason || null, comment }) || !reason) return;
    inFlight.current = true;
    // The fields are disabled while it sends, and a disabled control drops its focus: the send button holds it and is never `disabled`.
    submitRef.current?.focus();
    setPhase('sending'); setFailure(null);
    try {
      http.current ??= createGuestClient();
      await submitPublicReport(http.current, slug, { reason, comment, element: shown === 'music' ? MUSIC_ELEMENT : null });
      setPhase('done');
    } catch (error) {
      setFailure(reportFailure(error));
      setPhase('editing');
    } finally {
      inFlight.current = false;
    }
  };
  const music = shown === 'music';
  const reasonError = problem === 'reasonRequired' ? t('moderation.report.errors.reasonRequired') : null;
  const commentError = problem === 'commentRequired' ? t('moderation.report.errors.commentRequired') : problem === 'commentTooLong' ? t('moderation.report.errors.commentTooLong', { max: REPORT_COMMENT_MAX }) : null;
  const failureText = failure ? t(`moderation.report.errors.${failure.key}`, { minutes: failure.minutes ?? 0, max: REPORT_COMMENT_MAX }) : null;
  const closeDialog = (): void => { if (phase !== 'sending') onClose(); };
  return (
    <dialog ref={ref} className="report-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`} onCancel={(event) => { event.preventDefault(); closeDialog(); }} onClose={onClose}>
      {target && phase !== 'done' ? (
        <form className="rsvp-form report-form" onSubmit={(event) => { void send(event); }} noValidate>
          <h2 id={`${id}-title`}>{t(music ? 'moderation.report.titleMusic' : 'moderation.report.titlePage')}</h2>
          <p id={`${id}-intro`} className="rsvp-hint">{t(music ? 'moderation.report.introMusic' : 'moderation.report.introPage')}</p>
          <div className="rsvp-field">
            <label htmlFor={`${id}-reason`}>{t('moderation.report.reason')}</label>
            <select id={`${id}-reason`} value={reason} onChange={(event) => setReason(event.target.value as ReportReason | '')} aria-invalid={reasonError ? 'true' : undefined} aria-describedby={reasonError ? `${id}-reason-error` : undefined} disabled={phase === 'sending'} required>
              <option value="">{t('moderation.report.reasonPlaceholder')}</option>
              {REPORT_REASONS.map((value) => <option key={value} value={value}>{t(`moderation.reasons.${value}`)}</option>)}
            </select>
            {reasonError ? <p id={`${id}-reason-error`} className="rsvp-error" role="alert">{reasonError}</p> : null}
          </div>
          <div className="rsvp-field">
            <label htmlFor={`${id}-comment`}>{t('moderation.report.comment')} <span className="rsvp-hint">({t(reason === 'OTHER' ? 'moderation.report.commentRequiredHint' : 'moderation.report.commentOptional')})</span></label>
            <textarea id={`${id}-comment`} value={comment} onChange={(event) => setComment(event.target.value)} rows={4} aria-invalid={commentError ? 'true' : undefined} aria-describedby={`${id}-comment-help${commentError ? ` ${id}-comment-error` : ''}`} disabled={phase === 'sending'} />
            <p id={`${id}-comment-help`} className="rsvp-hint report-help"><span>{t('moderation.report.commentHelp', { max: REPORT_COMMENT_MAX })}</span><span aria-hidden="true">{t('moderation.report.counter', { count: comment.length, max: REPORT_COMMENT_MAX })}</span></p>
            {commentError ? <p id={`${id}-comment-error`} className="rsvp-error" role="alert">{commentError}</p> : null}
          </div>
          {failureText ? <p className="rsvp-error" role="alert" data-report-failure={failure?.key}>{failureText}</p> : null}
          <div className="rsvp-actions">
            <button type="submit" ref={submitRef} className="rsvp-button" aria-disabled={phase === 'sending'}>{phase === 'sending' ? t('moderation.report.sending') : t('moderation.report.send')}</button>
            <button type="button" className="rsvp-button rsvp-button--secondary" disabled={phase === 'sending'} onClick={closeDialog}>{t('moderation.report.cancel')}</button>
          </div>
        </form>
      ) : null}
      {/* The live region is mounted before it has anything to say: a region inserted together with its text may not be announced. */}
      <div role="status" className={phase === 'done' ? 'report-done' : undefined}>
        {phase === 'done' ? (
          <>
            <h2 id={`${id}-title`} ref={doneTitleRef} tabIndex={-1}>{t('moderation.report.doneTitle')}</h2>
            <p id={`${id}-intro`}>{t('moderation.report.doneBody')}</p>
          </>
        ) : null}
      </div>
      {phase === 'done' ? <div className="rsvp-actions report-done-actions"><button type="button" className="rsvp-button" onClick={onClose} data-report-close="">{t('moderation.report.close')}</button></div> : null}
    </dialog>
  );
}
