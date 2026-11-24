'use client';

import { rsvpSchema, unregisteredRsvpSchema } from '@rsvp/forms';
import { COMPANIONS_STEPPER_MAX, companionCount, rsvpFailureNotice, rsvpIssueKeys, stepCompanions, type RsvpFailure, type RsvpField } from '@rsvp/query-hooks';
import type { Translate } from '@rsvp/i18n/server';
import { useId, useState, type ReactNode } from 'react';
import { CheckMark } from '../brand/check-mark';
import type { RsvpDraft } from './rsvp-draft';

/**
 * The few things a guest answers, as the app asks them (`apps/universal/src/guest/answer-fields.tsx`): come or not (two big
 * choices, "Voy" / "No puedo"), how many come along (a stepper) and, only if they want, a dietary restriction or a message,
 * folded away so the common answer takes two taps. Validation (`@rsvp/forms`) and the wording of every error
 * (`rsvpIssueKeys`, `rsvpFailureNotice` in `@rsvp/query-hooks`) are the app's, so both say the same thing.
 */

export type FieldErrors = Partial<Record<RsvpField, string>>;

const translated = (issues: Parameters<typeof rsvpIssueKeys>[0], t: Translate): FieldErrors =>
  Object.fromEntries(Object.entries(rsvpIssueKeys(issues)).map(([field, key]) => [field, t(key)])) as FieldErrors;

export function validateAnswer(draft: RsvpDraft, t: Translate) {
  const parsed = rsvpSchema.safeParse({ status: draft.status, requestedCompanions: draft.requestedCompanions, dietaryNotes: draft.dietaryNotes, message: draft.message });
  return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const, errors: translated(parsed.error.issues, t) };
}

export interface RegistrationDraft extends RsvpDraft { name: string; email: string; consent: boolean }
export function validateRegistration(draft: RegistrationDraft, t: Translate) {
  const parsed = unregisteredRsvpSchema.safeParse({ name: draft.name, email: draft.email, requestedCompanions: draft.requestedCompanions, dietaryNotes: draft.dietaryNotes, message: draft.message, consent: draft.consent });
  return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const, errors: translated(parsed.error.issues, t) };
}

/** What the person is told and can do after a failed send (the app's `FailureNotice`). The draft is never cleared by a failure. */
export function FailureNotice({ failure, t, onRetry, busy }: { failure: RsvpFailure; t: Translate; onRetry: () => void; busy: boolean }): ReactNode {
  const notice = rsvpFailureNotice(failure);
  return (
    <div className="rsvp-notice rsvp-notice--error" role="alert">
      <p>{t(notice.key, notice.params)}</p>
      {notice.retryable ? <button type="button" className="rsvp-button rsvp-button--secondary" onClick={onRetry} disabled={busy}>{t('rsvp.invite.retry')}</button> : null}
      <p className="rsvp-hint">{t('rsvp.invite.kept')}</p>
    </div>
  );
}

interface TextFieldProps { label: string; value: string; onChange: (value: string) => void; error?: string | undefined; help?: string; type?: string; autoComplete?: string; multiline?: boolean; maxLength?: number; inputMode?: 'email' | 'text'; readOnly?: boolean }
export function TextField({ label, value, onChange, error, help, type = 'text', autoComplete, multiline, maxLength, inputMode, readOnly }: TextFieldProps): ReactNode {
  const id = useId();
  const describedBy = [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  const shared = { id, value, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, maxLength, autoComplete, readOnly } as const;
  return (
    <div className="rsvp-field">
      <label htmlFor={id}>{label}</label>
      {multiline
        ? <textarea {...shared} rows={3} onChange={(event) => onChange(event.target.value)} />
        : <input {...shared} type={type} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} onFocus={readOnly ? (event) => event.currentTarget.select() : undefined} />}
      {help ? <p id={`${id}-help`} className="rsvp-hint">{help}</p> : null}
      {error ? <p id={`${id}-error`} className="rsvp-error">{error}</p> : null}
    </div>
  );
}

/** "Voy" / "No puedo": two large choices (native radios, so arrows and screen readers work). The selection is a filled shape plus a mark, never colour alone. */
export function AttendanceChoice({ value, onChange, error, t }: { value: RsvpDraft['status']; onChange: (next: 'CONFIRMED' | 'DECLINED') => void; error?: string | undefined; t: Translate }): ReactNode {
  const id = useId();
  return (
    <fieldset className="answer-choice" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="visually-hidden">{t('rsvp.invite.question')}</legend>
      <div className="answer-choice__options">
        <label className="answer-choice__option" data-testid="answer-yes">
          <input type="radio" name={`${id}-status`} value="CONFIRMED" checked={value === 'CONFIRMED'} onChange={() => onChange('CONFIRMED')} />
          {value === 'CONFIRMED' ? <CheckMark size={28} className="answer-choice__mark" /> : null}
          <span>{t('rsvp.invite.yes')}</span>
        </label>
        <label className="answer-choice__option" data-testid="answer-no">
          <input type="radio" name={`${id}-status`} value="DECLINED" checked={value === 'DECLINED'} onChange={() => onChange('DECLINED')} />
          {value === 'DECLINED' ? <span className="answer-choice__ring" aria-hidden="true"><span /></span> : null}
          <span>{t('rsvp.invite.no')}</span>
        </label>
      </div>
      {error ? <p id={`${id}-error`} className="rsvp-error" role="alert">{error}</p> : null}
    </fieldset>
  );
}

/** How many come along. The invitation says how many it includes; asking for more is allowed and the host decides. */
export function CompanionsStepper({ value, onChange, allowed, error, t }: { value: string; onChange: (next: string) => void; allowed: number | undefined; error?: string | undefined; t: Translate }): ReactNode {
  const id = useId();
  const count = companionCount(value);
  return (
    <div className="stepper" role="group" aria-labelledby={`${id}-label`} aria-describedby={[allowed !== undefined ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}>
      <p id={`${id}-label`} className="stepper__label">{t('rsvp.invite.companions')}</p>
      <div className="stepper__row">
        <button type="button" className="stepper__step" aria-label={t('rsvp.invite.companionsRemove')} disabled={count === 0} onClick={() => onChange(stepCompanions(value, -1))} data-testid="companions-minus"><span aria-hidden="true">−</span></button>
        <output className="stepper__count" aria-live="polite" aria-label={t('rsvp.invite.companionsCount', { count })} data-testid="companions-count">{count}</output>
        <button type="button" className="stepper__step" aria-label={t('rsvp.invite.companionsAdd')} disabled={count >= COMPANIONS_STEPPER_MAX} onClick={() => onChange(stepCompanions(value, 1))} data-testid="companions-plus"><span aria-hidden="true">+</span></button>
      </div>
      {allowed !== undefined ? <p id={`${id}-help`} className="rsvp-hint">{t('rsvp.invite.companionsIncluded', { count: allowed })}</p> : null}
      {error ? <p id={`${id}-error`} className="rsvp-error" role="alert">{error}</p> : null}
    </div>
  );
}

/** Dietary restriction and message: folded away unless there is already something written (or an error to show). */
export function ExtrasFields({ dietaryNotes, message, onChange, errors, t }: { dietaryNotes: string; message: string; onChange: (patch: { dietaryNotes?: string; message?: string }) => void; errors: FieldErrors; t: Translate }): ReactNode {
  const id = useId();
  const [open, setOpen] = useState(() => Boolean(dietaryNotes || message));
  const shown = open || Boolean(errors.dietaryNotes || errors.message);
  return (
    <div className="extras">
      <button type="button" className="extras__toggle" aria-expanded={shown} aria-controls={`${id}-extras`} onClick={() => setOpen(!shown)} data-testid="rsvp-extras">
        {shown ? t('rsvp.invite.extrasClose') : t('rsvp.invite.extrasOpen')}
      </button>
      {shown ? (
        <div id={`${id}-extras`} className="extras__fields">
          <TextField label={t('rsvp.invite.dietary')} help={t('rsvp.invite.dietaryHelp')} multiline maxLength={1000} value={dietaryNotes} onChange={(next) => onChange({ dietaryNotes: next })} error={errors.dietaryNotes} />
          <TextField label={t('rsvp.invite.message')} multiline maxLength={2000} value={message} onChange={(next) => onChange({ message: next })} error={errors.message} />
        </div>
      ) : null}
    </div>
  );
}
