import { createBugSealPrivateState, type BugSealPrivateState } from '../witnesses.js';

export const bytes = (fill: number): Uint8Array => new Uint8Array(32).fill(fill);

export const privateState = (
  maintainer: number,
  digest: number,
  salt: number,
): BugSealPrivateState => createBugSealPrivateState(bytes(maintainer), bytes(digest), bytes(salt));

export const hex = (value: Uint8Array): string =>
  Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
