export function safeDivide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('safeDivide expects numbers');
  }
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0 || at === normalized.length - 1) {
    throw new Error('Invalid email format');
  }
  return normalized;
}

export function normalizeUserName(input) {
  if (typeof input !== 'string') {
    throw new Error('Le nom utilisateur doit être une chaîne de caractères');
  }

  const normalized = input.trim().replace(/\s+/g, ' ');

  if (normalized.length === 0) {
    throw new Error('Le nom utilisateur est vide après normalisation');
  }

  return normalized;
}

export function clamp(value, min, max) {
  if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
    throw new Error('clamp expects numbers');
  }
  if (min > max) {
    throw new Error('min cannot be greater than max');
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
