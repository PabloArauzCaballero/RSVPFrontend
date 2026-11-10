export interface GiftChoice { readonly value: string; readonly label: string; readonly description?: string }
export interface GiftChoicesProps {
  readonly label: string;
  readonly value: string;
  readonly choices: readonly GiftChoice[];
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly prefix?: string;
}
export interface GiftConsentProps { readonly label: string; readonly value: boolean; readonly onChange: (value: boolean) => void; readonly disabled?: boolean }
