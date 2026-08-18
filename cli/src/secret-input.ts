import { stdin, stdout } from 'node:process';

export const normalizeSensitiveInput = (value: string): string => value.trim();

export const validatePrivateStoragePassword = (value: string): string => {
  const password = normalizeSensitiveInput(value);
  if (password.length < 16) {
    throw new Error('Private-state password must contain at least 16 characters');
  }
  return password;
};

export const promptForSensitiveInput = (prompt: string): Promise<string> => {
  if (!stdin.isTTY || !stdout.isTTY || stdin.setRawMode === undefined) {
    throw new Error('Sensitive input requires an interactive terminal');
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (result?: string, error?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      if (error !== undefined) reject(error);
      else resolve(normalizeSensitiveInput(result ?? value));
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') {
          finish(value);
          return;
        }
        if (character === '\u0003') {
          finish(undefined, new Error('Sensitive input cancelled'));
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    stdin.on('data', onData);
  });
};

export const getPrivateStoragePassword = async (): Promise<string> => {
  const configuredPassword = process.env.BUGSEAL_PRIVATE_STORAGE_PASSWORD;
  if (configuredPassword !== undefined) return validatePrivateStoragePassword(configuredPassword);
  return validatePrivateStoragePassword(
    await promptForSensitiveInput('Enter private-state storage password (16+ characters): '),
  );
};
