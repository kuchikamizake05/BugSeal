import { expect, it } from 'vitest';
import { normalizeSensitiveInput, validatePrivateStoragePassword } from './secret-input.js';

it('requires a non-empty private-state password with at least 16 characters', () => {
  expect(() => validatePrivateStoragePassword('short')).toThrow('at least 16 characters');
  expect(validatePrivateStoragePassword('correct horse battery staple')).toBe(
    'correct horse battery staple',
  );
});

it('normalizes sensitive terminal input without writing it to output', () => {
  expect(normalizeSensitiveInput('  private report\r\n')).toBe('private report');
});
