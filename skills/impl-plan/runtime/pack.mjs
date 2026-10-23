#!/usr/bin/env node
// pack.mjs — lint an artifact and inline everything into one portable .html
// Adapted from anthropics/claude-plugins-community html-plan @06ec7b6 (MIT); modified for impl-plan specs — see NOTICE.md.
//   node pack.mjs page.html [-o out.html] [--root dir] [--lint-only] [--quiet] [--artifact]
//   node pack.mjs plan.html --status   → one JSON line: status, steps {total, done, next, blocked}, undecided, unresolved
// Lint runs the same parsers the browser uses (from htmlplan.js), fills <doc-code src>
// from disk, inlines htmlplan.css/js and local images, and refuses to write on errors.
import { readFileSync, writeFileSync, existsSync, statSync, realpathSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, extname, basename, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
require('./htmlplan.js'); // registers globalThis.HtmlPlan (no DOM → parsers only)
const NW = globalThis.HtmlPlan;

const argv = process.argv.slice(2);
const input = argv.find((a) => !a.startsWith('-') && (argv.indexOf(a) === 0 || !['-o', '--root', '--out'].includes(argv[argv.indexOf(a) - 1])));
if (!input) { console.error('usage: node pack.mjs page.html [-o out.html] [--root dir] [--lint-only]'); process.exit(2); }
const opt = (n, d) => { const i = argv.findIndex((a) => a === n); return i >= 0 ? argv[i + 1] : d; };
const lintOnly = argv.includes('--lint-only'); const quiet = argv.includes('--quiet');
const inPath = resolve(input); const baseDir = dirname(inPath);
const roots = argv.flatMap((a, i) => a === '--root' ? [resolve(argv[i + 1].replace(/^~(?=\/)/, process.env.HOME))] : []); if (!roots.length) roots.push(baseDir); const root = roots[0];
const outPath = resolve(opt('-o', opt('--out', inPath.replace(/(\.src)?\.html?$/, '') + (inPath.includes('.src.') ? '.html' : '.packed.html'))));

const statusMode = argv.includes('--status');
let html; try { html = readFileSync(inPath, 'utf8'); } catch (e) { if (!statusMode) throw e; console.error(`${input}: cannot read — ${e.message}`); process.exit(2); }
const source = html;   // the file as written, before <doc-code src> excerpts are filled in
const errors = [], warns = [], info = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);
const lineOf = (idx) => html.slice(0, idx).split('\n').length;
const attrs = (s) => { const o = {}; s.replace(/([\w:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g, (m, k, a, b, c) => { o[k.toLowerCase()] = a ?? b ?? c ?? ''; return ''; }); return o; };
const unent = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const blockSrc = (inner) => { const m = inner.match(/<script\s+type=["']?text\/(?:plain|source)["']?\s*>([\s\S]*?)<\/script>/i); return NW.util.dedent(m ? m[1] : unent(inner.replace(/<doc-pin[\s\S]*?<\/doc-pin>|<template[\s\S]*?<\/template>|<[^>]+>/g, ''))); };
// Everything pack reads ends up inside a page that may be published, so reads are fenced: a file must really live (symlinks resolved)
// under a --root, the page's own folder, or the runtime's folder, and must not be a well-known secret file. Anything else is an error.
const real = (p) => { try { return realpathSync(p); } catch { return null; } };
const FENCE = [...new Set([...roots, baseDir, here])].map(real).filter(Boolean);
const inside = (f) => FENCE.some((d) => f === d || f.startsWith(d.endsWith(sep) ? d : d + sep));
const SECRET_NAME = new RegExp([
  String.raw`(^|[\\/])\.(git|ssh|aws|azure|gnupg|kube|docker|password-store)([\\/]|$)`,                        // whole folders
  String.raw`(^|[\\/])(\.env(\.[^\\/]*)?|\.netrc|\.npmrc|\.yarnrc(\.yml)?|\.pypirc|\.pgpass|\.my\.cnf|\.git-credentials|\.htpasswd)$`,
  String.raw`(^|[\\/])(id_(rsa|dsa|ecdsa|ed25519)[^\\/]*|credentials[^\\/]*|secrets?(\.[^\\/]*)?|[^\\/]*_history|[^\\/]*\.local\.json)$`,
  String.raw`\.(pem|key|p12|pfx|keystore|jks|tfvars|tfstate(\.backup)?|sqlite3?|db|kdbx|ovpn)$`,
].join('|'), 'i');
const SECRET_TEXT = /sk-ant-|sk-[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[abeprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.|(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)["']?\s*[:=]\s*["'][^"'\s$<{]{12,}["']/i;
const reads = new Set();   // every file whose text ends up in the page
const refused = new Set();
const findFile = (p) => { for (const cand of [...roots.map((r) => resolve(r, p)), resolve(baseDir, p)]) { if (!existsSync(cand) || !statSync(cand).isFile()) continue; const f = real(cand);
    if (!f || !inside(f)) { if (!refused.has(p)) { refused.add(p); err(`"${p}" is outside --root and the page's folder — not reading it. Pass --root <dir> for the checkout it lives in`); } continue; }
    if (SECRET_NAME.test(f)) { if (!refused.has(p)) { refused.add(p); err(`"${p}" looks like a secrets file — not reading it`); } continue; }
    return f; } return null; };
/** read a file at a git ref: tries `git show ref:path` in each --root that is a git checkout */
// Only two plumbing commands are ever run: `rev-parse` and `cat-file blob`. Neither touches the work tree, so no filter, hook, fsmonitor,
// pager, diff or credential program named in a repo's config can be started. (`status`, `diff` and `show` can start one, so they are not used.)
const git = (r, cmd, ...args) => { if (cmd !== 'rev-parse' && cmd !== 'cat-file') throw new Error('git ' + cmd + ' is not allowed'); return execFileSync('git', ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-C', r, cmd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64e6, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat' } }); };
/** short sha of the --root checkout a file sits in (+wt when the file has uncommitted changes); '' when it is not under a root or not in git */
const stamp = (f, wt) => { for (const r of roots) { const rr = real(r); if (!rr || !(f === rr || f.startsWith(rr + sep))) continue; try { const top = git(rr, 'rev-parse', '--short', 'HEAD').trim(); let same = true; if (wt) { try { same = git(rr, 'cat-file', 'blob', `HEAD:${relative(rr, f).split(sep).join('/')}`) === readFileSync(f, 'utf8'); } catch { same = false; } } return top + (same ? '' : '+wt'); } catch {} } return ''; };
const REF_OK = /^[A-Za-z0-9][\w.\/^~@{}-]*$/;
const gitShow = (ref, p) => { if (!REF_OK.test(ref) || /(^|\/)\.\.(\/|$)/.test(p) || p.startsWith('/') || p.startsWith('-') || SECRET_NAME.test(p)) { if (!refused.has(ref + ':' + p)) { refused.add(ref + ':' + p); err(`ref="${ref}" with "${p}" — not a plain git ref and a path inside the repo; not running git`); } return null; }
  for (const r of roots) { try { return { text: git(r, 'cat-file', 'blob', `${ref}:${p}`), where: `${r}@${ref}` }; } catch {} } return null; };
const wc = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const stripTags = (t) => t.replace(/<[^>]+>/g, ' ');

/* ── impl-plan specs: status block, agent branches, steps ── */
// The branches an agent reads; each maps 1:1 to a section of a markdown spec, so each must appear exactly once.
const AGENT_BRANCHES = ['background', 'files', 'dependents', 'steps', 'tests', 'risks', 'verify', 'review'];
const isAgentBranch = (a) => AGENT_BRANCHES.includes(a.aux);
const STEP_ID = /^step-\d+[A-Za-z]*$/;   // "9a" suffixes allow a step inserted between two numbered ones
// Blank out text the browser never shows as markup. Each region keeps only its newlines, so a line count on the result is a source line number.
const maskInert = (s) => s.replace(/<!--[\s\S]*?-->|<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (m) => m.replace(/[^\n]/g, ''));
/** body of the HTML comment that opens the file (the status block), or null */
const statusComment = (s) => { const m = s.match(/^<!--([\s\S]*?)-->/); return m ? m[1] : null; };
const statusField = (c, k) => { const m = c && c.match(new RegExp(`^\\s*${k}:[ \\t]*(.*)$`, 'm')); return m ? m[1].trim() : null; };
/** doc-claims (with their inner ranges), agent branches by aux, and the direct <li> children of ul.steps in the steps branch — all on masked text */
const planParts = (m) => {
  const claims = [], stack = [];
  for (const t of m.matchAll(/<(\/?)doc-claim\b([^>]*)>/gi)) {
    if (!t[1]) { const c = { a: attrs(t[2]), at: t.index, start: t.index + t[0].length, end: m.length }; claims.push(c); stack.push(c); }
    else if (stack.length) stack.pop().end = t.index; }
  const branches = {}; for (const c of claims) if (isAgentBranch(c.a)) (branches[c.a.aux] ||= []).push(c);
  const steps = []; const sb = branches.steps?.[0];
  if (sb) { const body = m.slice(sb.start, sb.end);
    const ul = [...body.matchAll(/<ul\b([^>]*)>/gi)].find((u) => (attrs(u[1]).class || '').split(/\s+/).includes('steps'));
    if (ul) { const re = /<(\/?)(ul|ol|li)\b([^>]*)>/gi; re.lastIndex = ul.index + ul[0].length; let depth = 1, cur = null, t;
      const close = (i) => { if (cur) { cur.body = body.slice(cur.bodyStart, i); cur = null; } };   // </li> is optional in HTML: the next <li> or </ul> ends a step too
      while (depth > 0 && (t = re.exec(body))) { const tag = t[2].toLowerCase();
        if (tag === 'li') { if (depth !== 1) continue; close(t.index); if (!t[1]) { cur = { a: attrs(t[3]), at: sb.start + t.index, bodyStart: t.index + t[0].length }; steps.push(cur); } }
        else if (t[1]) { depth--; if (!depth) close(t.index); } else depth++; }
      close(body.length); } }
  return { claims, branches, steps };
};
const stepState = (s) => { const h = s.body.search(/<\/h4\s*>/i); const p = h < 0 ? null : s.body.slice(h).match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return { id: s.a.id, done: (s.a.class || '').split(/\s+/).includes('done'), blocked: !!p && unent(stripTags(p[1])).trim().startsWith('BLOCKED:') }; };

if (statusMode) {   // read-only: no lint, no pack
  const masked = maskInert(html);
  if (!/<doc-plan\b/i.test(masked)) { console.error(`${input}: no <doc-plan> — not an HTML plan`); process.exit(2); }
  const { branches, steps } = planParts(masked); const st = steps.map(stepState);
  if (!st.length) { console.error(`${input}: no step <li> in a <ul class="steps"> of <doc-claim aux="steps"> — progress cannot be read`); process.exit(2); }
  { const bad = st.find((s) => !STEP_ID.test(s.id || '')); if (bad) { console.error(`${input}: a step <li> in <ul class="steps"> has ${bad.id ? `id="${bad.id}"` : 'no id'}, not id="step-N" — progress cannot be read`); process.exit(2); } }
  let unresolved = 0; const rv = branches.review?.[0];
  if (rv) for (const r of masked.slice(rv.start, rv.end).matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/table>|$)/gi))
    if ([...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)(?=<\/?t[dhr]\b|$)/gi)].some((c) => /^UNRESOLVED\b/.test(unent(stripTags(c[1])).trim()))) unresolved++;
  const undecided = [...masked.matchAll(/<doc-ask\b([^>]*)>/gi)].filter((t) => !('data-decided' in attrs(t[1]))).length;
  console.log(JSON.stringify({ status: statusField(statusComment(html), 'status'), steps: { total: st.length, done: st.filter((s) => s.done).length, next: st.find((s) => !s.done)?.id ?? null, blocked: st.filter((s) => s.blocked).map((s) => s.id) }, undecided, unresolved }));
  process.exit(0);
}

/* ── document-level checks ── */
if (!/<title>[^<]+<\/title>/i.test(html)) err('missing <title> — it names the artifact in tabs and share sheets');
if (!/<h1[\s>]/i.test(html)) warn('no <h1> — the response header uses it');
if (!/<meta[^>]+charset/i.test(html)) warn('missing <meta charset="utf-8">');
if (!/htmlplan\.css/.test(html) && !/<style[^>]*data-htmlplan/.test(html)) err('htmlplan.css is not linked — add <link rel="stylesheet" href="…/htmlplan.css">');
if (!/htmlplan\.js/.test(html) && !/<script[^>]*data-htmlplan/.test(html)) err('htmlplan.js is not included — add <script src="…/htmlplan.js" defer></script>');
const KNOWN = new Set(['doc-code', 'doc-pin', 'doc-flow', 'doc-seq', 'doc-schema', 'doc-tree', 'doc-calls', 'doc-machine', 'doc-mock', 'doc-shot', 'doc-quote', 'doc-ask', 'doc-note', 'doc-draft', 'doc-plan', 'doc-claim', 'doc-changes']);
for (const m of html.matchAll(/<(doc-[a-z]+)\b/g)) if (!KNOWN.has(m[1])) err(`line ${lineOf(m.index)}: unknown element <${m[1]}> — known: ${[...KNOWN].join(' ')}`);
const ids = {}; for (const m of html.matchAll(/\sid=["']([^"']+)["']/g)) { if (ids[m[1]]) err(`duplicate id="${m[1]}" (lines ${ids[m[1]]} and ${lineOf(m.index)})`); ids[m[1]] = lineOf(m.index); }
for (const m of html.matchAll(/href=["']#([^"']+)["']/g)) if (!ids[m[1]] && !/^s\d+/.test(m[1])) warn(`line ${lineOf(m.index)}: href="#${m[1]}" points at no id`);

{ const t = html.match(/<div class="tldr">([\s\S]*?)<\/div>/i); if (t && wc(stripTags(t[1])) > 50) warn(`.tldr is ${wc(stripTags(t[1]))} words — ≤ 40: what changes, and what you need from the reader`); }
{ const ti = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '', h1 = stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ''); const nums = (x) => (x.match(/\d[\d,.]*/g) || []).join(' '); if (ti && h1 && nums(ti) && nums(h1) && nums(ti) !== nums(h1)) warn(`<title> "${ti.trim()}" and <h1> "${h1.trim()}" disagree on a number — the title is what the response is filed under`); }

/* ── per-block checks (and <doc-code src> fill) ── */
const names = new Set(); const quoteSeen = new Map(); let lastAskEnd = -1;
html = html.replace(/<(doc-(?!plan\b|claim\b)[a-z]+)\b([^>]*)>([\s\S]*?)<\/\1>/g, (whole, tag, rawAttrs, inner, idx) => {
  const a = attrs(rawAttrs); const at = `line ${lineOf(idx)} <${tag}${a.id ? '#' + a.id : ''}>`;
  try {
    for (const k of ['caption', 'label', 'title']) if (/[<>]/.test(a[k] || '')) err(`${at}: ${k}="…" contains < or > — use &lt; / &gt; (or ‹ ›) inside attributes`);
    if (/^doc-(flow|seq|schema|tree|calls|machine)$/.test(tag) && !/<script\s+type=["']?text\/(plain|source)/i.test(inner)) { const bare = inner.replace(/<template[\s\S]*?<\/template>|<doc-pin[\s\S]*?<\/doc-pin>/g, ''); const mm = bare.match(/<(?!!--)[^\s>]*/); if (mm) err(`${at}: source contains "${mm[0]}" — the browser will eat it as a tag. Wrap the block's text in <script type="text/plain">…</script> (then < > and <-> are safe)`); }
    if (tag === 'doc-flow') { const m = NW.parseFlow(blockSrc(inner)); m.errors.forEach((e) => err(`${at}: ${e}`)); const n = m.order.length; if (!n) err(`${at}: no nodes`); if (n > 16) warn(`${at}: ${n} nodes — diagrams past ~12 stop being readable; split it or cut nodes`); Object.values(m.nodes).forEach((nd) => nd.label.split(/\s+/).forEach((w) => { if (w.length > 24) warn(`${at}: node "${nd.id}" has a ${w.length}-char word ("${w.slice(0, 20)}…") — it will force wide boxes; shorten or add a space`); })); if (!a.caption) warn(`${at}: no caption="" — say what the reader should notice`);
      Object.values(m.nodes).forEach((nd) => { if ((nd.sub || '').length > 48) warn(`${at}: node "${nd.id}" sublabel is ${nd.sub.length} chars — it wraps to two lines max (~24 each); move the rest to indented detail`); });
      m.edges.forEach((e) => { if ((e.label || '').length > 44) warn(`${at}: edge ${e.from}->${e.to} label is ${e.label.length} chars (two lines of ~22 max) — shorten or explain in the caption`); });
      if (m.edges.some((e) => e.dash) && !a.dashed) warn(`${at}: uses --> but no dashed="…" — the legend will say "async / optional"; set dashed="what dashed means here"`);
      const cols = Math.max(0, ...m.grid.map((r) => r.length)); if (cols >= 4) warn(`${at}: ${cols}-column grid — on a phone this scales to ~50% and pans; ≤3 columns (tall not wide) reads without zooming`);
      else { const L = NW.layoutFlow(m); const scale = Math.min(1, 348 / L.W); if (scale < 0.72) { const widest = Object.values(m.nodes).flatMap((nd) => [...(nd.lines || []), ...(nd.subLines || [])]).sort((x, y) => y.length - x.length)[0] || ''; warn(`${at}: ≈${L.W}px wide → ${Math.round(scale * 100)}% on a phone. Node width is set by the longest label line, here "${widest}" (${widest.length}ch) — shorten it / move to indented detail, or drop a column`); } } }
    else if (tag === 'doc-seq') { const m = NW.parseSeq(blockSrc(inner)); m.errors.forEach((e) => err(`${at}: ${e}`)); if (!a.caption) warn(`${at}: no caption="" — say what the reader should notice`); if (m.actors.length >= 5) warn(`${at}: ${m.actors.length} participants — a phone shows ~3 lanes without panning; split at a --- divider or fold a minor participant into a note`); if (!m.steps.length) err(`${at}: no messages`);
      m.steps.forEach((st) => { if (st.kind === 'msg' && (st.text || '').length > 60) warn(`${at}: message "${st.text.slice(0, 30)}…" is ${st.text.length} chars — arrows carry a call, not a sentence; move detail to a note or prose`); });
      m.actors.forEach((ac) => { if (ac.label.length > 28) warn(`${at}: participant "${ac.label}" is long — ≤18 chars keeps lanes narrow`); });
      { const longestA = Math.max(...m.actors.map((ac) => Math.min(ac.label.length, ac.label.length > 18 ? Math.ceil(ac.label.length / 2) + 2 : 99))); const COL = Math.min(240, Math.max(112, Math.ceil(longestA * 7.4 + 44))); const W = 48 + m.actors.length * COL; const scale = Math.min(1, 348 / W); if (scale < 0.7 && m.actors.length < 5) warn(`${at}: ${m.actors.length} lanes × ${COL}px ≈ ${W}px → ${Math.round(scale * 100)}% on a phone — shorter participant names (longest sets every lane) or one fewer lane`);
        const once = m.actors.filter((ac) => m.steps.filter((st) => st.kind === 'msg' && (st.from === ac.id || st.to === ac.id)).length === 1); if (m.actors.length >= 4 && once.length) warn(`${at}: ${once.map((x) => x.label).join(', ')} appear${once.length === 1 ? 's' : ''} in exactly one message — fold into a "note over" and drop the lane`); } }
    else if (tag === 'doc-schema' && !(a.lang || a.src)) { warn(`${at}: no lang= — write the schema as text in the language that states it best (lang="ts", "sql", "proto"…); the field-table form is kept only for old pages`); const m = NW.parseSchema(blockSrc(inner)); m.errors.forEach((e) => err(`${at}: ${e}`)); if (!a.caption) warn(`${at}: no caption=""`); if (!m.entities.length) err(`${at}: no entities`); m.entities.forEach((e) => { if (!e.fields.length) warn(`${at}: entity ${e.name} has no fields (indent fields under it)`); }); }
    else if (tag === 'doc-calls') { const m = NW.parseCalls(blockSrc(inner)); m.errors.forEach((e) => err(`${at}: ${e}`)); const n = m.nodes.length; if (n > 60) warn(`${at}: ${n} rows — past ~40 the tree stops being scannable; split by entrypoint or use compact`); if (!m.nodes.some((x) => x.mark !== ' ')) warn(`${at}: no + − ~ rows — a call tree with no diff is a doc-tree of functions; mark what changes`); if (!a.caption) warn(`${at}: no caption="" — say what the reader should notice`);
      const noLoc = m.nodes.filter((x) => x.mark !== ' ' && !x.gap && !x.loc).length; if (noLoc > 2) warn(`${at}: ${noLoc} changed calls have no file — end the line with  @ path/file.ts:line  so the files list can be derived and the row can open its code`);
      for (const t of inner.matchAll(/<template\s+for=["']([^"']+)["']/g)) { if (!m.find(t[1])) err(`${at}: <template for="${t[1]}"> matches no call — use the call's symbol (the **bold** name, the <Component>, or the function before the parenthesis) or n<index>`); }
      // context excerpts: for every row with @ file:line that resolves on disk (or via ref= + git show), embed ±CTX lines so clicking the row shows the code
      const CTX = +(a.context || 6); const have = new Set([...inner.matchAll(/data-excerpt=["']([^"']+)["']/g)].map((x) => x[1]));
      let added = 0, missing = 0, extra = '';
      const seen = new Set();
      for (const nd of m.nodes) { if (!nd.file || !nd.line || nd.gap) continue; const key = `${nd.file}:${nd.line}`; if (have.has(key) || seen.has(key)) continue; seen.add(key);
        let text = null, sha = ''; const g = a.ref ? gitShow(a.ref, nd.file) : null; if (g) { text = g.text; sha = a.ref; } else { const f = findFile(nd.file); if (f) { text = readFileSync(f, 'utf8'); sha = stamp(f, false); } }
        if (text == null) { missing++; continue; }
        if (SECRET_TEXT.test(text)) { warn(`${at}: ${nd.file} looks like it holds a secret somewhere — no excerpt from it`); continue; }
        const L = text.split('\n'); const ln = +String(nd.line).split('-')[0]; if (ln < 1 || ln > L.length) { warn(`${at}: ${key} — file has ${L.length} lines`); continue; }
        
        const s0 = Math.max(1, ln - CTX), s1 = Math.min(L.length, ln + CTX); const slice = L.slice(s0 - 1, s1).join('\n').replace(/<\/script/gi, '<\\/script');
        if (SECRET_TEXT.test(slice)) { warn(`${at}: ${key} looks like it holds a secret — no excerpt`); continue; } reads.add(nd.file);
        extra += `\n<script type="text/plain" data-excerpt="${key}" data-start="${s0}"${sha ? ` data-sha="${sha}"` : ''}>\n${slice}\n</script>`; added++; }
      if (added) info.push(`doc-calls${a.id ? '#' + a.id : ''}: embedded ${added} code excerpt${added > 1 ? 's' : ''} (click a row → its code)`);
      if (missing && !added) warn(`${at}: ${missing} rows point at files not found under ${roots.map((r) => relative(process.cwd(), r) || '.').join(', ')} — pass --root <checkout> (and ref="<sha>" for a merged PR) so rows can open their code`);
      else if (missing) warn(`${at}: ${missing} rows point at files not found — those rows will not open code`);
      if (extra) return `<${tag}${rawAttrs}>${inner}${extra}</${tag}>`; }
    else if (tag === 'doc-machine') { const m = NW.parseMachine(blockSrc(inner)); m.errors.forEach((e) => err(`${at}: ${e}`)); if (!m.order.length) err(`${at}: no states`);
      if (m.order.length > 10) warn(`${at}: ${m.order.length} states — past ~8 the diagram needs panning; split by concern`);
      if (!m.grid.length && !('blocks' in a) && m.events.some((e) => m.events.some((o) => o !== e && o.to === e.to && o.from !== e.from)) && m.order.length > 4) warn(`${at}: ${m.order.length} states with arrows that meet — add a grid (| a | b | rows) so labels do not overlap`);
      Object.values(m.states).forEach((st) => { const b = st.bind; (b.shows || []).forEach((sel) => { const id = sel.replace(/^#/, ''); if (!ids[id] && !new RegExp(`id=["']${id}["']`).test(html)) err(`${at}: state ${st.id} shows "${sel}" — no element with that id`); });
        [].concat(b.code || []).forEach((spec) => { const [f, l] = spec.split(':'); if (!l || !/^\d+$/.test(l)) err(`${at}: state ${st.id} code "${spec}" should be file:line`); else if (!new RegExp(`<doc-code[^>]*(file|title|id)=["'][^"']*${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(html)) warn(`${at}: state ${st.id} code "${spec}" — no <doc-code file=…${f}> on the page`); });
        (b.set || []).forEach((kv) => { const k = kv.split('=')[0]; if (!new RegExp(`data-field=["']${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(html)) warn(`${at}: state ${st.id} set "${k}" — nothing on the page has data-field="${k}"`); });
        if (b.node != null && !/<doc-flow/.test(html)) warn(`${at}: state ${st.id} binds node "${b.node}" but there is no <doc-flow>`);
        if (b.seq != null && !/<doc-seq/.test(html)) warn(`${at}: state ${st.id} binds seq ${b.seq} but there is no <doc-seq>`); });
      const stateEls = [...html.matchAll(/data-state=["']([^"']+)["']/g)].map((x) => x[1]).filter((v) => !/^[\w-]+$/.test(v) || true); stateEls.forEach((v) => v.split(/[\s,]+/).forEach((id) => { if (id && !m.states[id]) warn(`${at}: something has data-state="${id}" but the machine has no state "${id}"`); }));
      const mname = a.name || m.name; if (mname) names.add(mname); [...html.matchAll(/data-play=["']([^"']+)["']/g)].forEach((x) => { const [mn, tn] = x[1].split(/[.:\/]/); if ((mn === mname || !tn) && !m.traces[tn || mn]) err(`${at}: data-play="${x[1]}" — machine has no trace "${tn || mn}" (traces: ${Object.keys(m.traces).join(', ') || 'none'})`); });
      if (!a.caption) warn(`${at}: no caption="" — say what the reader should try`); }
    else if (tag === 'doc-tree') { const m = NW.parseTree(blockSrc(inner)); if (!m.rows.length) err(`${at}: empty tree`); const longN = m.rows.filter((r) => r.note.length > 60); if (longN.length) warn(`${at}: ${longN.length} comment(s) over 60 chars (${longN.slice(0, 3).map((r) => r.name).join(', ')}…) — tree comments are one short clause; they truncate on phones. Explain below the tree`); m.rows.forEach((r) => { if (/\s[+~-]\s/.test(r.name)) warn(`${at}: row "${r.name.slice(0, 30)}" seems to hold several entries — one path per line`); }); }
    else if (tag === 'doc-code' || tag === 'doc-schema') {
      const hasScript = /<script\s+type=["']?text\/(plain|source)/i.test(inner);
      if (a.src && !hasScript) {
        let text, where;
        let sha = '';
        const g = a.ref ? gitShow(a.ref, a.src) : null;
        if (g) { text = g.text; where = g.where; sha = a.ref; }
        else { if (a.ref) { const f0 = findFile(a.src); if (!f0) { err(`${at}: src="${a.src}" ref="${a.ref}" — git show failed in ${roots.map((r) => relative(process.cwd(), r) || '.').join(', ')} and no plain file by that path either (is --root a checkout with that ref, or a snapshot dir containing the file?)`); return whole; } info.push(`${a.src}: no git ref ${a.ref} under the roots — using the plain file (assuming it is a snapshot at that ref)`); sha = a.ref; }
          const all = roots.map((r) => resolve(r, a.src)).filter((c) => existsSync(c)); if (all.length > 1) warn(`${at}: src="${a.src}" exists under ${all.length} roots (${all.map((x) => relative(process.cwd(), x)).join(', ')}) — using the first; reorder --root or make the path more specific`);
          const f = findFile(a.src); if (!f) { err(`${at}: src="${a.src}" not found (looked under ${roots.concat([baseDir]).map((r) => relative(process.cwd(), r) || '.').join(', ')})`); return whole; } text = readFileSync(f, 'utf8'); where = relative(process.cwd(), f); if (!roots.some((r) => f.startsWith(r))) warn(`${at}: src="${a.src}" resolved OUTSIDE --root, at ${where} — check it's the file you mean`);
          if (!sha) sha = stamp(f, true); }
        if (SECRET_TEXT.test(text)) { err(`${at}: ${a.src} looks like it holds a secret somewhere in the file — not packaging any of it`); return whole; }
        const total = text.split('\n').length; let start = 1;
        if (a.lines) { const mm = a.lines.match(/^(\d+)(?:-(\d+))?$/); if (!mm) err(`${at}: lines="${a.lines}" should look like 40-72`); else { start = +mm[1]; const end = +(mm[2] || mm[1]);   /* lines="40" is that one line */ if (end > total || start < 1 || start > end) err(`${at}: lines="${a.lines}" but ${a.src} has ${total} lines at ${where} — is --root (or ref=) at the commit you're citing?`); text = text.split('\n').slice(start - 1, end).join('\n'); } }
        if (SECRET_TEXT.test(text)) { err(`${at}: ${a.src} looks like it holds a secret — not packaging it`); return whole; } reads.add(a.src);
        const nl = text.split('\n').length; if (nl > 120) warn(`${at}: ${nl} lines of code — readers skim past long listings; slice with lines="a-b"`); else if (nl > 40 && !('collapsed' in a)) warn(`${at}: ${nl}-line slice — over ~40 lines either trim to the part that carries the point or add collapsed`);
        const extra = (a.file ? '' : ` file="${a.src}"`) + (a.start || !a.lines ? '' : ` start="${start}"`) + (sha && !a.sha ? ` sha="${String(sha).slice(0, 12)}"` : '');
        info.push(`filled <${tag} src="${a.src}"${a.lines ? ` lines=${a.lines}` : ''}> from ${where}`);
        return `<${tag}${rawAttrs}${extra}><script type="text/plain">${text.replace(/<\/script/gi, '<\\/script')}</script>${inner}</${tag}>`;
      }
      if (!hasScript && /<(?!\/?doc-pin\b)[a-z]/i.test(inner)) err(`${at}: code contains "<" but isn't wrapped — put the source inside <script type="text/plain">…</script>`);
      if (!hasScript && !inner.trim() && !a.src) err(`${at}: empty`);
      const n = blockSrc(inner).split('\n').length; if (n > 120) warn(`${at}: ${n} lines — slice to the part that carries the point`); else if (n > 40 && !('collapsed' in a) && hasScript) warn(`${at}: ${n}-line block — over ~40 lines trim or add collapsed`);
      if ('collapsed' in a && !/<doc-pin/.test(inner) && !a.caption) warn(`${at}: collapsed, no pins, no caption — if nothing in it is worth pointing at, cite file:lines inline instead`);
      if (a.file && / · |, /.test(a.file)) warn(`${at}: file="${a.file}" names two files — one block per file`);
      if (a.file && !a.lines && !a.start && !a.src && !('diff' in a) && n > 6) warn(`${at}: file= without lines=/start= — cite the range, or start="1" if this really is the whole file, or drop file= for a sketch`);
      if (('diff' in a || /^(diff|patch)$/.test(a.lang || '')) && hasScript) { const body = blockSrc(inner);
        if (tag === 'doc-code' && !/^@@ .*[-+]\d/m.test(body) && !a.start && !a.lines) warn(`${at}: diff without a real "@@ -a,b +c,d @@" header (or start=) — gutter will be unnumbered; paste the hunk header from gh pr diff`);
        let hdr = null, cntNew = 0, cntOld = 0, hl = 0; const check = () => { if (hdr && ((hdr.d != null && cntNew !== hdr.d) || (hdr.b != null && cntOld !== hdr.b))) (cntNew > hdr.d || cntOld > hdr.b ? err : warn)(`${at}: hunk "@@ -${hdr.a},${hdr.b ?? '?'} +${hdr.c},${hdr.d ?? '?'} @@" (block line ${hl}) is followed by ${cntOld}/${cntNew} old/new lines, header says ${hdr.b}/${hdr.d} — fine if you only cut the tail; if you removed LEADING or middle lines every gutter number after the cut is wrong (bump +${hdr.c} by the lines you dropped, or split into two @@ hunks)`); };
        body.split('\n').forEach((l, i) => { const mm = l.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/); if (l.startsWith('@@')) { check(); hdr = mm ? { a: +mm[1], b: mm[2] != null ? +mm[2] : null, c: +mm[3], d: mm[4] != null ? +mm[4] : null } : null; cntNew = cntOld = 0; hl = i + 1; if (mm && mm[5] && !/^\s/.test(mm[5])) warn(`${at}: hunk header at block line ${i + 1} has text jammed after "@@" ("${mm[5].slice(0, 20)}") — leftover from an edit?`); return; }
          if (/^\s*(…|\.\.\.)\s*$/.test(l)) { err(`${at}: "…" elision at block line ${i + 1} inside a diff hunk — the gutter can't know how many lines you cut; split into two hunks`); return; }
          if (l[0] === '+') cntNew++; else if (l[0] === '-') cntOld++; else { cntNew++; cntOld++; } }); check(); }
      if (!a.src && hasScript && !('wrap' in a)) { const longL = blockSrc(inner).split('\n').filter((l) => l.length > 90).length; if (longL >= 3) warn(`${at}: ${longL} lines over 90 chars in code you pasted/wrote — a phone shows ~44 mono columns; reflow the sketch (or add wrap for prose-like text)`); }
      { // pins must address a line number that the gutter will actually show
        const body = blockSrc(a.src && !hasScript ? '' : inner); const isDiff = 'diff' in a || /^(diff|patch)$/.test(a.lang || ''); const st = +(a.start || (a.lines || '').match(/^\d+/)?.[0] || 1);
        const valid = new Set(), validOld = new Set(); let A = st, B = +(a['old-start'] || st);
        body.split('\n').forEach((l, i) => { if (!isDiff) { valid.add(st + i); return; } if (l.startsWith('@@')) { const ma = l.match(/\+(\d+)/), mb = l.match(/-(\d+)/); if (ma) A = +ma[1]; if (mb) B = +mb[1]; } else if (l[0] === '+') valid.add(A++); else if (l[0] === '-') validOld.add(B++); else { valid.add(A++); B++; } });
        for (const p of inner.matchAll(/<doc-pin\b([^>]*)>([\s\S]*?)<\/doc-pin>/g)) { const pa = attrs(p[1]); if (wc(stripTags(p[2])) > 20) warn(`${at}: pin at line ${pa.line || pa.old} is ${wc(stripTags(p[2]))} words — pins locate (a clause or two); the argument goes in prose or a numbered risk it links to`);
          if (!pa.line && !pa.old) err(`${at}: <doc-pin> inside doc-code needs line="" (file line number as shown in the gutter${isDiff ? '; old="N" for a removed line' : ''})`);
          else if (pa.line && body && !valid.has(+pa.line)) err(`${at}: <doc-pin line="${pa.line}"> — no such line in this block (gutter shows ${[...valid][0]}–${[...valid].pop()}${isDiff ? ', new-side numbers; use old="N" to pin a removed line' : ''})`);
          else if (pa.old && !validOld.has(+pa.old)) err(`${at}: <doc-pin old="${pa.old}"> — no removed line with that old-side number in this block`); } }
    }
    else if (tag === 'doc-mock') { if (!/<template[\s>]/i.test(inner)) err(`${at}: needs a <template>…</template> child holding the mock's HTML`); for (const p of inner.matchAll(/<doc-pin\b([^>]*)>/g)) { const pa = attrs(p[1]); if (pa.ref) { if (!new RegExp(`data-ref=["']${pa.ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(inner)) err(`${at}: <doc-pin ref="${pa.ref}"> — no element with data-ref="${pa.ref}" inside this mock's <template>`); } else if (!/^\d+(\.\d+)?%?\s*,\s*\d+(\.\d+)?%?$/.test(pa.at || '')) err(`${at}: <doc-pin> inside doc-mock needs ref="data-ref-name" (preferred) or at="x%,y%"`); }
      const w = +(a.w || a.width || { phone: 390, browser: 1024, terminal: 640, desktop: 900, none: 600 }[a.frame || 'browser'] || 800);
      const ctx2k = html.slice(Math.max(0, idx - 400), idx); const inCols = /<div class="[^"]*\bcols\b[^"]*">(?:(?!<\/div>)[\s\S])*$/.test(ctx2k);
      if ((a.frame === 'terminal') && w > 520 && !('thumbnail' in a)) warn(`${at}: terminal mock w=${w} — on a phone that's ~${Math.round(390 / w * 13)}px text; ≤480 (≈55 cols) stays readable, or add thumbnail to accept`);
      else if (w >= 800 && !('thumbnail' in a)) warn(`${at}: ${a.frame || 'browser'} mock w=${w} renders at ~${Math.round(350 / w * 100)}% on a phone — fine as an overview (add thumbnail to say so), but pair it with a narrow crop (w≤480 frame=none) of the part that matters${inCols ? '; and it is inside .cols, which halves it again on desktop' : ''}`);
      else if (inCols && w > 600) warn(`${at}: w=${w} mock inside .cols — .cols is for mocks ≤600 wide; stack them or use .storyboard`); }
    else if (tag === 'doc-shot') { if (!a.src) err(`${at}: needs src=""`); else if (!/^(data:|https?:)/.test(a.src) && !findFile(a.src)) err(`${at}: src="${a.src}" not found`); }
    else if (tag === 'doc-draft') { if (!blockSrc(inner).trim()) err(`${at}: empty — put the editable text inside <script type="text/plain">`); if (!a.id) warn(`${at}: give it an id so edits survive a reload`); }
    else if (tag === 'doc-quote') { if (!a.via) warn(`${at}: add via="prompt|slack|github|transcript|doc|tools|…"`); if (!inner.trim()) err(`${at}: empty quote`); if (/[{}]/.test(a.from || '')) warn(`${at}: from="${a.from}" contains braces — from= is the literal name/handle the source shows; put role/agent context in where=`);
      if (a.via === 'slack' && a.href && /\/archives\/[A-Z0-9]+\/?$/.test(a.href)) warn(`${at}: href links the channel, not the message — use the permalink (…/p<ts>)`);
      if (/\(|:\d+\b/.test(a.from || '')) warn(`${at}: from="${a.from}" — from is the bare name/handle; role, file:line or context go in where=`);
      const body = stripTags(inner).replace(/\s+/g, ' ').trim(); if (body.length > 40) { if (quoteSeen.has(body)) warn(`${at}: same quote text already appears at line ${quoteSeen.get(body)} — quote it once, reference it after`); else quoteSeen.set(body, lineOf(idx)); } }
    else if (tag === 'doc-ask') {
      if (!a.id) warn(`${at}: add an id — it anchors the TOC entry and the response`);
      if (!/<(p|h3|h4)[\s>]/i.test(inner) && !a.q) err(`${at}: needs a question — first <p> child (or q="")`);
      const ctrls = [...inner.matchAll(/<(input|textarea|select|ol)\b([^>]*)>/gi)].map((m) => ({ tag: m[1].toLowerCase(), ...attrs(m[2]) }));
      const named = ctrls.filter((c) => c.name || (c.tag === 'ol' && c['data-name']));
      if (!named.length) err(`${at}: no named controls — use <label><input type=radio name=… value=…> …</label>, checkboxes, <textarea name>, <input type=range name>, or <ol class=rank data-name>`);
      const radios = named.filter((c) => c.type === 'radio'); const groups = [...new Set(radios.map((r) => r.name))];
      groups.forEach((g) => { const rs = radios.filter((r) => r.name === g); if (!rs.some((r) => 'checked' in r)) warn(`${at}: radio group "${g}" has no checked option — pre-select your recommendation so "no change" is an answer`); if (rs.some((r) => !r.value)) err(`${at}: every radio in "${g}" needs a value`); if (names.has(g)) err(`${at}: control name "${g}" is used by an earlier doc-ask`); });
      named.forEach((c) => names.add(c.name || c['data-name']));
      if (ctrls.some((c) => c.tag === 'input' && !c.type)) warn(`${at}: <input> without type`);
      for (const sm of inner.matchAll(/<small>([\s\S]*?)<\/small>/g)) if (wc(stripTags(sm[1])) > 16) { warn(`${at}: an option's <small> is ${wc(stripTags(sm[1]))} words — ≤ ~12; the trade-off is argued once in the section, the option just names it`); break; }
      const q = inner.match(/<(p|h3|h4)[^>]*>([\s\S]*?)<\/\1>/i); if (q && wc(stripTags(q[2])) > 25) warn(`${at}: the question is ${wc(stripTags(q[2]))} words — keep the first <p> to the question (≤ ~15 words) and put context in a second <p>`);
      if (lastAskEnd >= 0 && !html.slice(lastAskEnd, idx).replace(/<[^>]+>/g, '').trim()) warn(`${at}: directly follows another doc-ask with nothing between — asks belong where their consequence is discussed, not stacked`);
      lastAskEnd = idx + whole.length;
    }
    else if (tag === 'doc-pin' && !/doc-(code|mock|shot)/.test(html.slice(Math.max(0, idx - 3000), idx).split('</doc-').pop() ? '' : '')) { /* checked inside parents */ }
  } catch (e) { err(`${at}: ${e.message}`); }
  return whole;
});
for (const m of html.matchAll(/data-if=["']([^"']+)["']/g)) m[1].split(/\s*&&\s*/).forEach((c) => { const n = c.replace(/^!/, '').split(/[=!~]/)[0].trim(); if (!names.has(n)) err(`line ${lineOf(m.index)}: data-if="${m[1]}" — no control named "${n}"`); });
if (/<doc-pin\b/.test(html.replace(/<doc-(code|mock|shot|schema)\b[\s\S]*?<\/doc-\1>/g, ''))) err('a <doc-pin> sits outside any doc-code / doc-mock / doc-shot');

/* ── doc-plan: the shape of the tree ── */
if (/<doc-plan\b/.test(html)) {
  const flat = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|template|style)\b[\s\S]*?<\/\1>/gi, '').replace(/(<doc-(machine|ask|calls|mock|note)\b[^>]*>)[\s\S]*?(<\/doc-\2>)/gi, '$1$3');
  const root = { no: '', kids: [], ex: [], l: 0 }; const stack = [root]; let inPlan = 0;
  for (const t of flat.matchAll(/<(\/?)(doc-plan|doc-claim)\b([^>]*)>|<(doc-(?:mock|shot|machine|calls|schema|code|flow|seq|tree|quote))\b|<(doc-ask)\b|<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const top = stack[stack.length - 1];
    if (t[2] === 'doc-plan') { inPlan += t[1] ? -1 : 1; continue; }
    if (t[2] === 'doc-claim') { if (t[1]) { if (stack.length > 1) stack.pop(); else err('a </doc-claim> closes nothing'); continue; }
      if (!inPlan) err('a <doc-claim> sits outside any <doc-plan>');
      const a = attrs(t[3]); const n = { a, kids: [], ex: [], asks: 0, claim: null, l: top.l + 1 }; n.no = a.aux ? a.aux : (top.no && !top.a?.aux ? top.no + '.' : '') + (top.kids.filter((k) => !k.a.aux).length + 1); top.kids.push(n); stack.push(n); continue; }
    if (stack.length === 1) continue;
    if (t[4]) top.ex.push(t[4]); else if (t[5]) top.asks++; else if (t[6] != null && top.claim == null && !top.ex.length && !top.kids.length) top.claim = stripTags(t[6]).replace(/\s+/g, ' ').trim();
  }
  if (stack.length > 1) err(`${stack.length - 1} <doc-claim> left open — every claim needs its </doc-claim>`);
  const walk = (n) => { const at = `claim ${n.no}`;
    if (n.claim == null && !n.a.at) err(`${at}: no claim — the first child must be a <p> with one sentence (or give it at="path:line")`);
    if (n.claim && wc(n.claim) > 16) warn(`${at}: the claim is ${wc(n.claim)} words — one short sentence (≤ ~12) that can be true or false`);
    if (n.claim && n.l <= 2 && !n.a.aux && !/[.?!]$/.test(n.claim)) warn(`${at}: "${n.claim.slice(0, 40)}" — write a full sentence with a verb, not a heading`);
    if (n.ex.length > 1) warn(`${at}: ${n.ex.length} exhibits (${n.ex.join(', ')}) — one per claim; give the others their own child claims`);
    if (!n.ex.length && !n.kids.length && n.a.aux !== 'scope' && !AGENT_BRANCHES.includes(n.a.aux)) warn(`${at}: nothing under it — add the exhibit that proves it`);
    if (n.kids.length > 5) warn(`${at}: ${n.kids.length} child claims — 5 at most; group them`);
    if (n.l > 3) warn(`${at}: level ${n.l} — three levels at most (what › how › where)`);
    n.kids.forEach(walk); };
  const tops = root.kids.filter((k) => !k.a.aux); if (tops.length > 5) warn(`doc-plan: ${tops.length} top-level claims — 5 at most, plus aux="shared" and aux="scope"`);
  if (root.kids.length && !root.kids.some((k) => k.a.aux === 'scope')) warn('doc-plan: no <doc-claim aux="scope"> — end with what is not changing');
  const i = root.kids.findIndex((k) => k.a.aux); if (i >= 0 && root.kids.slice(i).some((k) => !k.a.aux)) warn('doc-plan: aux claims go last');
  root.kids.forEach(walk);
  const nAsk = (flat.match(/<doc-ask\b/g) || []).length; if (nAsk > 6) warn(`doc-plan: ${nAsk} decisions — 2 to 5; ask only about forks that change what you build, and default the rest`);
}

/* ── impl-plan spec structure: what --status and the agents rely on ── */
const sourceMasked = maskInert(source);
const lineIn = (s, i) => s.slice(0, i).split('\n').length;
if (/<doc-plan\b/i.test(sourceMasked)) {
  const c = statusComment(source);
  if (c == null) err('a plan starts with the status block — an HTML comment before <!doctype html> holding the status:, date: and risk-surface: lines');
  else { const miss = ['status', 'date', 'risk-surface'].filter((k) => statusField(c, k) == null); if (miss.length) err(`status block (the comment before <!doctype html>) has no ${miss.map((k) => k + ':').join(', ')} line`); }
  const { claims, branches, steps } = planParts(sourceMasked);
  for (const k of AGENT_BRANCHES) { const n = (branches[k] || []).length; if (n !== 1) err(n ? `<doc-claim aux="${k}"> appears ${n} times (lines ${branches[k].map((b) => lineIn(sourceMasked, b.at)).join(', ')}) — one per plan` : `no <doc-claim aux="${k}"> — every plan has the eight agent branches: ${AGENT_BRANCHES.join(' ')}`); }
  for (const b of claims.filter((x) => isAgentBranch(x.a))) for (const t of sourceMasked.slice(b.start, b.end).matchAll(/<doc-[a-z]+/gi))
    err(`line ${lineIn(sourceMasked, b.start + t.index)}: ${t[0]}> inside <doc-claim aux="${b.a.aux}"> — agent branches hold plain HTML; put sketches and diffs in <pre><code>`);
  // an empty steps branch would make --status report no next step, which reads as "all done"
  if (branches.steps?.length && !steps.length) err(`line ${lineIn(sourceMasked, branches.steps[0].at)}: <doc-claim aux="steps"> has no <ul class="steps"> with a step <li> — write each step as <li id="step-N"> inside it`);
  const stepIds = new Set();
  for (const s of steps) { const at = `line ${lineIn(sourceMasked, s.at)}`;
    if (!s.a.id) err(`${at}: a step <li> in ul.steps has no id — give it id="step-N" so --status can count it`);
    else if (!STEP_ID.test(s.a.id)) err(`${at}: step id="${s.a.id}" — use id="step-N" (a number, optionally with a letter suffix such as step-9a)`);
    else stepIds.add(s.a.id); }
  const named = new Set();
  for (const n of claims.filter((x) => !('aux' in x.a) && x.a.steps != null)) for (const v of n.a.steps.split(/\s+/).filter(Boolean)) {
    named.add(`step-${v}`); if (!stepIds.has(`step-${v}`)) err(`line ${lineIn(sourceMasked, n.at)}: steps="${n.a.steps}" names step ${v}, but there is no id="step-${v}" in the steps branch`); }
  for (const id of stepIds) if (!named.has(id)) warn(`${id} is not named by any tree node's steps="…" — say which behaviour it builds`);
  if (!lintOnly && !argv.includes('-o') && !argv.includes('--out')) err('계획서는 `-o`로 레포 밖에 묶는다');
}

/* ── escaping: a "<" the author meant as text is eaten by the browser as a tag and vanishes from the page ── */
{ const HTML_ELEMENTS = new Set(('a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link main map mark math menu meta meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search section select selectedcontent slot small source span strong style sub summary sup svg table tbody td template textarea tfoot th thead time title tr track u ul var video wbr').split(' '));
  const m = sourceMasked;
  const eaten = (i, name) => err(`line ${lineIn(m, i)}: \`<${name}>\`은 태그로 읽혀 화면에서 사라진다 — \`&lt;\`로 쓴다`);
  // Inside <pre>/<code> every raw "<" + letter, "/" or "!" is markup the reader never sees, so only the <code> wrapper may appear there.
  const raw = [];
  for (const r of m.matchAll(/<(pre|code)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)) { const inner = r.index + r[0].indexOf('>') + 1; raw.push([r.index, r.index + r[0].length]);
    for (const t of r[2].matchAll(/<(?!\/?code\b[^>]*>)[A-Za-z\/!][^\s>]*/g)) eaten(inner + t.index, t[0].slice(1)); }
  // Elsewhere a tag name is fine when it is an HTML element (exact lowercase, so `Promise<Header>` is caught) or a doc-* block.
  const tagEnd = (i) => { const q = /"[^"]*"|'[^']*'|>/g; q.lastIndex = i; let x; while ((x = q.exec(m))) if (x[0] === '>') return x.index + 1; return m.length; };
  const re = /<\/?([A-Za-z][^\s/>]*)/g; let t;
  while ((t = re.exec(m))) { const r = raw.find(([a, b]) => t.index >= a && t.index < b); if (r) { re.lastIndex = r[1]; continue; }
    if (HTML_ELEMENTS.has(t[1]) || t[1].startsWith('doc-')) re.lastIndex = tagEnd(re.lastIndex);   // skip attributes: a "<" inside a quoted value is text
    else eaten(t.index, t[0].slice(1)); } }

for (const m of html.matchAll(/<doc-changes\b([^>]*)>/g)) { const a = attrs(m[1]); if (!['new', 'changed', 'deleted'].some((k) => parseInt(a[k], 10) > 0)) warn(`line ${lineOf(m.index)} <doc-changes>: give new="N", changed="N" or deleted="N" (files) — with none it draws nothing`); }

if (/<doc-plan\b/.test(html)) {   // a plan starts with a title, not a label line or a goal sentence
  const k = html.match(/<p\s+class=["']?kicker\b/i); if (k) warn(`line ${lineOf(k.index)}: a plan has no label line above its title — remove <p class="kicker">; the page hides it`);
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); const t = m ? stripTags(m[1]).replace(/\s+/g, ' ').trim() : '';
  if (t && (wc(t) > 8 || /[.!?](\s|$)/.test(t))) warn(`line ${lineOf(m.index)}: the <h1> of a plan is a title, not a sentence — name the change and the place in 3 to 7 words ("Scheduling Sent Messages in PostBox"); the level-1 claims say what changes`);
}

/* ── words: the blocks are the document; prose only joins them ── */
{ // agent branches carry the full spec text for agents; only the tree is prose a person reads, so only it counts toward the budget
  const main = (html.match(/<main[\s\S]*<\/main>/i) || [html])[0].replace(/<doc-claim\b([^>]*)>[\s\S]*?<\/doc-claim>/gi, (whole, a) => isAgentBranch(attrs(a)) ? ' ' : whole);
  const blocks = (main.match(/<doc-(code|flow|seq|schema|tree|calls|machine|mock|shot|ask|draft)\b/g) || []).length;
  const bare = main.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<(doc-(?:code|flow|seq|schema|tree|calls|machine|mock|shot|ask|draft|quote))\b[\s\S]*?<\/\1>/gi, ' ');
  let total = 0, long = 0, longest = 0, slow = 0;
  for (const m of bare.matchAll(/<(p|li|dd|doc-note)\b[^>]*>([\s\S]*?)<\/\1>/gi)) { const t = stripTags(m[2]).replace(/\s+/g, ' ').trim(); const n = wc(t); total += n; if (n > 40) { long++; longest = Math.max(longest, n); } t.split(/(?<=[.!?])\s+/).forEach((sn) => { if (wc(sn) > 25) slow++; }); }
  if (long) warn(`${long} paragraph${long > 1 ? 's' : ''} over 40 words (longest ${longest}) — two short sentences, then a block; move the rest into a caption, a pin or a table`);
  if (slow) warn(`${slow} sentence${slow > 1 ? 's' : ''} over 25 words — split them; one idea per sentence`);
  if (total > 350 || (blocks && total / blocks > 45)) warn(`${total} words of prose for ${blocks} block${blocks === 1 ? '' : 's'} — aim for ≤ 350 words and ≤ ~30 per block; cut, or show it as a block`);
}

/* ── inline assets ── */
let packed = html; let inlined = 0;
if (!lintOnly) {
  packed = packed.replace(/<link\b[^>]*href=["']([^"']*htmlplan\.css)["'][^>]*>/i, (m, href) => { const f = findFile(href) || resolve(here, 'htmlplan.css'); inlined++; return `<style data-htmlplan>\n${readFileSync(f, 'utf8')}\n</style>`; });
  packed = packed.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"':]+\.css)["'][^>]*>/gi, (m, href) => { const f = findFile(href); if (!f) { warn(`stylesheet ${href} not found — left as a link`); return m; } inlined++; return `<style>/* ${basename(href)} */\n${readFileSync(f, 'utf8')}\n</style>`; });  // any other local stylesheet
  packed = packed.replace(/<script\b[^>]*src=["']([^"']*htmlplan\.js)["'][^>]*>\s*<\/script>/i, (m, src) => { const f = findFile(src) || resolve(here, 'htmlplan.js'); inlined++; return `<script data-htmlplan>\n${readFileSync(f, 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`; });
  const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  packed = packed.replace(/(<(?:img|doc-shot|video|source)\b[^>]*?\ssrc=["'])([^"']+)(["'])/gi, (m, pre, src, post) => {
    if (/^(data:|https?:|#)/.test(src)) return m; const f = findFile(src); if (!f) { warn(`asset ${src} not found — left as-is`); return m; }
    const size = statSync(f).size; if (size > 6e6) { warn(`${src} is ${(size / 1e6).toFixed(1)} MB — not inlining; the packed file will need it alongside`); return m; }
    inlined++; return `${pre}data:${MIME[extname(f).toLowerCase()] || 'application/octet-stream'};base64,${readFileSync(f).toString('base64')}${post}`;
  });
  if (!/data-htmlplan-packed/.test(packed)) packed = packed.replace(/<html\b/i, '<html data-htmlplan-packed');
}

/* ── report ── */
const rel = (p) => relative(process.cwd(), p) || p;
if (!quiet) {
  console.log(`\n${basename(inPath)}`);
  info.forEach((m) => console.log('  · ' + m));
  warns.forEach((m) => console.log('  ⚠ ' + m));
  errors.forEach((m) => console.log('  ✗ ' + m));
}
if (errors.length) { console.log(`\n✗ ${errors.length} error(s), ${warns.length} warning(s) — fix and re-run.`); process.exit(1); }
if (lintOnly) { console.log(`✓ lint clean${warns.length ? ` (${warns.length} warning${warns.length > 1 ? 's' : ''})` : ''}`); process.exit(0); }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, packed);
if (reads.size && (!quiet || argv.includes('--artifact'))) console.log(`  code from ${reads.size} file${reads.size > 1 ? 's' : ''} is now inside the page: ${[...reads].sort().join(', ')}`);
if (argv.includes('--artifact')) {   // the Artifact tool wraps the page in its own <html><head><body>: publish content only
  const bodyAttrs = attrs((packed.match(/<body\b([^>]*)>/i) || [])[1] || ''); const data = Object.fromEntries(Object.entries(bodyAttrs).filter(([k]) => k.startsWith('data-')).map(([k, v]) => [k.slice(5).replace(/-(\w)/g, (m, c) => c.toUpperCase()), v]));
  let art = packed.replace(/<!doctype[^>]*>\s*/i, '').replace(/<\/?html\b[^>]*>\s*/gi, '').replace(/<meta\b[^>]*charset[^>]*>\s*/i, '').replace(/<\/?head\b[^>]*>\s*/gi, '').replace(/<\/?body\b[^>]*>\s*/gi, '');
  if (Object.keys(data).length) art = art.replace(/<script data-htmlplan>/, `<script>Object.assign(document.body.dataset, ${JSON.stringify(data)});</script>\n<script data-htmlplan>`);
  const ti = (art.match(/<title>([^<]*)<\/title>/i) || [])[1] || ''; if (/[:—–]|\s-\s/.test(ti) || wc(ti) > 5) console.log(`  ⚠ <title> "${ti.trim()}" — a published artifact is named like a document: 2–4 words, no "Plan:" prefix, no explainer after a dash`);
  const artPath = outPath.replace(/(\.packed)?\.html?$/, '.artifact.html'); writeFileSync(artPath, art);
  console.log(`✓ ${rel(artPath)}  publish this one with the Artifact tool`);
}
console.log(`✓ ${rel(outPath)}  ${(Buffer.byteLength(packed) / 1024).toFixed(0)} KB · ${inlined} asset(s) inlined${warns.length ? ` · ${warns.length} warning(s)` : ''}`);
