import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Speech provider for Stop Motion UI that speaks through the Daxur repo's local Kokoro engine.
 * Uses the same CLI the daemon uses (`tts --engine kokoro`), so no cloud key is involved.
 */
const DAXUR_CLI = 'D:/code/Daxur-Daemon/cli/dist/index.js';

export function kokoroSpeech({ voice = 'af_heart' } = {}) {
  return {
    id: 'daxur-kokoro',
    version: '1',
    options: { voice },
    synthesize({ text, outputPath, signal }) {
      if (!existsSync(DAXUR_CLI)) throw new Error(`Daxur CLI not found at ${DAXUR_CLI}`);
      const args = [DAXUR_CLI, 'tts', text, '--engine', 'kokoro', '--voice', voice, '--no-daemon', '--out', outputPath];
      return new Promise((resolve, reject) => {
        const child = execFile(process.execPath, args, { windowsHide: true, timeout: 240_000 }, (error, stdout) => {
          if (error) return reject(error);
          // The CLI prints the path of the WAV it wrote as its first line.
          const written = String(stdout).split(/\r?\n/).find((line) => line.trim().endsWith('.wav'));
          resolve((written ?? outputPath).trim());
        });
        signal?.addEventListener('abort', () => child.kill(), { once: true });
      });
    },
  };
}
