'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { GuestGiftState, PurchaseAnswer } from '@rsvp/query-hooks';
import type { createTranslator } from '@rsvp/i18n/server';

type T = ReturnType<typeof createTranslator>;

/**
 * R5 · the pieces of the guest's card that are new on the public site: the units stepper, the units and group lines, and the «¿Compraste?» card.
 * Same words (`gifts.guest.*`) and same rules (`guestGiftState`) as the app's `gift-card-parts.tsx`. Plain HTML: this site does not import `packages/ui`.
 */
export function UnitsStepper({ id, value, max, title, t, onChange }: { readonly id: string; readonly value: number; readonly max: number; readonly title: string; readonly t: T; readonly onChange: (next: number) => void }): ReactNode {
  return (
    <div className="gift-stepper" role="group" aria-labelledby={`${id}-label`} data-testid={id}>
      <p id={`${id}-label`} className="gift-stepper__label">{t('gifts.guest.units.choose')}</p>
      <div className="gift-stepper__row">
        <button type="button" className="gift-stepper__button" aria-label={`${t('gifts.guest.units.less')} · ${title}`} disabled={value <= 1} onClick={() => onChange(value - 1)} data-testid={`${id}-less`}><span aria-hidden="true" className="gift-stepper__sign" /></button>
        <output className="gift-stepper__value" aria-live="polite" aria-label={t('gifts.guest.units.value', { count: value })} data-testid={`${id}-value`}>{value}</output>
        <button type="button" className="gift-stepper__button" aria-label={`${t('gifts.guest.units.more')} · ${title}`} disabled={value >= max} onClick={() => onChange(value + 1)} data-testid={`${id}-more`}><span aria-hidden="true" className="gift-stepper__sign gift-stepper__sign--plus" /></button>
      </div>
      <p className="rsvp-hint">{t('gifts.guest.units.help', { left: max })}</p>
    </div>
  );
}

/** «Faltan 8 de 12», «Entre varios · 3 personas aportan» and who buys it. Counts only; a name shows only when its owner chose to (PF-1). */
export function UnitsAndGroup({ id, state, t }: { readonly id: string; readonly state: GuestGiftState; readonly t: T }): ReactNode {
  if (!state.showUnits && !state.group) return null;
  return (
    <div className="gift-participation" data-testid={`gift-participation-${id}`}>
      {state.showUnits ? <p className="gift-participation__units" data-testid={`gift-units-${id}`}>{t('gifts.guest.units.left', { count: state.unitsLeft, total: state.quantity })}</p> : null}
      {state.group ? <p className="gift-participation__badge" data-testid={`gift-badge-${id}`}>{t('gifts.guest.group.badge')}</p> : null}
      {state.group ? <p className="rsvp-hint" data-testid={`gift-group-${id}`}>{state.contributors === 0 ? t('gifts.guest.group.contributorsNone') : t('gifts.guest.group.contributors', { count: state.contributors })}</p> : null}
      {state.coordinator ? <p data-testid={`gift-coordinator-${id}`}>{state.coordinator.name ? t('gifts.guest.group.coordinatorNamed', { name: state.coordinator.name }) : t('gifts.guest.group.coordinatorAnonymous')}</p> : null}
      {state.group && !state.hasCoordinator ? <p className="rsvp-hint">{t('gifts.guest.group.noCoordinator')}</p> : null}
      {state.contributorNames.length > 0 ? <p className="rsvp-hint" data-testid={`gift-names-${id}`}>{t('gifts.guest.group.namesShown', { names: state.contributorNames.join(', ') })}</p> : null}
    </div>
  );
}

/** The card that appears when the guest comes back from the provider. It is a labelled group, so a screen reader announces the question with its options. */
export function PurchasePromptCard({ id, title, units, reminder, t, onAnswer }: { readonly id: string; readonly title: string; readonly units: number; readonly reminder: boolean; readonly t: T; readonly onAnswer: (answer: PurchaseAnswer) => void }): ReactNode {
  // The question appears when the guest comes back: it takes focus so a screen reader says it (the same as the page's other inline answers).
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: false }); }, []);
  return (
    <section ref={ref} tabIndex={-1} className="gift-note gift-note--info gift-prompt" aria-labelledby={`gift-prompt-${id}-title`} data-testid={`gift-prompt-${id}`}>
      <h3 id={`gift-prompt-${id}-title`}>{units > 1 ? t('gifts.guest.prompt.titleUnits', { units, title }) : t('gifts.guest.prompt.title', { title })}</h3>
      <p className="rsvp-hint">{t('gifts.guest.prompt.body')}</p>
      {reminder ? <p className="rsvp-hint">{t('gifts.guest.prompt.reminder')}</p> : null}
      <div className="gift-actions">
        <button type="button" className="rsvp-button" aria-label={t('gifts.guest.prompt.yesFor', { title })} onClick={() => onAnswer('yes')} data-testid={`prompt-yes-${id}`}>{t('gifts.guest.prompt.yes')}</button>
        <button type="button" className="rsvp-button rsvp-button--secondary" aria-label={t('gifts.guest.prompt.laterFor', { title })} onClick={() => onAnswer('later')} data-testid={`prompt-later-${id}`}>{t('gifts.guest.prompt.later')}</button>
        <button type="button" className="rsvp-button rsvp-button--secondary" aria-label={t('gifts.guest.prompt.noFor', { title })} onClick={() => onAnswer('no')} data-testid={`prompt-no-${id}`}>{t('gifts.guest.prompt.no')}</button>
      </div>
    </section>
  );
}
