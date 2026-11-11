// Run: node --test ~/.claude/hooks/inject-fable-ownership.test.mjs
// Each test pipes hook inputs into the script and reads what the last one would add to context.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const hookPath = path.join(here, 'inject-fable-ownership.sh');
const SENTENCE = "This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-hook-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

// Stand-in for `ps`, so a test can say when the parent process started. Like the real one,
// it answers only for the PID asked about and renders the time in the caller's time zone.
const fakeBin = path.join(tmp, 'bin');
fs.mkdirSync(fakeBin);
fs.writeFileSync(
  path.join(fakeBin, 'ps'),
  [
    '#!/bin/sh',
    'while [ $# -gt 0 ]; do [ "$1" = "-p" ] && pid=$2; shift; done',
    'if [ "$pid" = "$FAKE_PARENT" ] && [ -n "$FAKE_STARTED" ]; then echo "$FAKE_STARTED ${TZ:-local}"; fi',
    '',
  ].join('\n'),
  { mode: 0o755 },
);

/**
 * Run the hook once per step, in order, under one parent shell that stands in for one
 * Claude Code process; returns the last run's exit code and trimmed stdout.
 * A step is { stdin, started?, tz? }: `started` is the start time `ps` reports for the parent
 * ('' when it reports none), `tz` the time zone the hook runs in.
 */
const runSteps = (steps) => {
  const env = { ...process.env, HOOK: hookPath, TMPDIR: tmp };
  if (steps.some((s) => s.started !== undefined)) env.PATH = `${fakeBin}${path.delimiter}${process.env.PATH}`;
  const commands = steps.map((step, i) => {
    const file = path.join(tmp, `in-${process.hrtime.bigint()}-${i}.json`);
    fs.writeFileSync(file, step.stdin);
    // `$$` is the parent shell, the PID the hook sees as $PPID.
    const started = step.started !== undefined ? `FAKE_PARENT=$$ FAKE_STARTED='${step.started}' ` : '';
    const tz = step.tz !== undefined ? `TZ='${step.tz}' ` : '';
    return `${started}${tz}bash "$HOOK" < "${file}"${i < steps.length - 1 ? ' > /dev/null' : ''}; rc=$?`;
  });
  // The trailing `exit` keeps the parent shell from exec-ing the last hook run.
  const r = spawnSync('bash', ['-c', `${commands.join('; ')}; exit $rc`], { encoding: 'utf8', env });
  return { status: r.status, stdout: r.stdout.trim() };
};
const run = (...stdins) => runSteps(stdins.map((stdin) => ({ stdin })));
const runJson = (...inputs) => run(...inputs.map((input) => JSON.stringify(input)));

test('should print the sentence when a session starts on Fable 5.2', () => {
  const r = runJson({ hook_event_name: 'SessionStart', source: 'startup', model: 'claude-fable-5-2' });
  assert.deepEqual(r, { status: 0, stdout: SENTENCE });
});

test('should print the sentence when the session switches to Fable 5.2', () => {
  const r = runJson({ hook_event_name: 'PostModelSwitch', from_model: 'claude-opus-5-5', to_model: 'claude-fable-5-2[1m]', source: 'picker' });
  assert.deepEqual(r, { status: 0, stdout: SENTENCE });
});

test('should print nothing when the session switches away from Fable 5.2', () => {
  const r = runJson({ hook_event_name: 'PostModelSwitch', from_model: 'claude-fable-5-2', to_model: 'claude-opus-5-5', source: 'command' });
  assert.deepEqual(r, { status: 0, stdout: '' });
});

test('should print nothing for another Fable version whose id only starts the same way', () => {
  for (const model of ['claude-fable-5', 'claude-fable-5-1', 'claude-fable-5-20261101', 'claude-fable-5-25']) {
    const r = runJson({ hook_event_name: 'SessionStart', source: 'startup', model });
    assert.deepEqual(r, { status: 0, stdout: '' }, model);
  }
});

test('should print the sentence on a start that omits the model after the same process switched to Fable 5.2', () => {
  const r = runJson(
    { hook_event_name: 'SessionStart', source: 'startup', model: 'claude-sonnet-5-5' },
    { hook_event_name: 'PostModelSwitch', from_model: 'claude-sonnet-5-5', to_model: 'claude-fable-5-2', source: 'command' },
    { hook_event_name: 'SessionStart', source: 'clear' },
  );
  assert.deepEqual(r, { status: 0, stdout: SENTENCE });
});

test('should print nothing on a start that omits the model after the same process switched away from Fable 5.2', () => {
  const r = runJson(
    { hook_event_name: 'SessionStart', source: 'startup', model: 'claude-fable-5-2' },
    { hook_event_name: 'PostModelSwitch', from_model: 'claude-fable-5-2', to_model: 'claude-sonnet-5-5', source: 'command' },
    { hook_event_name: 'SessionStart', source: 'clear' },
  );
  assert.deepEqual(r, { status: 0, stdout: '' });
});

test('should print nothing on a start that omits the model in another process', () => {
  runJson({ hook_event_name: 'SessionStart', source: 'startup', model: 'claude-fable-5-2' });
  const r = runJson({ hook_event_name: 'SessionStart', source: 'clear' });
  assert.deepEqual(r, { status: 0, stdout: '' });
});

test('should print nothing on a start that omits the model in a later process that reuses the PID', () => {
  const r = runSteps([
    { started: 'Wed Nov 11 09:00:00 2026', stdin: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', model: 'claude-fable-5-2' }) },
    { started: 'Wed Nov 11 09:30:00 2026', stdin: JSON.stringify({ hook_event_name: 'SessionStart', source: 'resume' }) },
  ]);
  assert.deepEqual(r, { status: 0, stdout: '' });
});

test('should print the sentence on a start that omits the model when the parent PID and start time are unchanged', () => {
  const started = 'Wed Nov 11 09:00:00 2026';
  const r = runSteps([
    { started, stdin: JSON.stringify({ hook_event_name: 'PostModelSwitch', from_model: 'claude-sonnet-5-5', to_model: 'claude-fable-5-2', source: 'command' }) },
    { started, stdin: JSON.stringify({ hook_event_name: 'SessionStart', source: 'clear' }) },
  ]);
  assert.deepEqual(r, { status: 0, stdout: SENTENCE });
});

test('should print the sentence on a start that omits the model after the time zone changes', () => {
  const started = 'Wed Nov 11 09:00:00 2026';
  const r = runSteps([
    { started, tz: 'Asia/Seoul', stdin: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', model: 'claude-fable-5-2' }) },
    { started, tz: 'America/New_York', stdin: JSON.stringify({ hook_event_name: 'SessionStart', source: 'clear' }) },
  ]);
  assert.deepEqual(r, { status: 0, stdout: SENTENCE });
});

test('should print nothing on a start that omits the model when the parent start time is unavailable', () => {
  const r = runSteps([
    { started: '', stdin: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', model: 'claude-fable-5-2' }) },
    { started: '', stdin: JSON.stringify({ hook_event_name: 'SessionStart', source: 'clear' }) },
  ]);
  assert.deepEqual(r, { status: 0, stdout: '' });
});

test('should print nothing and exit 0 when the input names no model or is not JSON', () => {
  assert.deepEqual(runJson({ hook_event_name: 'SessionStart', source: 'clear' }), { status: 0, stdout: '' });
  assert.deepEqual(run('not json'), { status: 0, stdout: '' });
});
