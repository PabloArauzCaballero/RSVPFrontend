'use client';

import { personalLinkUrl } from '@rsvp/auth';
import { ApiError, type ApiClient } from '@rsvp/api-client';
import { guestCover, readContent, type GuestCover, type HostContact, type PublicCelebrationView } from '@rsvp/celebration-theme';
import { formatCelebrationDate } from '@rsvp/i18n/format';
import { createTranslator, type AppLocale, type Translate } from '@rsvp/i18n/server';
import {
  classifyRsvpError, guestVisible, newIdempotencyKey, rsvpScreenFor, rsvpSubmitKey, tokenFingerprint, useCelebrationBySlug, useGiftList, useGuestResource, useGuestRsvp, usePublicRegistrationSettings, useRegisterUnregistered, useSaveGuestRsvp,
  type RsvpFailure, type RsvpState
} from '@rsvp/query-hooks';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createGuestClient } from '../../lib/guest-client';
import { clearGuestCredential, guestGiftPath, readGuestCredential, saveGuestCredential } from '../../lib/guest-credential';
import { CheckMark } from '../brand/check-mark';
import { clearDraft, emptyDraft, loadDraft, saveDraft, type RsvpDraft } from './rsvp-draft';
import { AttendanceChoice, CompanionsStepper, ExtrasFields, FailureNotice, TextField, validateAnswer, validateRegistration, type FieldErrors, type RegistrationDraft } from './rsvp-form';
import { RsvpProviders } from './rsvp-providers';
import { AnswerSummary, Celebrate, ClosedView, Countdown, DeadlineLine, DeclinedThanks, GuestSheet, InvalidView, LoadFailureView, LoadingView, Question, RestrictedView, StateHeading, type ClosedInfo } from './rsvp-status';

/**
 * The guest's journey on the public site, the same as in the app (`apps/universal/src/guest/rsvp-screen.tsx`, mode Persuade):
 * the invitation on the cover of every screen, the question «¿Nos acompañas?» with «Voy / No puedo», the companions stepper,
 * a drawn check (or a thank-you) once it is saved and, only when the gift list has something, one tap to it. Same contract
 * calls, same i18n keys (`rsvp.invite.*`) and the same shared rules (`@rsvp/query-hooks`, `@rsvp/forms`). What the web adds:
 * the unsent draft survives a reload (sessionStorage, keyed without the token) and a send lost offline is retried when the
 * connection returns.
 */

interface Props { readonly slug: string; readonly token?: string; readonly locale: AppLocale; readonly siteOrigin: string; readonly client?: ApiClient }
type Saved = 'first' | 'edit' | null;

/**
 * Entry of /c/{slug}/rsvp[/{token}]: everything that needs the personal token runs in the browser, after a no-store request.
 * The token comes from the personal link (and is stored in this tab, never kept in the address); without it in the route,
 * the credential this tab already holds opens the guest's own answer, as in the app (`apps/universal/app/(guest)/c/[slug]/rsvp`).
 */
export function RsvpExperience(props: Props): ReactNode {
  // The token is read from the browser route instead of being passed down as a prop, so it is not repeated in server-rendered props.
  const params = useParams<{ token?: string }>();
  const routeToken = props.token ?? safeDecode(params?.token);
  // `undefined` until the browser has been asked: sessionStorage does not exist while rendering on the server.
  const [stored, setStored] = useState<string | null | undefined>(routeToken ? null : undefined);
  useEffect(() => {
    if (routeToken) saveGuestCredential(props.slug, routeToken);
    else setStored(readGuestCredential(props.slug));
  }, [routeToken, props.slug]);
  if (!routeToken && stored === undefined) return <RsvpProviders><LoadingView t={createTranslator(props.locale)} /></RsvpProviders>;
  return <RsvpProviders><Flow {...props} token={routeToken ?? stored ?? undefined} /></RsvpProviders>;
}

function safeDecode(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
}

const initialFrom = (state: RsvpState): RsvpDraft => ({
  status: state.status === 'PENDING' ? '' : state.status, requestedCompanions: String(state.requestedCompanions), dietaryNotes: state.dietaryNotes ?? '', message: state.message ?? ''
});

/** The invitation on the cover (`guestCover`, shared with the app): title, who invites, when and where. */
const coverFor = (view: PublicCelebrationView, locale: AppLocale, t: Translate): GuestCover =>
  guestCover(view, { locale, t, formatDate: (iso) => formatCelebrationDate(iso, { locale, timeZone: view.timeZone }, { dateStyle: 'full' }) });

function Flow({ slug, token, locale, siteOrigin, client: injected }: Props): ReactNode {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const client = useMemo(() => injected ?? createGuestClient(), [injected]);
  const celebration = useCelebrationBySlug<PublicCelebrationView>(client, slug);
  const celebrationId = celebration.data?.celebrationId;
  const resource = useGuestResource(client, celebrationId, token ?? '');
  const rsvp = useGuestRsvp(client, celebrationId, token ?? '');
  const [closed, setClosed] = useState<ClosedInfo | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<Saved>(null);

  useEffect(() => {
    if (!token) return;
    if (revoked || classifyRsvpError(rsvp.error).kind === 'invalid') clearGuestCredential(slug);
  }, [token, slug, revoked, rsvp.error]);

  const missing = celebration.error instanceof ApiError && celebration.error.status === 404;
  if (missing || revoked) return <InvalidView t={t} />;
  if (celebration.isError) return <LoadFailureView t={t} kind="offline" onRetry={() => { void celebration.refetch(); }} />;
  if (celebration.isPending) return <LoadingView t={t} />;
  const view = celebration.data;
  const content = readContent(view);
  const hosts = content.hosts.map((host) => host.name);
  const contact = content.hostContact;
  const cover = coverFor(view, locale, t);

  if (!token) return <UnregisteredFlow client={client} view={view} slug={slug} t={t} locale={locale} siteOrigin={siteOrigin} cover={cover} hosts={hosts} contact={contact} />;

  if (rsvp.isError) {
    const failure = classifyRsvpError(rsvp.error);
    if (failure.kind === 'invalid') return <InvalidView t={t} />;
    return <LoadFailureView t={t} kind={failure.kind === 'offline' ? 'offline' : 'unavailable'} onRetry={() => { void rsvp.refetch(); }} />;
  }
  if (rsvp.isPending) return <LoadingView t={t} />;
  const state = rsvp.data;
  const screen = closed ? 'closed' : rsvpScreenFor(state);
  const giftsLink = <GiftsLink client={client} celebrationId={view.celebrationId} slug={slug} token={token} locale={locale} t={t} />;
  // The answers closed, but a confirmed guest can still choose a gift: the list keeps its own rules.
  if (screen === 'closed') return <ClosedView info={closed ?? {}} state={state} cover={cover} hosts={hosts} contact={contact} locale={locale} t={t}>{state.status === 'CONFIRMED' ? giftsLink : null}</ClosedView>;

  const form = (
    <AnswerForm
      key={editing ? 'edit' : 'first'} client={client} celebrationId={view.celebrationId} token={token} state={state} t={t} allowedCompanions={resource.data?.allowedCompanions}
      mode={screen === 'guest' ? 'first' : 'edit'}
      onCancel={screen === 'confirmed' ? () => setEditing(false) : undefined}
      onSaved={() => { setEditing(false); setSaved(screen === 'guest' ? 'first' : 'edit'); }}
      onClosed={setClosed} onInvalid={() => setRevoked(true)}
    />
  );
  if (screen === 'guest') {
    return (
      <GuestSheet cover={cover} labelledBy="rsvp-title">
        <div className="guest-intro">
          <Question id="rsvp-title">{t('rsvp.invite.question')}</Question>
          <p>{t('rsvp.invite.lead')}</p>
          <DeadlineLine state={state} locale={locale} t={t} />
          <Countdown deadline={state.deadline} t={t} />
        </div>
        {form}
      </GuestSheet>
    );
  }
  const declined = state.status === 'DECLINED';
  return (
    <GuestSheet cover={cover} labelledBy="rsvp-title">
      {saved === 'first' ? (
        declined
          ? <DeclinedThanks t={t} />
          : <Celebrate title={t('rsvp.invite.doneTitle')} body={state.deadline ? t('rsvp.invite.doneBodyUntil', { date: formatCelebrationDate(state.deadline, { locale, timeZone: state.timeZone }) }) : t('rsvp.invite.doneBodyAnytime')} />
      ) : (
        <div className="guest-again">
          <CheckMark size={32} className={`guest-again__mark${declined ? ' guest-again__mark--ink' : ''}`} />
          <StateHeading id="rsvp-title" level={2} className="guest-question">{declined ? t('rsvp.invite.againTitleNo') : t('rsvp.invite.againTitleYes')}</StateHeading>
        </div>
      )}
      {saved === 'edit' ? <p className="rsvp-notice rsvp-notice--success" role="status">{t('rsvp.invite.savedNote')}</p> : null}
      {!editing ? giftsLink : null}
      <div className="guest-intro">
        <AnswerSummary state={state} locale={locale} t={t} />
        {saved === 'first' ? null : <DeadlineLine state={state} locale={locale} t={t} />}
        <Countdown deadline={state.deadline} t={t} />
      </div>
      {editing ? form : <div className="rsvp-actions"><button type="button" className="rsvp-button rsvp-button--secondary" onClick={() => { setSaved(null); setEditing(true); }} data-testid="rsvp-edit">{t('rsvp.invite.edit')}</button></div>}
    </GuestSheet>
  );
}

/** One tap to the gift list (the app's `GiftsLink`), shown only when the list has something to give or could not be checked. */
function GiftsLink({ client, celebrationId, slug, token, locale, t }: { client: ApiClient; celebrationId: string; slug: string; token: string; locale: AppLocale; t: Translate }): ReactNode {
  const list = useGiftList(client, celebrationId, token);
  if (list.isSuccess && guestVisible(list.data.items).length === 0) return null;
  return (
    <div className="guest-gifts">
      {/* The credential travels in the fragment (never to a server log); see lib/guest-credential. */}
      <button type="button" className="rsvp-button" onClick={() => window.location.assign(guestGiftPath(slug, token, locale))} data-testid="open-gifts">{t('rsvp.invite.giftsCta')}</button>
      <p className="rsvp-hint">{t('rsvp.invite.giftsHint')}</p>
    </div>
  );
}

interface AnswerFormProps {
  client: ApiClient; celebrationId: string; token: string; state: RsvpState; t: Translate; allowedCompanions: number | undefined; mode: 'first' | 'edit';
  onSaved: (state: RsvpState) => void; onClosed: (info: ClosedInfo) => void; onInvalid: () => void; onCancel?: (() => void) | undefined;
}

/** First answer (POST) and edit (PATCH). A failed send keeps every field and offers a retry with the same Idempotency-Key. */
function AnswerForm({ client, celebrationId, token, state, t, allowedCompanions, mode, onSaved, onClosed, onInvalid, onCancel }: AnswerFormProps): ReactNode {
  const scope = `${celebrationId}:${tokenFingerprint(token)}`;
  const save = useSaveGuestRsvp(client, celebrationId, token);
  const [draft, setDraft] = useState<RsvpDraft>(() => loadDraft(scope) ?? initialFrom(state));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<RsvpFailure | null>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { saveDraft(scope, draft); }, [scope, draft]);

  async function submit(): Promise<void> {
    const result = validateAnswer(draft, t);
    if (!result.ok) {
      setErrors(result.errors);
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], fieldset[aria-describedby] input')?.focus());
      return;
    }
    setErrors({});
    const declined = result.value.status === 'DECLINED';
    const input = { status: result.value.status, requestedCompanions: declined ? 0 : result.value.requestedCompanions, dietaryNotes: result.value.dietaryNotes || null, message: result.value.message || null };
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newIdempotencyKey() };
    // Anti double click: a ref, because state has not re-rendered yet when the second click lands.
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await save.mutateAsync({ current: state, input, idempotencyKey: attempt.current.key });
      clearDraft(scope);
      setFailure(null);
      onSaved(next);
    } catch (error) {
      const failed = classifyRsvpError(error);
      if (failed.kind === 'closed') onClosed(failed);
      else if (failed.kind === 'invalid') onInvalid();
      else setFailure(failed);
    } finally { inFlight.current = false; }
  }

  // Coming back online re-sends the very same draft once, without the person having to find the button.
  useEffect(() => {
    const retry = () => { if (failure?.kind === 'offline') void submit(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  });

  const busy = save.isPending;
  const change = (patch: Partial<RsvpDraft>): void => { setDraft((current) => ({ ...current, ...patch })); setErrors({}); };
  return (
    <form ref={formRef} className="rsvp-form" noValidate onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(); }}>
      <AttendanceChoice value={draft.status} onChange={(status) => change({ status })} error={errors.status} t={t} />
      {draft.status === 'CONFIRMED' ? <CompanionsStepper value={draft.requestedCompanions} onChange={(requestedCompanions) => change({ requestedCompanions })} allowed={allowedCompanions} error={errors.requestedCompanions} t={t} /> : null}
      {draft.status ? <ExtrasFields dietaryNotes={draft.dietaryNotes} message={draft.message} onChange={change} errors={errors} t={t} /> : null}
      {Object.keys(errors).length ? <p className="rsvp-error" role="alert">{t('rsvp.invite.errors.summary')}</p> : null}
      {failure ? <FailureNotice failure={failure} t={t} busy={busy} onRetry={() => { void submit(); }} /> : null}
      <div className="rsvp-actions guest-actions">
        <button type="submit" className="rsvp-button" disabled={busy} aria-busy={busy} data-testid="rsvp-submit">{t(rsvpSubmitKey({ busy, mode, status: draft.status }))}</button>
        {onCancel ? <button type="button" className="rsvp-button rsvp-button--secondary" onClick={onCancel} disabled={busy} data-testid="rsvp-cancel-edit">{t('rsvp.invite.cancelEdit')}</button> : null}
      </div>
    </form>
  );
}

/* ---------------------------- A13 · not registered ---------------------------- */

interface UnregisteredProps { client: ApiClient; view: PublicCelebrationView; slug: string; t: Translate; locale: AppLocale; siteOrigin: string; cover: GuestCover; hosts: readonly string[]; contact: HostContact | undefined }

/** Asks GET .../public-settings first: the form is only shown when public registration can succeed; otherwise it explains and says who to write to. */
function UnregisteredFlow(props: UnregisteredProps): ReactNode {
  const { client, view, t, locale, cover, hosts, contact } = props;
  const settings = usePublicRegistrationSettings(client, view.celebrationId);
  if (settings.isPending) return <LoadingView t={t} />;
  if (settings.isError) return <LoadFailureView t={t} kind="unavailable" onRetry={() => { void settings.refetch(); }} />;
  if (!settings.data.publicRegistrationEnabled) return <RestrictedView t={t} cover={cover} hosts={hosts} contact={contact} locale={locale} />;
  return <UnregisteredForm {...props} />;
}

function UnregisteredForm({ client, view, slug, t, locale, siteOrigin, cover, hosts, contact }: UnregisteredProps): ReactNode {
  const register = useRegisterUnregistered(client, view.celebrationId);
  const [draft, setDraft] = useState<RegistrationDraft>({ ...emptyDraft, status: 'CONFIRMED', name: '', email: '', consent: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<RsvpFailure | null>(null);
  const [receipt, setReceipt] = useState<{ link: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const inFlight = useRef(false);

  async function submit(): Promise<void> {
    const result = validateRegistration(draft, t);
    if (!result.ok) { setErrors(result.errors); return; }
    setErrors({});
    const input = { name: result.value.name, email: result.value.email, locale, consent: true as const, requestedCompanions: result.value.requestedCompanions, dietaryNotes: result.value.dietaryNotes || null, message: result.value.message || null };
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newIdempotencyKey() };
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await register.mutateAsync({ input, idempotencyKey: attempt.current.key });
      setFailure(null);
      // The raw token exists only in this component's memory so the person can copy it; it is never stored.
      setReceipt({ link: response.accessToken ? personalLinkUrl(siteOrigin, slug, response.accessToken.token).url : null });
    } catch (error) { setFailure(classifyRsvpError(error)); } finally { inFlight.current = false; }
  }

  // The settings said yes, but the server can still say no (the mode changed meanwhile): same explanation, same contact.
  if (failure?.kind === 'restricted') return <RestrictedView t={t} cover={cover} hosts={hosts} contact={contact} locale={locale} />;
  if (receipt) {
    return (
      <GuestSheet cover={cover} labelledBy="rsvp-done-title">
        <Celebrate id="rsvp-done-title" title={t('rsvp.invite.open.doneTitle')} body={receipt.link ? t('rsvp.invite.open.doneBody') : t('rsvp.invite.open.replayBody')} />
        {receipt.link ? (
          <div className="guest-intro">
            <TextField label={t('rsvp.invite.open.linkLabel')} value={receipt.link} onChange={() => undefined} readOnly />
            <div className="rsvp-actions">
              <button type="button" className="rsvp-button" onClick={() => { void navigator.clipboard?.writeText(receipt.link ?? '').then(() => setCopied(true)); }} data-testid="rsvp-copy-link">{t('rsvp.invite.open.copyLink')}</button>
            </div>
            {copied ? <p role="status" className="rsvp-notice rsvp-notice--success">{t('rsvp.invite.open.copied')}</p> : null}
          </div>
        ) : null}
        <p className="rsvp-hint" data-testid="rsvp-email-notice">{t('rsvp.invite.open.emailNotice')}</p>
      </GuestSheet>
    );
  }
  const busy = register.isPending;
  const change = (patch: Partial<RegistrationDraft>): void => { setDraft((current) => ({ ...current, ...patch })); setErrors({}); };
  return (
    <GuestSheet cover={cover} labelledBy="rsvp-title">
      <div className="guest-intro">
        <Question id="rsvp-title">{t('rsvp.invite.open.title')}</Question>
        <p>{t('rsvp.invite.open.lead')}</p>
      </div>
      <form className="rsvp-form" noValidate onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(); }}>
        <TextField label={t('rsvp.invite.open.name')} autoComplete="name" value={draft.name} onChange={(name) => change({ name })} error={errors.name} />
        <TextField label={t('rsvp.invite.open.email')} type="email" autoComplete="email" inputMode="email" help={t('rsvp.invite.open.emailHelp')} value={draft.email} onChange={(email) => change({ email })} error={errors.email} />
        <CompanionsStepper value={draft.requestedCompanions} onChange={(requestedCompanions) => change({ requestedCompanions })} allowed={undefined} error={errors.requestedCompanions} t={t} />
        <ExtrasFields dietaryNotes={draft.dietaryNotes} message={draft.message} onChange={change} errors={errors} t={t} />
        <label className="guest-consent">
          <input type="checkbox" checked={draft.consent} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? 'rsvp-consent-error' : undefined} onChange={(event) => change({ consent: event.target.checked })} />
          <span>{t('rsvp.invite.open.consent')}</span>
        </label>
        <p className="rsvp-legal"><a href="/privacidad" target="_blank" rel="noopener" data-testid="rsvp-privacy-link">{t('legal.links.privacy')}</a></p>
        {errors.consent ? <p id="rsvp-consent-error" className="rsvp-error" role="alert">{errors.consent}</p> : null}
        {Object.keys(errors).length ? <p className="rsvp-error" role="alert">{t('rsvp.invite.errors.summary')}</p> : null}
        {failure ? <FailureNotice failure={failure} t={t} busy={busy} onRetry={() => { void submit(); }} /> : null}
        <div className="rsvp-actions guest-actions"><button type="submit" className="rsvp-button" disabled={busy} aria-busy={busy} data-testid="rsvp-register">{busy ? t('rsvp.invite.submitting') : t('rsvp.invite.open.submit')}</button></div>
      </form>
    </GuestSheet>
  );
}
