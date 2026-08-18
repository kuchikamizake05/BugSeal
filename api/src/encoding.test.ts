import { expect, it } from 'vitest';
import { digestReport, hex32, parseHex32 } from './encoding.js';

it('parses exactly 32 bytes of lowercase or uppercase hex', () => {
  expect(parseHex32('AA'.repeat(32))).toEqual(new Uint8Array(32).fill(0xaa));
});

it('rejects non-hex and wrong-length identifiers', () => {
  expect(() => parseHex32('zz'.repeat(32))).toThrow('Expected 64 hexadecimal characters');
  expect(() => parseHex32('aa')).toThrow('Expected 64 hexadecimal characters');
});

it('hashes report text locally without returning the text', () => {
  const digest = digestReport('private exploit details');
  expect(digest).toHaveLength(32);
  expect(hex32(digest)).not.toContain('private exploit details');
});
