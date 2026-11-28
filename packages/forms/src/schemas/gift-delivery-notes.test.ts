import { describe, expect, it } from 'vitest';
import { DELIVERY_NOTES_MAX, deliveryNotesProblem, hasControlCharacters, notesLength } from './gift-delivery-notes.js';

describe('gift delivery notes, the same checks as the backend', () => {
  it('counts code points of the trimmed, NFC text', () => {
    expect(DELIVERY_NOTES_MAX).toBe(200);
    expect(notesLength('  😀😀  ')).toBe(2);
    expect(notesLength('é')).toBe(1);
  });
  it('refuses control characters but not tab or line breaks, and counts the limit in code points', () => {
    expect(deliveryNotesProblem('😀'.repeat(200))).toBeNull();
    expect(deliveryNotesProblem('😀'.repeat(201))).toBe('tooLong');
    expect(deliveryNotesProblem('a\u0000b')).toBe('control');
    expect(deliveryNotesProblem('a\u007fb')).toBe('control');
    expect(deliveryNotesProblem('uno\ndos\r\n\ttres')).toBeNull();
    expect(hasControlCharacters('a\tb')).toBe(false);
  });
});
