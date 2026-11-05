'use client';

import { personalLinkUrl } from '@rsvp/auth';
import { ApiError, type ApiClient } from '@rsvp/api-client';
import { readContent, type HostContact, type PublicCelebrationView } from '@rsvp/celebration-theme';
import { createTranslator, type AppLocale, type Translate } from '@rsvp/i18n/server';
import {
  classifyRsvpError, newIdempotencyKey, rsvpScreenFor, tokenFingerprint, useCelebrationBySlug, useGuestResource, useGuestRsvp, usePublicRegistrationSettings, useRegisterUnregistered, useSaveGuestRsvp,
  type RsvpFailure, type RsvpState
} from '@rsvp/query-hooks';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createGuestClient } from '../../lib/guest-client';
import { clearDraft, emptyDraft, loadDraft, saveDraft, type RsvpDraft } from './rsvp-draft';
import { AnswerFields, FailureNotice, TextField, validateAnswer, validateRegistration, type FieldErrors, type RegistrationDraft } from './rsvp-form';
import { RsvpProviders } from './rsvp-providers';
import { AnswerSummary, ClosedView, HostContactLines, Countdown, DeadlineLine, InvalidView, LoadFailureView, LoadingView, StateHeading, type ClosedInfo } from './rsvp-status';

interface Props { readonly slug: string; readonly token?: string; readonly locale: AppLocale; readonly siteOrigin: string; readonly client?: ApiClient }

/** Entry of /c/{slug}/rsvp[/{token}]: everything that needs the personal token runs in the browser, after a no-store request. */
export function RsvpExperience(props: Props): ReactNode {
  // The token is read from the browser route instead of being passed down as a prop, so it is not repeated in server-rendered props.
  const params = useParams<{ token?: string }>();
  const token = props.token ?? safeDecode(params?.token);
  return <RsvpProviders><Flow {...props} token={token} /></RsvpProviders>;
}

function safeDecode(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
}

const initialFrom = (state: RsvpState): RsvpDraft => ({
  status: state.status === 'PENDING' ? '' : state.status, requestedCompanions: String(state.requestedCompanions), dietaryNotes: state.dietaryNotes ?? '', message: state.message ?? ''
});

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
  const [notice, setNotice] = useState('');

  const missing = celebration.error instanceof ApiError && celebration.error.status === 404;
  if (missing || revoked) return <InvalidView t={t} />;
  if (celebration.isError) return <LoadFailureView t={t} message={t('rsvp.errors.offline')} onRetry={() => { void celebration.refetch(); }} />;
  if (celebration.isPending) return <LoadingView t={t} />;
  const view = celebration.data;
  const content = readContent(view);
  const hosts = content.hosts.map((host) => host.name);
  const title = content.title;
  const contact = content.hostContact;

  if (!token) return <UnregisteredFlow client={client} view={view} slug={slug} t={t} locale={locale} siteOrigin={siteOrigin} hosts={hosts} contact={contact} />;

  if (rsvp.isError) {
    const failure = classifyRsvpError(rsvp.error);
    if (failure.kind === 'invalid') return <InvalidView t={t} />;
    return <LoadFailureView t={t} message={failure.kind === 'offline' ? t('rsvp.errors.offline') : t('rsvp.errors.unavailable')} onRetry={() => { void rsvp.refetch(); }} />;
  }
  if (rsvp.isPending) return <LoadingView t={t} />;
  const state = rsvp.data;
  const screen = closed ? 'closed' : rsvpScreenFor(state);

  const header = <p className="rsvp-for">{t('rsvp.page.invitationTo', { title })}</p>;
  if (screen === 'closed') return <>{header}<ClosedView info={closed ?? {}} state={state} hosts={hosts} contact={contact} locale={locale} t={t} /></>;

  const form = (
    <AnswerForm
      key={editing ? 'edit' : 'first'} client={client} celebrationId={view.celebrationId} token={token} state={state} t={t} allowedCompanions={resource.data?.allowedCompanions}
      mode={screen === 'guest' ? 'first' : 'edit'}
      onCancel={screen === 'confirmed' ? () => setEditing(false) : undefined}
      onSaved={(next) => { setEditing(false); setNotice(next.status === 'DECLINED' ? t('rsvp.success.declined') : screen === 'guest' ? t('rsvp.success.confirmed') : t('rsvp.success.saved')); }}
      onClosed={setClosed} onInvalid={() => setRevoked(true)}
    />
  );
  if (screen === 'guest') {
    return (
      <>
        {header}
        <section className="rsvp-card" aria-labelledby="rsvp-title">
          <StateHeading id="rsvp-title">{t('rsvp.guest.title')}</StateHeading>
          <p>{t('rsvp.guest.intro')}</p>
          <DeadlineLine state={state} locale={locale} t={t} />
          <Countdown deadline={state.deadline} t={t} />
          {form}
        </section>
      </>
    );
  }
  return (
    <>
      {header}
      <section className="rsvp-card" aria-labelledby="rsvp-title">
        <StateHeading id="rsvp-title">{state.status === 'DECLINED' ? t('rsvp.confirmed.titleDeclined') : t('rsvp.confirmed.title')}</StateHeading>
        {notice ? <p className="rsvp-notice rsvp-notice--success" role="status">{notice}</p> : null}
        <AnswerSummary state={state} locale={locale} t={t} />
        <DeadlineLine state={state} locale={locale} t={t} />
        <Countdown deadline={state.deadline} t={t} />
        {editing ? form : (
          <div className="rsvp-actions">
            <button type="button" className="rsvp-button" onClick={() => { setNotice(''); setEditing(true); }}>{t('rsvp.confirmed.edit')}</button>
            <p className="rsvp-hint">{t('rsvp.confirmed.editHint')}</p>
          </div>
        )}
      </section>
    </>
  );
}

interface AnswerFormProps {
  client: ApiClient; celebrationId: string; token: string; state: RsvpState; t: Translate; allowedCompanions: number | undefined; mode: 'first' | 'edit';
  onSaved: (state: RsvpState) => void; onClosed: (info: ClosedInfo) => void; onInvalid: () => void; onCancel?: () => void;
}

/** First answer (POST) and edit (PATCH). A failed send keeps every field and offers a retry with the same Idempotency-Key. */
function AnswerForm({ client, celebrationId, token, state, t, allowedCompanions, mode, onSaved, onClosed, onInvalid, onCancel }: AnswerFormProps): ReactNode {
  const scope = `${celebrationId}:${tokenFingerprint(token)}`;
  const save = useSaveGuestRsvp(client, celebrationId, token);
  const [draft, setDraft] = useState<RsvpDraft>(() => loadDraft(scope) ?? initialFrom(state));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<RsvpFailure | null>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
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
    }
  }

  // Coming back online re-sends the very same draft once, without the person having to find the button.
  useEffect(() => {
    const retry = () => { if (failure?.kind === 'offline') void submit(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  });

  const busy = save.isPending;
  return (
    <form ref={formRef} className="rsvp-form" noValidate onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(); }}>
      <AnswerFields draft={draft} onChange={(patch) => { setDraft((current) => ({ ...current, ...patch })); setErrors({}); }} errors={errors} t={t} allowedCompanions={allowedCompanions} />
      {Object.keys(errors).length ? <p className="rsvp-error" role="alert">{t('rsvp.errors.summary')}</p> : null}
      {failure ? <FailureNotice failure={failure} t={t} busy={busy} onRetry={() => { void submit(); }} /> : null}
      <div className="rsvp-actions">
        <button type="submit" className="rsvp-button" disabled={busy} aria-busy={busy}>{busy ? t('rsvp.form.submitting') : mode === 'first' ? t('rsvp.form.submit') : t('rsvp.form.save')}</button>
        {onCancel ? <button type="button" className="rsvp-button rsvp-button--secondary" onClick={onCancel} disabled={busy}>{t('rsvp.form.cancelEdit')}</button> : null}
      </div>
    </form>
  );
}

/* ---------------------------- A13 · not registered ---------------------------- */

/** Asks GET .../public-settings first: the form is only shown when public registration can succeed; otherwise it explains and says who to write to. */
function UnregisteredFlow(props: { client: ApiClient; view: PublicCelebrationView; slug: string; t: Translate; locale: AppLocale; siteOrigin: string; hosts: readonly string[]; contact: HostContact | undefined }): ReactNode {
  const { client, view, t, locale, hosts, contact } = props;
  const settings = usePublicRegistrationSettings(client, view.celebrationId);
  if (settings.isPending) return <LoadingView t={t} />;
  if (settings.isError) return <LoadFailureView t={t} message={t('rsvp.unregistered.unavailable')} onRetry={() => { void settings.refetch(); }} />;
  if (!settings.data.publicRegistrationEnabled) return <RestrictedView t={t} hosts={hosts} contact={contact} locale={locale} />;
  return <UnregisteredForm {...props} />;
}

function RestrictedView({ t, hosts, contact, locale }: { t: Translate; hosts: readonly string[]; contact: HostContact | undefined; locale: AppLocale }): ReactNode {
  return (
    <section className="rsvp-card rsvp-card--quiet" aria-labelledby="rsvp-restricted-title">
      <StateHeading id="rsvp-restricted-title">{t('rsvp.unregistered.restrictedTitle')}</StateHeading>
      <p>{t('rsvp.unregistered.restrictedBody')}</p>
      <HostContactLines contact={contact} hosts={hosts} locale={locale} t={t} />
    </section>
  );
}

function UnregisteredForm({ client, view, slug, t, locale, siteOrigin, hosts, contact }: { client: ApiClient; view: PublicCelebrationView; slug: string; t: Translate; locale: AppLocale; siteOrigin: string; hosts: readonly string[]; contact: HostContact | undefined }): ReactNode {
  const register = useRegisterUnregistered(client, view.celebrationId);
  const [draft, setDraft] = useState<RegistrationDraft>({ ...emptyDraft, status: 'CONFIRMED', name: '', email: '', consent: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<RsvpFailure | null>(null);
  const [receipt, setReceipt] = useState<{ link: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const title = readContent(view).title;

  async function submit(): Promise<void> {
    const result = validateRegistration(draft, t);
    if (!result.ok) { setErrors(result.errors); return; }
    setErrors({});
    const input = { name: result.value.name, email: result.value.email, locale, consent: true as const, requestedCompanions: result.value.requestedCompanions, dietaryNotes: result.value.dietaryNotes || null, message: result.value.message || null };
    const payload = JSON.stringify(input);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newIdempotencyKey() };
    try {
      const response = await register.mutateAsync({ input, idempotencyKey: attempt.current.key });
      setFailure(null);
      // The raw token exists only in this component's memory so the person can copy it; it is never stored.
      setReceipt({ link: response.accessToken ? personalLinkUrl(siteOrigin, slug, response.accessToken.token).url : null });
    } catch (error) { setFailure(classifyRsvpError(error)); }
  }

  // The settings said yes, but the server can still say no (the mode changed meanwhile): same explanation, same contact.
  if (failure?.kind === 'restricted') return <RestrictedView t={t} hosts={hosts} contact={contact} locale={locale} />;
  if (receipt) {
    return (
      <section className="rsvp-card" aria-labelledby="rsvp-done-title">
        <StateHeading id="rsvp-done-title">{t('rsvp.unregistered.doneTitle')}</StateHeading>
        {receipt.link ? (
          <>
            <p>{t('rsvp.unregistered.doneBody')}</p>
            <label className="rsvp-field"><span>{t('rsvp.unregistered.linkLabel')}</span><input readOnly value={receipt.link} onFocus={(event) => event.currentTarget.select()} /></label>
            <div className="rsvp-actions">
              <button type="button" className="rsvp-button" onClick={() => { void navigator.clipboard?.writeText(receipt.link ?? '').then(() => setCopied(true)); }}>{t('rsvp.actions.copyLink')}</button>
              {copied ? <p role="status" className="rsvp-hint">{t('rsvp.actions.copied')}</p> : null}
            </div>
          </>
        ) : <p>{t('rsvp.unregistered.replayBody')}</p>}
        <p className="rsvp-hint" data-testid="rsvp-email-notice">{t('rsvp.unregistered.emailNotice')}</p>
      </section>
    );
  }
  const busy = register.isPending;
  return (
    <>
      <p className="rsvp-for">{t('rsvp.page.invitationTo', { title })}</p>
      <section className="rsvp-card" aria-labelledby="rsvp-title">
        <StateHeading id="rsvp-title">{t('rsvp.unregistered.title')}</StateHeading>
        <p>{t('rsvp.unregistered.intro')}</p>
        <form className="rsvp-form" noValidate onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(); }}>
          <TextField label={t('rsvp.form.name')} autoComplete="name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} error={errors.name} />
          <TextField label={t('rsvp.form.email')} type="email" autoComplete="email" inputMode="email" help={t('rsvp.form.emailHelp')} value={draft.email} onChange={(email) => setDraft({ ...draft, email })} error={errors.email} />
          <AnswerFields draft={draft} askAttendance={false} errors={errors} t={t} onChange={(patch) => setDraft({ ...draft, ...patch })} />
          <label className="rsvp-radio rsvp-consent">
            <input type="checkbox" checked={draft.consent} aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? 'rsvp-consent-error' : undefined} onChange={(event) => setDraft({ ...draft, consent: event.target.checked })} />
            <span>{t('rsvp.form.consent')}</span>
          </label>
          {errors.consent ? <p id="rsvp-consent-error" className="rsvp-error">{errors.consent}</p> : null}
          {failure ? <FailureNotice failure={failure} t={t} busy={busy} onRetry={() => { void submit(); }} /> : null}
          <div className="rsvp-actions"><button type="submit" className="rsvp-button" disabled={busy} aria-busy={busy}>{busy ? t('rsvp.form.submitting') : t('rsvp.form.register')}</button></div>
        </form>
      </section>
    </>
  );
}
