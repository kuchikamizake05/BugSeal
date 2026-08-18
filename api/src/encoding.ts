import { createHash, randomBytes } from 'node:crypto';

const HEX_32 = /^[0-9a-fA-F]{64}$/;

export const parseHex32 = (value: string): Uint8Array => {
  if (!HEX_32.test(value)) throw new Error('Expected 64 hexadecimal characters');
  return Uint8Array.from(Buffer.from(value, 'hex'));
};

export const hex32 = (value: Uint8Array): string => {
  if (value.length !== 32) throw new Error('Expected exactly 32 bytes');
  return Buffer.from(value).toString('hex');
};

export const digestReport = (reportText: string): Uint8Array =>
  Uint8Array.from(createHash('sha256').update(reportText, 'utf8').digest());

export const randomSecret32 = (): Uint8Array => Uint8Array.from(randomBytes(32));
