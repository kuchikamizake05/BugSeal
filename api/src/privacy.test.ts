import { expect, it } from 'vitest';
import { redactSecrets } from './privacy.js';

it('redacts every Level 1 secret field', () => {
  expect(redactSecrets({ reportText: 'x', digest: 'y', salt: 'z', seed: 's' })).toEqual({
    reportText: '[REDACTED]',
    digest: '[REDACTED]',
    salt: '[REDACTED]',
    seed: '[REDACTED]',
  });
});
