#!/usr/bin/env node
// Wrapper for the sigil review harness. Parses flags, sets SIGIL_REVIEW_* variables and runs the
// `review` Playwright project. A wrapper is used because inline env vars differ between shells.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const env = { ...process.env };
const take = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (flag) => args.includes(flag);

if (has('--all')) env.SIGIL_REVIEW_SUBJECTS = 'all';
else if (take('--subject')) env.SIGIL_REVIEW_SUBJECTS = take('--subject');
else {
  console.error(
    'Usage: npm run sigil:review -- (--all | --subject <id[,id]>) [--seeds 1-8] [--widths 320,390] [--dressed] [--save-baseline]',
  );
  process.exit(2);
}
if (take('--seeds')) env.SIGIL_REVIEW_SEEDS = take('--seeds');
if (take('--widths')) env.SIGIL_REVIEW_WIDTHS = take('--widths');
if (has('--dressed')) env.SIGIL_REVIEW_DRESSED = '1';
if (has('--save-baseline')) env.SIGIL_REVIEW_SAVE_BASELINE = '1';

const result = spawnSync('npx', ['playwright', 'test', '--project=review', '--workers=1'], {
  stdio: 'inherit',
  env,
  shell: true,
});
process.exit(result.status ?? 1);
