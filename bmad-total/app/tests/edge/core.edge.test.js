import { describe, expect, it } from 'vitest';
import { clamp, normalizeEmail, normalizeUserName, safeDivide } from '../../src/core.js';

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
    expect(() => normalizeUserName(undefined)).toThrow(expectedMessage);
    expect(() => normalizeUserName(null)).toThrow(expectedMessage);
    expect(() => normalizeUserName(123)).toThrow(expectedMessage);
    expect(() => normalizeUserName({})).toThrow(expectedMessage);
  });

  it('normalizeUserName rejects empty values after normalization with exact message', () => {
    const expectedMessage = 'Le nom utilisateur est vide après normalisation';
    expect(() => normalizeUserName('')).toThrow(expectedMessage);
    expect(() => normalizeUserName('   ')).toThrow(expectedMessage);
    expect(() => normalizeUserName('\n\t')).toThrow(expectedMessage);
  });

  it('normalizeUserName stays stable on long input (>= 10,000 chars)', () => {
    const first = 'A'.repeat(5000);
    const second = 'B'.repeat(5000);

    const result = normalizeUserName(`  ${first}\n\t   ${second}  `);

    expect(result).toBe(`${first} ${second}`);
    expect(result.length).toBe(10_001);
  });

  it('clamp handles boundaries and invalid ranges', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(() => clamp(5, 10, 0)).toThrow(/min cannot be greater than max/);
  });
});
