import { HttpError } from './errors.js';

export const badRequest = (message) => new HttpError(400, message, 'VALIDATION');

export function text(value, label, { max = 160, required = true } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw badRequest(`${label} is required.`);
    return null;
  }
  const cleaned = String(value).trim();
  if (cleaned.length > max) throw badRequest(`${label} must be ${max} characters or fewer.`);
  return cleaned;
}

export function whole(value, label, { min = 0 } = {}) {
  if (value === undefined || value === null || value === '') {
    throw badRequest(`${label} is required.`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw badRequest(`${label} must be a whole number of at least ${min}.`);
  }
  return parsed;
}

export function identifier(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest(`${label} is invalid.`);
  }
  return parsed;
}

export function choice(value, allowed, label) {
  const normalised = String(value || '').toUpperCase();
  if (!allowed.includes(normalised)) {
    throw badRequest(`${label} must be one of: ${allowed.join(', ')}.`);
  }
  return normalised;
}
