// CI step: decide which browser specs this run needs and publish the choice as step outputs.
// Full suite on main, on manual runs, and whenever the diff cannot be determined.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync } from 'node:fs';
import { selectE2e, type Selection } from './e2e-selection';

const env = process.env;
const zero = /^0+$/;
const specs = readdirSync('tests/e2e')
  .filter((f) => f.endsWith('.spec.ts'))
  .map((f) => `tests/e2e/${f}`);

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const changedSince = (base: string) =>
  git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);

function decide(): { selection: Selection; range: string } {
  const full = (reason: string) => ({ selection: selectE2e([], specs), range: reason });
  if (env.EVENT_NAME === 'workflow_dispatch' || env.EVENT_NAME === 'schedule')
    return full(`Run ${env.EVENT_NAME}: semua spec.`);
  if (env.GIT_REF === 'refs/heads/main') return full('Push ke main: semua spec.');
  try {
    let base = env.EVENT_NAME === 'pull_request' ? env.BASE_SHA : env.BEFORE_SHA;
    // A new branch has no "before"; compare with where it left main instead.
    if (!base || zero.test(base)) base = git('merge-base', 'origin/main', 'HEAD');
    else git('cat-file', '-e', `${base}^{commit}`);
    const changed = changedSince(base);
    return {
      selection: selectE2e(changed, specs),
      range: `${base.slice(0, 7)}...HEAD, ${changed.length} file`,
    };
  } catch (error) {
    return full(`Perubahan tidak dapat ditentukan (${(error as Error).message.split('\n')[0]}): semua spec.`);
  }
}

const { selection, range } = decide();
// Full mode passes no paths, so `playwright test` keeps its own discovery of every spec.
const outputs = {
  mode: selection.mode,
  specs: selection.mode === 'partial' ? selection.specs.join(' ') : '',
  webkit_menu: String(selection.mode === 'full' || selection.specs.includes('tests/e2e/menu-focus.spec.ts')),
  webkit_drawings: String(
    selection.mode === 'full' || selection.specs.includes('tests/e2e/drawings.spec.ts'),
  ),
};
const summary = [
  `### Browser tests: ${selection.mode}`,
  '',
  `- Rentang: ${range}`,
  ...selection.reasons.map((r) => `- ${r}`),
  '',
  selection.mode === 'none'
    ? 'Tidak ada spec browser yang dijalankan.'
    : `Spec (${selection.specs.length} dari ${specs.length}):\n\n${selection.specs.map((s) => `- \`${s}\``).join('\n')}`,
].join('\n');
console.log(summary);
if (env.GITHUB_OUTPUT)
  appendFileSync(
    env.GITHUB_OUTPUT,
    Object.entries(outputs)
      .map(([k, v]) => `${k}=${v}\n`)
      .join(''),
  );
if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary + '\n');
