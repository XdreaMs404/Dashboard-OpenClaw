import { describe, expect, it } from 'vitest';
import { clamp, normalizeEmail, normalizeUserName, safeDivide } from '../../src/core.js';

function captureErrorMessage(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe('edge cases', () => {
  it('safeDivide rejects non-number inputs', () => {
    expect(() => safeDivide('10', 2)).toThrow(/expects numbers/);
    expect(() => safeDivide(10, '2')).toThrow(/expects numbers/);
  });

  it('normalizeEmail rejects wrong type and malformed positions', () => {
    expect(() => normalizeEmail(42)).toThrow(/must be a string/);
    expect(() => normalizeEmail('@domain.com')).toThrow(/Invalid email format/);
    expect(() => normalizeEmail('name@')).toThrow(/Invalid email format/);
  });

  it('normalizeUserName rejects non-string values with exact message', () => {
    const expectedMessage = 'Le nom utilisateur doit être une chaîne de caractères';

    expect(captureErrorMessage(() => normalizeUserName(undefined))).toBe(expectedMessage);
    expect(captureErrorMessage(() => normalizeUserName(null))).toBe(expectedMessage);
    expect(captureErrorMessage(() => normalizeUserName(123))).toBe(expectedMessage);
    expect(captureErrorMessage(() => normalizeUserName({}))).toBe(expectedMessage);
  });

  it('normalizeUserName rejects empty values after normalization with exact message', () => {
    const expectedMessage = 'Le nom utilisateur est vide après normalisation';

    expect(captureErrorMessage(() => normalizeUserName(''))).toBe(expectedMessage);
    expect(captureErrorMessage(() => normalizeUserName('   '))).toBe(expectedMessage);
    expect(captureErrorMessage(() => normalizeUserName('\n\t'))).toBe(expectedMessage);
  });

  it('normalizeUserName stays stable on long input (>= 10,000 chars)', () => {
    const first = 'A'.repeat(5000);
    const second = 'B'.repeat(5000);

    const result = normalizeUserName(`  ${first}\n\t   ${second}  `);

    expect(result).toBe(`${first} ${second}`);
    expect(result.length).toBe(10_001);
  });

  it('clamp handles boundaries, invalid ranges and wrong types', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(() => clamp(5, 10, 0)).toThrow(/min cannot be greater than max/);

    expect(captureErrorMessage(() => clamp('5', 0, 10))).toBe('clamp expects numbers');
    expect(captureErrorMessage(() => clamp(5, '0', 10))).toBe('clamp expects numbers');
    expect(captureErrorMessage(() => clamp(5, 0, '10'))).toBe('clamp expects numbers');
  });
});
