/**
 * «Indicaciones de entrega» of a gift list (gift-list 1.17.0, D-10 §5.6): at most 200 characters, never the exact address. The backend answers
 * 422 INVALID_DELIVERY_NOTES, so the screen applies the same two checks first and says why in its own words (the messages are codes the screen translates).
 */
export const DELIVERY_NOTES_MAX = 200;
// eslint-disable-next-line no-control-regex -- the backend rejects these control characters (tab, line feed and carriage return are allowed), so the client says so first
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
/** The backend counts code points of the trimmed, NFC-normalised text, not UTF-16 units: an emoji is one character. */
export const notesLength = (text: string): number => [...text.trim().normalize('NFC')].length;
export const hasControlCharacters = (text: string): boolean => CONTROL_CHARACTERS.test(text);
/** Why the backend would answer 422 INVALID_DELIVERY_NOTES, or null when the text is acceptable. */
export const deliveryNotesProblem = (text: string): 'tooLong' | 'control' | null => (hasControlCharacters(text) ? 'control' : notesLength(text) > DELIVERY_NOTES_MAX ? 'tooLong' : null);
