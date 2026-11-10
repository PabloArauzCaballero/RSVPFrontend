'use client';

import { rsvpSchema, unregisteredRsvpSchema } from '@rsvp/forms';
import type { RsvpFailure } from '@rsvp/query-hooks';
import type { Translate } from '@rsvp/i18n/server';
import { useId, type ReactNode } from 'react';
import type { RsvpDraft } from './rsvp-draft';

export type FieldErrors = Partial<Record<'status' | 'requestedCompanions' | 'dietaryNotes' | 'message' | 'name' | 'email' | 'consent', string>>;

/** Turns a zod issue code from @rsvp/forms into the translated message; unknown codes read as "required". */
export function translateIssues(issues: readonly { path: (string | number)[]; message: string }[], t: Translate): FieldErrors {
  const known = ['companions', 'tooLong', 'required', 'email', 'consent'];
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0]) as keyof FieldErrors;
    if (!(field in errors)) errors[field] = t(`rsvp.errors.${known.includes(issue.message) ? issue.message : 'required'}`);
  }
  return errors;
}

export function validateAnswer(draft: RsvpDraft, t: Translate) {
  const parsed = rsvpSchema.safeParse({ status: draft.status, requestedCompanions: draft.requestedCompanions, dietaryNotes: draft.dietaryNotes, message: draft.message });
  return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const, errors: translateIssues(parsed.error.issues, t) };
}

export interface RegistrationDraft extends RsvpDraft { name: string; email: string; consent: boolean }
export function validateRegistration(draft: RegistrationDraft, t: Translate) {
  const parsed = unregisteredRsvpSchema.safeParse({ name: draft.name, email: draft.email, requestedCompanions: draft.requestedCompanions, dietaryNotes: draft.dietaryNotes, message: draft.message, consent: draft.consent });
  return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const, errors: translateIssues(parsed.error.issues, t) };
}

/** What the person is told and can do after a failed send. The draft is never cleared by a failure. */
export function FailureNotice({ failure, t, onRetry, busy }: { failure: RsvpFailure; t: Translate; onRetry: () => void; busy: boolean }): ReactNode {
  const message = {
    offline: t('rsvp.errors.offline'), unavailable: t('rsvp.errors.unavailable'), validation: t('rsvp.errors.validation'), conflict: t('rsvp.errors.conflict'), exists: t('rsvp.errors.conflict'),
    'rate-limited': failure.kind === 'rate-limited' && failure.retryAfterSeconds ? t('rsvp.errors.rateLimited', { seconds: failure.retryAfterSeconds }) : t('rsvp.errors.rateLimitedNoWait'),
    unknown: t('rsvp.errors.unknown'), invalid: t('rsvp.invalid.body'), closed: t('rsvp.closed.title'), restricted: t('rsvp.unregistered.restrictedTitle')
  }[failure.kind];
  const retryable = ['offline', 'unavailable', 'rate-limited', 'unknown'].includes(failure.kind);
  return (
    <div className="rsvp-notice rsvp-notice--error" role="alert">
      <p>{message}</p>
      {retryable ? <button type="button" className="rsvp-button rsvp-button--secondary" onClick={onRetry} disabled={busy}>{t('rsvp.actions.retry')}</button> : null}
      <p className="rsvp-hint">{t('rsvp.draft.kept')}</p>
    </div>
  );
}

interface TextFieldProps { label: string; value: string; onChange: (value: string) => void; error?: string; help?: string; type?: string; autoComplete?: string; multiline?: boolean; maxLength?: number; inputMode?: 'numeric' | 'email' | 'text'; min?: number; disabled?: boolean }
export function TextField({ label, value, onChange, error, help, type = 'text', autoComplete, multiline, maxLength, inputMode, min, disabled = false }: TextFieldProps): ReactNode {
  const id = useId();
  const describedBy = [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  const shared = { id, value, disabled, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, maxLength, autoComplete } as const;
  return (
    <div className="rsvp-field">
      <label htmlFor={id}>{label}</label>
      {multiline
        ? <textarea {...shared} rows={3} onChange={(event) => onChange(event.target.value)} />
        : <input {...shared} type={type} inputMode={inputMode} min={min} onChange={(event) => onChange(event.target.value)} />}
      {help ? <p id={`${id}-help`} className="rsvp-hint">{help}</p> : null}
      {error ? <p id={`${id}-error`} className="rsvp-error">{error}</p> : null}
    </div>
  );
}

/** Attendance choice, companions, diet and message: the answer part shared by first answer, edit and public registration. */
export function AnswerFields({ draft, onChange, errors, t, allowedCompanions, askAttendance = true, disabled = false }: { draft: RsvpDraft; onChange: (patch: Partial<RsvpDraft>) => void; errors: FieldErrors; t: Translate; allowedCompanions?: number; askAttendance?: boolean; disabled?: boolean }): ReactNode {
  return (
    <>
      {askAttendance ? (
        <fieldset className="rsvp-choice" aria-describedby={errors.status ? 'rsvp-status-error' : undefined}>
          <legend>{t('rsvp.form.statusLegend')}</legend>
          <label className="rsvp-radio"><input disabled={disabled} type="radio" name="status" value="CONFIRMED" checked={draft.status === 'CONFIRMED'} onChange={() => onChange({ status: 'CONFIRMED' })} /><span>{t('rsvp.form.confirm')}</span></label>
          <label className="rsvp-radio"><input disabled={disabled} type="radio" name="status" value="DECLINED" checked={draft.status === 'DECLINED'} onChange={() => onChange({ status: 'DECLINED' })} /><span>{t('rsvp.form.decline')}</span></label>
          {errors.status ? <p id="rsvp-status-error" className="rsvp-error">{errors.status}</p> : null}
        </fieldset>
      ) : null}
      {draft.status !== 'DECLINED' ? (
        <TextField disabled={disabled} label={t('rsvp.form.companions')} type="number" inputMode="numeric" min={0} value={draft.requestedCompanions} onChange={(value) => onChange({ requestedCompanions: value })} error={errors.requestedCompanions}
          help={allowedCompanions === undefined ? undefined : t('rsvp.form.companionsHelp', { count: allowedCompanions })} />
      ) : null}
      <TextField disabled={disabled} label={t('rsvp.form.dietary')} help={t('rsvp.form.dietaryHelp')} multiline maxLength={1000} value={draft.dietaryNotes} onChange={(value) => onChange({ dietaryNotes: value })} error={errors.dietaryNotes} />
      <TextField disabled={disabled} label={t('rsvp.form.message')} multiline maxLength={2000} value={draft.message} onChange={(value) => onChange({ message: value })} error={errors.message} />
    </>
  );
}
