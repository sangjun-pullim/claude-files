# NOTICE — impl-plan HTML plan runtime

## Source

- Repository: <https://github.com/anthropics/claude-plugins-community>
- Path: `html-plan/` (runtime in `html-plan/skills/html-plan/runtime/`)
- Commit: `06ec7b6`
- Author: Thariq Shihipar

## License

The plugin's `html-plan/.claude-plugin/plugin.json` declares:

```json
"author": {
  "name": "Thariq Shihipar"
},
"license": "MIT",
```

The upstream ships no copyright line, so none is added here. MIT permission notice:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The repository as a whole is licensed under Apache-2.0; its full text is in [`LICENSE`](LICENSE).

## Files

Copied unchanged — `htmlplan.js` and `htmlplan.css` are not modified here. Keep them byte-identical to upstream.

Adapted (modified) files and what changed:

- `runtime/pack.mjs`
  - Provenance line after the header comment (Apache-2.0 §4(b) notice of modification).
  - ASD-STE100 checks removed (unapproved words, contractions, perfect tenses, passive voice, paragraphs over 6 sentences). The word budget is kept.
  - Agent branches (`<doc-claim aux="background|files|dependents|steps|tests|risks|verify|review">`) are excluded from the word budget and from the "nothing under it" warning.
  - Plan structure checks when the page has `<doc-plan>`: the file starts with a status-block comment holding `status:`, `date:` and `risk-surface:` lines; each agent branch appears exactly once; the steps branch holds a `ul.steps` with at least one step `<li>`; every direct `<li>` of `ul.steps` in the steps branch has `id="step-N"`; no `doc-*` block inside an agent branch; each value of a tree node's `steps="…"` names an existing step (a step no tree node names is a warning); packing a plan requires `-o`/`--out`.
  - Escape check on the source: a tag name that is neither a lowercase WHATWG HTML element nor `doc-*` is an error, and inside `<pre>`/`<code>` any raw `<` followed by a letter, `/` or `!` (other than the `<code>` wrapper) is an error. Line numbers match the source.
  - Writing the packed file creates the output's parent directory when it does not exist.
  - `--status` mode: prints one JSON line with the plan's status, steps (total, done, next, blocked), undecided decisions and review rows with a cell starting with the word `UNRESOLVED` (so `UNRESOLVED (reason)` counts, `REJECTED (was UNRESOLVED)` does not); exits 2 when the file cannot be read, has no `<doc-plan>`, its steps branch has no step `<li>`, or a step `<li>` lacks a valid `id="step-N"` (so an unlinted plan never reads as all done).
- `references/blocks.md` — upstream `html-plan/skills/html-plan/references/blocks.md`: `doc-code` and `doc-schema` point to the single-source rule in `html-format.md`; `doc-calls` says the important call gets a level-3 node with a `src=` excerpt; `steps="N M"`, `data-decided` and `neutral` rows; the trailing-branch rows point to `html-format.md`; the `pack.mjs` section points to the impl-plan pack command and says plans are packed only with `-o` outside the repo.
- `references/html-format.md` — upstream `html-plan/skills/html-plan/SKILL.md` Rules 1–11 and "Getting the answer back", rewritten for impl-plan: agent branches, the single source for changes (Steps), `steps=` links, status block, decision recording with `data-decided`/`neutral`.
- `examples/scheduled-send.html` — upstream `html-plan/skills/html-plan/examples/scheduled-send.html`, rewritten in the new plan format (status block, Korean prose, code sketches and diffs moved to the steps branch, eight agent branches).

## Upgrading

`<clone>` is a checkout of `https://github.com/anthropics/claude-plugins-community`; `<new>` is the upstream commit to move to.

1. Copy the unchanged files from the new commit:

   ```bash
   git -C <clone> show <new>:html-plan/skills/html-plan/runtime/htmlplan.js > ~/.claude/skills/impl-plan/runtime/htmlplan.js
   git -C <clone> show <new>:html-plan/skills/html-plan/runtime/htmlplan.css > ~/.claude/skills/impl-plan/runtime/htmlplan.css
   git -C <clone> show <new>:LICENSE > ~/.claude/skills/impl-plan/runtime/LICENSE
   ```

2. Confirm the copies match upstream (no output means identical):

   ```bash
   git -C <clone> show <new>:html-plan/skills/html-plan/runtime/htmlplan.js | cmp - ~/.claude/skills/impl-plan/runtime/htmlplan.js
   git -C <clone> show <new>:html-plan/skills/html-plan/runtime/htmlplan.css | cmp - ~/.claude/skills/impl-plan/runtime/htmlplan.css
   git -C <clone> show <new>:LICENSE | cmp - ~/.claude/skills/impl-plan/runtime/LICENSE
   ```

3. Check the runtime for network, dynamic-code, Node and external-URL use:

   ```bash
   grep -nE 'fetch\(|XMLHttpRequest|WebSocket|sendBeacon|eval\(|new Function|import\(|require\(|process\.|child_process|https?://' ~/.claude/skills/impl-plan/runtime/htmlplan.js
   ```

   At `06ec7b6` the output is exactly 2 lines: `:133` (the name-convention comment, `fetch( → net`) and `:434` (`const SVGNS = 'http://www.w3.org/2000/svg';`). Any other line needs review before use.

4. Re-apply the `pack.mjs` changes listed under Files onto the new upstream `pack.mjs`. Start from the diff of this copy against the old commit:

   ```bash
   diff -u <(git -C <clone> show 06ec7b6:html-plan/skills/html-plan/runtime/pack.mjs) ~/.claude/skills/impl-plan/runtime/pack.mjs
   ```

5. If `htmlplan.js` or `htmlplan.css` changed, send the upstream diff between the two commits to Code review (`htmlplan.js` runs in Node through `require` on every lint):

   ```bash
   git -C <clone> diff 06ec7b6 <new> -- html-plan/skills/html-plan/runtime/htmlplan.js html-plan/skills/html-plan/runtime/htmlplan.css
   ```

6. Update the commit in this file and in the provenance line of `pack.mjs`, then run `node --test ~/.claude/skills/impl-plan/runtime/pack.test.mjs`.
