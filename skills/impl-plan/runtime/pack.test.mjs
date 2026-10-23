// Run: node --test ~/.claude/skills/impl-plan/runtime/pack.test.mjs
// Each test starts from the bundled example, changes one thing, and runs pack.mjs as a child process.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packPath = path.join(here, 'pack.mjs');
const example = fs.readFileSync(path.join(here, '..', 'examples', 'scheduled-send.html'), 'utf8');

/** replace exactly one occurrence, so a test never runs on an unchanged example by accident */
const edit = (html, from, to) => {
  const n = typeof from === 'string' ? html.split(from).length - 1 : (html.match(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g')) || []).length;
  assert.equal(n, 1, `expected exactly one match for ${from}`);
  return html.replace(from, to);
};
const lineOf = (html, snippet) => html.slice(0, html.indexOf(snippet)).split('\n').length;
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pack-'));
/** write html into a fresh temp dir and run pack.mjs on it; returns exit code, stdout, stderr and the dir */
const run = (html, args = ['--lint-only']) => {
  const dir = tmpDir(); const file = path.join(dir, 'plan.html'); fs.writeFileSync(file, html);
  const r = spawnSync(process.execPath, [packPath, file, ...args.map((a) => a.replace('<tmp>', dir))], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr, dir };
};
const words = (n, w = 'word') => Array.from({ length: n }, (_, i) => `${w}${i}`).join(' ');
const ESCAPE = '은 태그로 읽혀 화면에서 사라진다';

test('should pass lint on the bundled example with no errors and no warnings', () => {
  const r = run(example);
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /[⚠✗]/);
  assert.match(r.out, /✓ lint clean\n/);
});

test('should not count agent-branch prose toward the word budget', () => {
  const prose = `<p>${words(45)}</p>` + Array.from({ length: 10 }, () => `<p>${words(38)}</p>`).join('');
  const r = run(edit(example, '<p>배경: 밤에 쓴 답장이 밤에 도착하지 않게 해 달라는 요청.</p>', `<p>배경: 밤에 쓴 답장이 밤에 도착하지 않게 해 달라는 요청.</p>${prose}`));
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /words of prose/);
  assert.doesNotMatch(r.out, /over 40 words/);
});

test('should report an error with the source line number for an unescaped generic such as `Promise<Header>` in a step placed after a multi-line `<script>` block', () => {
  const snippet = '<p>반환형은 Promise<Header>이다.</p>';
  const html = edit(example, '<h4>Step 5: 재시도</h4>', `<h4>Step 5: 재시도</h4>\n      ${snippet}`);
  assert.ok(html.lastIndexOf('</script>') < html.indexOf(snippet));
  const r = run(html);
  assert.equal(r.code, 1);
  assert.ok(r.out.includes(`line ${lineOf(html, snippet)}: \`<Header>\`${ESCAPE}`), r.out);
});

test('should report an error for `Pick<a, b>` in prose', () => {
  const html = edit(example, '<li>반복 발송은 없다. 메시지 하나에 시각 하나.</li>', '<li>반복 발송은 없다. Pick<a, b>로 고른다.</li>');
  const r = run(html);
  assert.equal(r.code, 1);
  assert.ok(r.out.includes(`line ${lineOf(html, 'Pick<a, b>')}: \`<a,>\`${ESCAPE}`), r.out);
});

test("should report an error for raw JSX inside a step's `<pre><code>`", () => {
  // <div> is a standard element, so only the <pre>/<code> rule catches it
  const html = edit(example, '&lt;SendLaterMenu onPick={(at) =&gt; scheduleDraft(draft, at)} /&gt;', 'return <div className="menu">{menu}</div>');
  const r = run(html);
  assert.equal(r.code, 1);
  const line = lineOf(html, 'return <div');
  assert.ok(r.out.includes(`line ${line}: \`<div>\`${ESCAPE}`), r.out);
  assert.ok(r.out.includes(`line ${line}: \`</div>\`${ESCAPE}`), r.out);
});

test('should not report generics inside `<script type="text/plain">`, `<template>`, `<style>` or HTML comments', () => {
  const inert = [
    '<!-- Promise<Header> and Pick<a, b> -->',
    '<style>\n/* Foo<P> */\n</style>',
    '<template id="inert"><Foo>bar</Foo></template>',
    '<script type="text/plain">\nconst m: Map<Key, Value> = new Map();\n</script>',
  ].join('\n');
  const r = run(edit(example, '<!-- ═════ 1 ═════ -->', `${inert}\n<!-- ═════ 1 ═════ -->`));
  assert.equal(r.code, 0, r.out);
  assert.ok(!r.out.includes(ESCAPE), r.out);
});

test('should report an error when a required agent branch such as `aux="tests"` is missing', () => {
  const r = run(edit(example, /<doc-claim aux="tests">[\s\S]*?<\/doc-claim>\n/, ''));
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ no <doc-claim aux="tests">/);
});

test('should report an error when an agent branch appears twice', () => {
  const r = run(edit(example, /<doc-claim aux="risks">[\s\S]*?<\/doc-claim>\n/, (m) => m + m));
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ <doc-claim aux="risks"> appears 2 times/);
});

test('should report an error when a step id is not `step-<number>`', () => {
  const r = run(edit(example, '<li id="step-6">', '<li id="step-six">'));
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ line \d+: step id="step-six" — use id="step-N"/);
});

test('should report an error when a step `<li>` in `ul.steps` has no id', () => {
  const r = run(edit(example, '<li id="step-6">', '<li>'));
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ line \d+: a step <li> in ul\.steps has no id/);
});

test('should report an error for a `doc-*` block inside an agent branch', () => {
  const r = run(edit(example, '<p>Risks: 시각대와 중복 발송.</p>', '<p>Risks: 시각대와 중복 발송.</p><doc-code lang="ts"><script type="text/plain">let a = 1;</script></doc-code>'));
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ line \d+: <doc-code> inside <doc-claim aux="risks">/);
});

test('should report an error when the leading status comment lacks `risk-surface:`', () => {
  const r = run(edit(example, 'risk-surface: db-schema\n', ''));
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ status block .* has no risk-surface: line/);
});

test("should report an error when a tree node's `steps` names a step that does not exist", () => {
  const r = run(edit(example, '<doc-claim steps="6">', '<doc-claim steps="6 9">'));
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ line \d+: steps="6 9" names step 9, but there is no id="step-9"/);
});

test("should warn when a step is not named by any tree node's `steps`", () => {
  const r = run(edit(example, '<doc-claim steps="6">', '<doc-claim>'));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /⚠ step-6 is not named by any tree node's steps=/);
});

test('should report an error when a plan is packed without `-o`', () => {
  const r = run(example, []);
  assert.equal(r.code, 1);
  assert.ok(r.out.includes('✗ 계획서는 `-o`로 레포 밖에 묶는다'), r.out);
  assert.ok(!fs.existsSync(path.join(r.dir, 'plan.packed.html')));
});

test('should not emit ASD-STE100 warnings for English prose', () => {
  // English prose goes in aux="scope": agent branches are left out of the word checks
  const r = run(edit(example, '<li>반복 발송은 없다. 메시지 하나에 시각 하나.</li>', "<li>We utilize it. It doesn't change. The row has been sent by the worker. We should verify it.</li>"));
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /ASD-STE100/);
});

test('should keep the leading status comment at the top of the packed output', () => {
  const r = run(example, ['-o', '<tmp>/out.html']);
  assert.equal(r.code, 0, r.out);
  const packed = fs.readFileSync(path.join(r.dir, 'out.html'), 'utf8');
  assert.ok(packed.startsWith('<!--\nstatus: active\ndate: 2026-10-23\nrisk-surface: db-schema\n'), packed.slice(0, 120));
  assert.match(packed, /<script data-htmlplan>/);
});

test('should report next, blocked, undecided and unresolved with `--status` whatever the attribute order, quoting or line breaks of the tags', () => {
  let html = example;
  html = edit(html, '<ul class="steps">', `<ul data-k="v"\n      class='steps'>`);
  html = edit(html, '<li id="step-1">', `<li\n      class='done' id=step-1>`);
  html = edit(html, '<li id="step-2">', `<li data-x="1" id='step-2'\n      class="x done">`);
  html = edit(html, '<h4>Step 3: 예약 저장 라우트와 메뉴</h4>', '<h4>Step 3: 예약 저장 라우트와 메뉴</h4>\n      <p><b>BLOCKED:</b> 세션 API 대기</p>');
  html = edit(html, '<doc-ask id="retry">', `<doc-ask\n      neutral id='retry' data-decided=2026-10-24>`);
  html = edit(html, '</tbody>', `<tr><td>a</td><td>HIGH</td><td>UNRESOLVED</td><td>b</td></tr>\n<tr><td>c<td>HIGH<td> <code>UNRESOLVED</code>\n<tr><td>d</td><td>LOW</td><td>REJECTED (was UNRESOLVED)</td><td>e</td></tr>\n</tbody>`);
  const r = run(html, ['--status']);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(JSON.parse(r.out), { status: 'active', steps: { total: 6, done: 2, next: 'step-3', blocked: ['step-3'] }, undecided: 0, unresolved: 2 });
});

test('should exit 2 with `--status` when the file cannot be read or has no `<doc-plan>`', () => {
  const missing = spawnSync(process.execPath, [packPath, path.join(tmpDir(), 'nope.html'), '--status'], { encoding: 'utf8' });
  assert.equal(missing.status, 2);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /nope\.html: cannot read/);
  const r = run('<!doctype html><html><title>x</title><body><p>no plan</p></body></html>', ['--status']);
  assert.equal(r.code, 2);
  assert.equal(r.out, '');
  assert.match(r.err, /no <doc-plan>/);
});

test('should report an error when the steps branch has no step', () => {
  const r = run(edit(example, '<ul class="steps">', '<ul class="list">'));
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ line \d+: <doc-claim aux="steps"> has no <ul class="steps"> with a step <li>/);
});

test('should create the `-o` output folder when it does not exist', () => {
  const r = run(example, ['-o', '<tmp>/a/b/out.html']);
  assert.equal(r.code, 0, r.out);
  assert.ok(fs.readFileSync(path.join(r.dir, 'a', 'b', 'out.html'), 'utf8').startsWith('<!--\nstatus: active'));
});

test('should exit 2 with `--status` when the steps branch has no step', () => {
  const r = run(edit(example, '<ul class="steps">', '<ul class="list">'), ['--status']);
  assert.equal(r.code, 2);
  assert.equal(r.out, '');
  assert.match(r.err, /no step <li>/);
});

test('should count a review row whose cell starts with UNRESOLVED', () => {
  const html = edit(example, '</tbody>', '<tr><td>a</td><td>HIGH</td><td>UNRESOLVED (3회차 정지)</td><td>b</td></tr>\n<tr><td>c</td><td>LOW</td><td>REJECTED (was UNRESOLVED)</td><td>d</td></tr>\n</tbody>');
  const r = run(html, ['--status']);
  assert.equal(r.code, 0, r.err);
  assert.equal(JSON.parse(r.out).unresolved, 1);
});

test('should exit 2 with --status when a step has no step-N id', () => {
  for (const li of ['<li>', '<li id="s1">']) {
    const r = run(edit(example, '<li id="step-1">', li), ['--status']);
    assert.equal(r.code, 2, `${li}: ${r.out}`);
    assert.equal(r.out, '');
    assert.match(r.err, /step-N/);
  }
});
