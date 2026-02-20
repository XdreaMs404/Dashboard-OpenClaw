import { describe, expect, it } from 'vitest';
import { clamp, normalizeEmail, normalizeUserName, safeDivide } from '../../src/core.js';

describe('core utilities', () => {
  it('safeDivide divides valid numbers', () => {
    expect(safeDivide(10, 2)).toBe(5);
  });

  it('safeDivide throws on zero division', () => {
    expect(() => safeDivide(10, 0)).toThrow(/Division by zero/);
  });

  it('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail('  Alex@Example.COM ')).toBe('alex@example.com');
  });

  it('normalizeEmail rejects invalid format', () => {
    expect(() => normalizeEmail('invalid')).toThrow(/Invalid email format/);
  });

  it('normalizeUserName trims and collapses spaces', () => {
    expect(normalizeUserName('  Jean   Dupont  ')).toBe('Jean Dupont');
  });

  it('normalizeUserName preserves accents and casing', () => {
    expect(normalizeUserName('  ÉLODIE   Martin ')).toBe('ÉLODIE Martin');
  });

  it('normalizeUserName collapses mixed separators to one space', () => {
    expect(normalizeUserName('Alice\t\t\nBob   \n\tCarole')).toBe('Alice Bob Carole');
  });

  it('clamp returns value in range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });
});
