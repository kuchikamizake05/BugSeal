export const SECRET_FIELD_NAMES = [
  'reportText',
  'digest',
  'salt',
  'maintainerSecret',
  'seed',
  'walletSeed',
  'storagePassword',
] as const;

export const redactSecrets = (input: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      (SECRET_FIELD_NAMES as readonly string[]).includes(key) ? '[REDACTED]' : value,
    ]),
  );
