import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashSecret(plainText) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(String(plainText), salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifySecret(plainText, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash.startsWith('scrypt$')) return false;
  const [, salt, digest] = storedHash.split('$');
  if (!salt || !digest) return false;

  const expected = Buffer.from(digest, 'hex');
  const actual = await scrypt(String(plainText), salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
