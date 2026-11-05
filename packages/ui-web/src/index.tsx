'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { createContext, useContext, useEffect, useId, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { cn } from './cn';
import { defaultStrings, type UiStrings } from './strings';

export { cn } from './cn';
export { defaultStrings, stringsFor, type UiStrings } from './strings';

export type State = 'default' | 'loading' | 'error' | 'empty' | 'disabled';
export const componentStates: State[] = ['default', 'loading', 'error', 'empty', 'disabled'];

const StringsContext = createContext<UiStrings>(defaultStrings);
/** Supplies localized copy to every primitive. Without it the es-BO defaults apply. */
export function UiProvider({ strings, children }: PropsWithChildren<{ strings?: Partial<UiStrings> }>) {
  return <StringsContext.Provider value={{ ...defaultStrings, ...strings }}>{children}</StringsContext.Provider>;
}
const useStrings = () => useContext(StringsContext);

const unavailable = (state: State) => state === 'disabled' || state === 'loading';

function Status({ state, error, id }: { state: State; error?: string; id?: string }) {
  const t = useStrings();
  if (state === 'loading') return <p id={id} role="status" className="text-sm text-text-muted">{t.loading}</p>;
  if (state === 'empty') return <p id={id} className="text-sm text-text-muted">{t.empty}</p>;
  if (state === 'error' || error) return <p id={id} role="alert" className="text-sm font-medium text-danger">{error ?? t.genericError}</p>;
  return null;
}

const focusRing = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary';

export const buttonVariants = cva(
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-semibold transition-[transform,box-shadow] duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-55 ${focusRing}`,
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:shadow-md',
        secondary: 'bg-primary-muted text-primary hover:shadow-sm',
        ghost: 'bg-transparent text-primary hover:bg-primary-muted',
        danger: 'bg-danger text-on-danger hover:shadow-md'
      }
    },
    defaultVariants: { variant: 'primary' }
  }
);

export type ButtonProps = PropsWithChildren<{
  state?: State;
  /** Same name as the native package; `onClick` stays available for DOM-style callers. */
  onPress?: () => void;
} & VariantProps<typeof buttonVariants> & ButtonHTMLAttributes<HTMLButtonElement>>;

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type PartnerDestination = 'OFFICIAL_SITE' | 'LANDING' | 'WHATSAPP' | 'PHONE' | 'EMAIL' | 'INSTAGRAM' | 'PRODUCT_PAGE';
export type PartnerSurface = 'PUBLIC_SITE' | 'SEARCH' | 'CELEBRATION_SITE' | 'GIFT_LIST' | 'EMAIL' | 'APP' | 'QUOTE_FORM';
/** The only way to point at a partner: the redirector `/r/{listingId}`, which records the lead and answers 302. Never the partner URL. */
export function partnerRedirectHref(listingId: string, options: { destination?: PartnerDestination; surface?: PartnerSurface; celebrationId?: string } = {}): string {
  if (!LISTING_ID.test(listingId)) throw new Error('PartnerLink needs a listing id (UUID), never a partner URL');
  const query = new URLSearchParams();
  if (options.destination) query.set('destination', options.destination);
  if (options.surface) query.set('surface', options.surface);
  if (options.celebrationId) query.set('celebrationId', options.celebrationId);
  const text = query.toString();
  return `/r/${encodeURIComponent(listingId)}${text ? `?${text}` : ''}`;
}

/**
 * A link to a partner. It takes a listing id, not a URL, so a direct partner link is impossible by construction; the rel is always
 * `sponsored nofollow` and the disclaimer travels with the link (visible, and tied to it with aria-describedby).
 */
export function PartnerLink({ listingId, destination, surface, celebrationId, children, className, disclaimer = true }: PropsWithChildren<{ listingId: string; destination?: PartnerDestination; surface?: PartnerSurface; celebrationId?: string; className?: string; disclaimer?: boolean }>) {
  const t = useStrings();
  const id = useId();
  return (
    <span className="inline-flex flex-col gap-1">
      <a href={partnerRedirectHref(listingId, { destination, surface, celebrationId })} rel="sponsored nofollow noopener" aria-describedby={disclaimer ? id : undefined} className={cn(buttonVariants({ variant: 'secondary' }), className)}>{children}</a>
      {disclaimer ? <span id={id} className="text-xs text-text-muted">{t.partnerDisclaimer}</span> : null}
    </span>
  );
}

export function Button({ children, variant, state = 'default', className, onPress, onClick, ...props }: ButtonProps) {
  const t = useStrings();
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant }), className)}
      aria-busy={state === 'loading' || undefined}
      disabled={unavailable(state)}
      onClick={(event) => { onClick?.(event); onPress?.(); }}
      {...props}
    >
      {state === 'loading' ? t.loading : children}
    </button>
  );
}

const fieldControl = (invalid: boolean) => cn(
  `min-h-11 w-full rounded-md border bg-surface px-3 text-text disabled:cursor-not-allowed disabled:opacity-55 ${focusRing}`,
  invalid ? 'border-danger' : 'border-border'
);

function Field({ label, htmlFor, children, state, error }: { label: string; htmlFor: string; children: ReactNode; state: State; error?: string }) {
  return (
    <div className="grid max-w-md gap-1.5">
      <label htmlFor={htmlFor} className="font-semibold text-text">{label}</label>
      {state === 'empty' ? null : children}
      <Status state={state} error={error} id={`${htmlFor}-status`} />
    </div>
  );
}

export function Input({ label, state = 'default', error, id, className, ...props }: { label: string; state?: State; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Field label={label} htmlFor={inputId} state={state} error={error}>
      <input id={inputId} className={cn(fieldControl(state === 'error' || Boolean(error)), className)} disabled={unavailable(state)} aria-invalid={state === 'error' || Boolean(error) || undefined} aria-describedby={error || state === 'error' ? `${inputId}-status` : undefined} {...props} />
    </Field>
  );
}

export function Select({ label, options, value, onChange, state = 'default', error }: { label: string; options: { label: string; value: string }[]; value?: string; onChange?: (value: string) => void; state?: State; error?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} state={state} error={error}>
      <select id={id} value={value} className={fieldControl(state === 'error' || Boolean(error))} disabled={unavailable(state)} aria-invalid={state === 'error' || Boolean(error) || undefined} onChange={(event) => onChange?.(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}

export function Checkbox({ label, value, onChange, state = 'default', error }: { label: string; value: boolean; onChange?: (value: boolean) => void; state?: State; error?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="flex min-h-11 items-center gap-2 text-text">
        <input id={id} type="checkbox" className={cn('size-5 accent-primary', focusRing)} checked={value} disabled={unavailable(state)} aria-invalid={state === 'error' || Boolean(error) || undefined} onChange={(event) => onChange?.(event.target.checked)} />
        {label}
      </label>
      <Status state={state} error={error} />
    </div>
  );
}

export function Card({ children, state = 'default', className }: PropsWithChildren<{ state?: State; className?: string }>) {
  return (
    <section className={cn('grid gap-3 rounded-lg border border-border bg-surface p-4 text-text', className)}>
      <Status state={state} />
      {state === 'default' || state === 'disabled' ? children : null}
    </section>
  );
}

type OverlayProps = PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; state?: State }>;

function Overlay({ visible, onClose, title, children, state = 'default', layout }: OverlayProps & { layout: 'sheet' | 'modal' }) {
  const t = useStrings();
  return (
    <Dialog.Root open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-night/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed z-50 grid gap-4 bg-surface p-5 text-text shadow-lg',
            layout === 'sheet' ? 'inset-x-0 bottom-0 rounded-t-xl md:inset-y-0 md:left-auto md:right-0 md:w-[34rem] md:max-w-full md:rounded-none' : 'left-1/2 top-1/2 w-[min(90vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg'
          )}
        >
          <Dialog.Title className="font-display text-xl font-bold">{title}</Dialog.Title>
          <Status state={state} />
          {state === 'default' && children}
          <Dialog.Close asChild><Button variant="secondary">{t.close}</Button></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export const Sheet = (props: OverlayProps) => <Overlay {...props} layout="sheet" />;
export const Modal = (props: OverlayProps) => <Overlay {...props} layout="modal" />;

export type ToastTone = 'neutral' | 'success' | 'error';
const toastTone: Record<ToastTone, string> = { neutral: 'bg-text text-surface', success: 'bg-success text-on-primary', error: 'bg-danger text-on-danger' };

export function Toast({ message, visible, onDismiss, state = 'default', tone, durationMs = 6000 }: { message: string; visible: boolean; onDismiss?: () => void; state?: State; tone?: ToastTone; durationMs?: number }) {
  const t = useStrings();
  const resolved: ToastTone = tone ?? (state === 'error' ? 'error' : 'neutral');
  useEffect(() => {
    if (!visible || !onDismiss || durationMs <= 0) return undefined;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, durationMs, message]);
  if (!visible) return null;
  return (
    <div role={resolved === 'error' ? 'alert' : 'status'} className={cn('fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md px-4 py-3 shadow-md', toastTone[resolved])}>
      <span>{state === 'error' && !tone ? t.genericError : message}</span>
      {onDismiss && <button type="button" aria-label={t.dismiss} className={cn('min-h-11 min-w-11 rounded-md font-bold', focusRing)} onClick={onDismiss}>×</button>}
    </div>
  );
}

export function Table({ columns, rows, state = 'default', emptyMessage }: { columns: string[]; rows: string[][]; state?: State; emptyMessage?: string }) {
  const t = useStrings();
  const note = state === 'loading' || state === 'error' ? <Status state={state} /> : rows.length === 0 || state === 'empty' ? emptyMessage ?? t.emptyTable : null;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-left text-text">
        <thead><tr>{columns.map((column) => <th key={column} scope="col" className="bg-surface-muted p-3 font-semibold">{column}</th>)}</tr></thead>
        <tbody>
          {note ? <tr><td colSpan={columns.length} className="p-3 text-text-muted">{note}</td></tr> : rows.map((row, index) => <tr key={index} className="border-t border-border">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-3">{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function DatePicker({ label, value, onChange, state = 'default', error }: { label: string; value?: string; onChange?: (value: string) => void; state?: State; error?: string }) {
  return <Input label={label} type="date" value={value} onChange={(event) => onChange?.(event.target.value)} state={state} error={error} />;
}

export function FileUpload({ label, fileName, onSelect, state = 'default', error, accept }: { label: string; fileName?: string; onSelect?: (file?: File) => void; state?: State; error?: string; accept?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} state={state} error={error}>
      <input id={id} type="file" accept={accept} className={cn(fieldControl(state === 'error' || Boolean(error)), 'py-2')} disabled={unavailable(state)} onChange={(event) => onSelect?.(event.target.files?.[0])} />
      {fileName && <small className="text-text-muted">{fileName}</small>}
    </Field>
  );
}

export function ComponentCatalog() {
  const t = useStrings();
  const demoRows = [[t.catalogRowName, t.catalogRowStatus]];
  const [checked, setChecked] = useState(false);
  const [choice, setChoice] = useState('uno');
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState(false);
  const options = [{ label: t.catalogOptionOne, value: 'uno' }, { label: t.catalogOptionTwo, value: 'dos' }];
  return (
    <main className="mx-auto grid w-[min(100%-2rem,70rem)] grid-cols-1 gap-6 py-8 text-text [&>*]:min-w-0">
      <h1 className="font-display text-[clamp(1.75rem,7vw,3rem)] font-bold">{t.catalogTitle}</h1>
      <Card><p>{t.catalogIntro}</p></Card>
      <section aria-labelledby="cat-actions" className="grid gap-3"><h2 id="cat-actions" className="font-display text-xl font-bold">{t.catalogActions}</h2>
        <div className="flex flex-wrap gap-3">
          {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => <Button key={variant} variant={variant} onPress={() => setToast(true)}>{variant}</Button>)}
          <Button state="loading">{t.catalogSave}</Button><Button state="disabled">{t.catalogBlocked}</Button>
        </div>
        <div className="flex flex-wrap gap-3"><Button variant="secondary" onPress={() => setModal(true)}>{t.catalogOpenDialog}</Button><Button variant="secondary" onPress={() => setSheet(true)}>{t.catalogOpenPanel}</Button></div>
      </section>
      {componentStates.map((state) => (
        <section key={state} aria-label={`${t.catalogState} ${state}`} className="grid gap-3"><h2 className="font-display text-xl font-bold">{t.catalogState} {state}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
            <Input label={t.catalogName} placeholder={t.catalogNamePlaceholder} state={state} error={state === 'error' ? t.catalogNameError : undefined} />
            <Select label={t.catalogOption} value={choice} onChange={setChoice} options={options} state={state} error={state === 'error' ? t.catalogOptionError : undefined} />
            <Checkbox label={t.catalogTerms} value={checked} onChange={setChecked} state={state} error={state === 'error' ? t.catalogTermsError : undefined} />
            <DatePicker label={t.catalogDate} state={state} />
            <FileUpload label={t.catalogAttachment} state={state} />
            <Card state={state}><p>{t.catalogCard}</p></Card>
          </div>
          <Table columns={[t.catalogColName, t.catalogColStatus]} rows={demoRows} state={state} />
        </section>
      ))}
      <Modal visible={modal} onClose={() => setModal(false)} title={t.catalogDialog}><p>{t.catalogDialogBody}</p></Modal>
      <Sheet visible={sheet} onClose={() => setSheet(false)} title={t.catalogPanel}><p>{t.catalogPanelBody}</p></Sheet>
      <Toast visible={toast} message={t.catalogDone} tone="success" onDismiss={() => setToast(false)} />
    </main>
  );
}
