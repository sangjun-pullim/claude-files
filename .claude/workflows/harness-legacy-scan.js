export const meta = {
  name: 'harness-legacy-scan',
  description: 'Read-only audit of the AI coding harness: find stale rules, redundant instructions, excessive global context, over-broad skills, unnecessary hooks/MCP, and product-feature overlap. Classify each into KEEP/SHRINK/MOVE/SPLIT/CONVERT/DELETE. No file is modified.',
  phases: [
    { title: 'Inventory', detail: 'Build canonical machine-readable inventory of harness files' },
    { title: 'Analyze', detail: '4 perspectives in parallel: global-context-tax, skill-quality, product-overlap, safety-permission' },
    { title: 'Classify', detail: 'Refactor Planner consolidates findings into action buckets' },
    { title: 'Adversarial', detail: 'Adversarial Reviewer challenges risky DELETE/SHRINK/MOVE calls' },
    { title: 'Synthesize', detail: 'Write the final Korean audit report with all required sections' },
  ],
}

const READONLY = `절대 규칙: 너는 읽기 전용 감사자다. 어떤 파일도 수정/삭제/포맷하지 마라. hooks, settings.json, allowed-tools, MCP 설정을 절대 건드리지 마라. Read/Grep/Glob/Bash(읽기 전용 명령만)로 분석만 한다. 결과는 사람에게 보내는 메시지가 아니라 구조화된 데이터다.`

const PRINCIPLES = `감사 원칙:
1. 좋은 하네스는 "반복되는 실제 실수"를 막아야 한다. 한 번도 일어나지 않은 가상의 실수를 막는 규칙은 비용이다.
2. 좋은 하네스는 과거 습관을 보존하려고 존재하면 안 된다.
3. 하네스는 더 붙이는 게 아니라 필요한 순간에만 나타나야 한다(lazy loading). 매 세션 무조건 로드되는 전역 지침은 비싸다.
4. 이번 감사의 목표는 규칙 추가가 아니라, 낡은 규칙을 찾아 줄일 후보를 분류하는 것이다.
5. 제품(Claude Code / Codex / Cursor) 기본 기능과 중복되는 커스텀 규칙/스킬/커맨드는 중복 후보다.
6. "전역 컨텍스트(CLAUDE.md + rules/*.md)"는 매 세션 시스템 프롬프트에 주입되므로 가장 비싼 토큰이다. 이것을 on-demand skill로 옮길 수 있으면 옮긴다.`

const INVENTORY_CONTEXT = `하네스 루트: /Users/pullim/.claude

[전역 컨텍스트 — 매 세션 시스템 프롬프트에 주입됨]
- CLAUDE.md (48줄)
- rules/agents.md (26줄)  — agent delegation 규칙
- rules/claude-md-audit.md (64줄) — CLAUDE.md 감사 프로토콜
- rules/second-brain.md (77줄) — docs/ 표준
- rules/standards.md (44줄) — 네이밍/코드/에러/테스트/git/보안 표준
(주의: AGENTS.md 없음, .cursor/rules 없음)

[커스텀 Skill — .claude/skills/*/SKILL.md, on-demand]
- api-design (118줄), db-migrations (128줄), impl-execute (107줄), impl-plan (187줄), security-checklist (78줄), tdd-workflow (64줄), verify (70줄)

[커스텀 Command — .claude/commands/*.md]
- docs-sync.md, check.md, weekly-report.md, init-docs.md, plan.md, commit.md, orchestrate.md

[커스텀 Agent — .claude/agents/*.md]
- reviewer.md, planner.md

[Hook — .claude/hooks/, settings.json에 연결]
- block-env-commit.sh (PreToolUse, Bash matcher — git add .env 차단)
- auto-format.sh (PostToolUse, Write|Edit matcher — prettier 실행)

[settings.json 핵심]
- permissions.allow: Read, Glob, Grep, Bash(npm/npx/pnpm/yarn/node *), Bash(git status/diff/log/add/commit/branch/checkout/stash *)
- permissions.deny: Bash(rm -rf *), Bash(curl *), Bash(wget *), Read(.env), Read(.env.*)
- env: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
- effortLevel: high, skipAutoPermissionPrompt: true
- statusLine: python3 statusline-command.sh
- mcpServers: playwright (npx @playwright/mcp@latest)
- enabledPlugins: typescript-lsp, skill-creator, claude-md-management (claude-plugins-official)

[.claude/settings.local.json]
- allow: WebFetch(domain:raw.githubusercontent.com), Bash(git -C /Users/pullim/.claude diff --stat CLAUDE.md)

[MCP (auth cache 기준, 제품/계정 레벨 가능성)]
- claude.ai Gmail / Google Calendar / Google Drive

[플러그인 oh-my-claudecode (omc)]
- .omc-config.json: defaultExecutionMode=ultrawork, team.maxAgents=3

[제품 기본 기능 참고 — 중복 판단용]
Claude Code 기본 제공: /commit, /code-review, /security-review, /init, /plan(skill), verify(skill), run(skill), update-config(skill), claude-md-management 플러그인(revise-claude-md, claude-md-improver), skill-creator. 즉 commit/plan/check/verify/docs/orchestrate/claude-md-audit 류는 제품 기능과 겹칠 수 있다.`

const FINDING_ITEM = {
  type: 'object',
  required: ['path', 'currentPurpose', 'problem', 'evidence', 'recommendedAction', 'suggestedLocation', 'riskLevel', 'confidence', 'harnessDietAuto'],
  properties: {
    path: { type: 'string', description: '대상 파일/설정 경로 (예: rules/standards.md 또는 settings.json:permissions.allow)' },
    currentPurpose: { type: 'string', description: '현재 이 항목의 목적' },
    problem: { type: 'string', description: '발견한 문제(낡음/중복/과도한 컨텍스트/너무 넓은 권한 등)' },
    evidence: { type: 'string', description: '근거 — 실제 파일 내용/제품 기능 인용' },
    recommendedAction: { type: 'string', enum: ['KEEP', 'SHRINK', 'MOVE', 'SPLIT', 'CONVERT', 'DELETE'] },
    suggestedLocation: { type: 'string', description: 'MOVE/SPLIT/CONVERT 시 추천 위치. 없으면 "-"' },
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: '변경 시 위험도' },
    confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: '발견의 신뢰도' },
    harnessDietAuto: { type: 'boolean', description: '/harness-diet에서 자동 처리 가능한 low-risk 변경인지' },
  },
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  required: ['perspective', 'findings'],
  properties: {
    perspective: { type: 'string' },
    summary: { type: 'string', description: '이 관점의 한 줄 총평' },
    findings: { type: 'array', items: FINDING_ITEM },
  },
}

// ---------- Phase 1: Inventory ----------
phase('Inventory')
const inventory = await agent(
  `${READONLY}\n\n역할: Inventory Agent. 하네스 관련 파일과 설정을 빠짐없이 목록화한다.\n\n${INVENTORY_CONTEXT}\n\n작업: 위 목록을 실제 파일을 열어 검증/보강하라. 각 항목의 카테고리, 줄 수(대략), 매 세션 로드 여부(alwaysLoaded), 한 줄 목적을 채운다. 빠진 파일이 있으면 추가하라. 결과는 후속 분석 에이전트가 참조할 정식 인벤토리다.`,
  {
    label: 'inventory',
    phase: 'Inventory',
    agentType: 'Explore', model: 'opus',
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['path', 'category', 'alwaysLoaded', 'purpose'],
            properties: {
              path: { type: 'string' },
              category: { type: 'string', enum: ['global-context', 'skill', 'command', 'agent', 'hook', 'mcp', 'plugin', 'settings', 'other'] },
              approxLines: { type: 'number' },
              alwaysLoaded: { type: 'boolean', description: '매 세션 시스템 프롬프트/컨텍스트에 주입되는지' },
              purpose: { type: 'string' },
            },
          },
        },
        notes: { type: 'string', description: '인벤토리 과정에서 발견한 특이사항(중복/누락 등)' },
      },
    },
  }
)

const inventoryJson = JSON.stringify(inventory, null, 2)
log(`인벤토리 완료: ${inventory.items?.length ?? 0}개 항목`)

// ---------- Phase 2: Analyze (4 perspectives, parallel) ----------
phase('Analyze')
const ANALYZERS = [
  {
    key: 'global-context-tax',
    prompt: `역할: Global Context Tax Agent. 매 세션 무조건 주입되는 전역 지침(CLAUDE.md, rules/*.md, AGENTS.md, Cursor Rules)이 불필요한 컨텍스트 비용을 만드는지 분석한다.\n\n분석 포인트:\n- 매 세션 필요하지 않은데 전역에 박혀 있는 지침 → on-demand skill로 옮길 후보\n- rules/*.md 중 특정 작업 타입에서만 필요한 것(예: second-brain.md docs 작업 전용, claude-md-audit.md는 CLAUDE.md 편집 시에만)\n- CLAUDE.md 내부 또는 rules 간 중복/장황함\n- "실제 반복 실수 방지"가 아니라 일반론(원칙 나열)이라 토큰만 먹는 줄\n실제 파일을 모두 읽고 줄 단위로 근거를 들어라.`,
  },
  {
    key: 'skill-quality',
    prompt: `역할: Skill Quality Agent. .claude/skills/* 각 Skill이 지금도 필요한지, description(frontmatter)이 너무 넓어 오발동하지 않는지, SKILL.md가 너무 길지 않은지 분석한다.\n\n분석 포인트:\n- description이 과도하게 넓어 엉뚱한 상황에 트리거될 위험\n- SKILL.md 본문이 길어(예: 100줄 초과) reference.md/examples.md로 분리해야 할 것\n- 제품 기본 기능/다른 skill과 기능이 겹치는 skill\n- 거의 안 쓰일 것 같은(스택과 안 맞거나 너무 특수한) skill\n각 skill의 SKILL.md frontmatter(name/description)와 본문을 실제로 읽고 줄 수/넓이를 평가하라.`,
  },
  {
    key: 'product-overlap',
    prompt: `역할: Product Overlap Agent. 예전엔 필요했지만 이제 Claude Code/Codex/Cursor 제품 기본 기능과 중복될 가능성이 있는 커스텀 규칙/skill/command/agent를 찾는다.\n\n제품 기본 기능(참고): /commit, /code-review, /security-review, /init, plan(skill), verify(skill), run(skill), update-config(skill), claude-md-management 플러그인(revise-claude-md, claude-md-improver), skill-creator, 네이티브 subagent/agent-teams, 네이티브 Workflow.\n\n특히 의심:\n- commands/commit.md vs 제품 /commit\n- commands/plan.md vs skills/impl-plan vs agents/planner vs 제품 plan skill\n- commands/check.md, skills/verify vs 제품 /code-review, verify skill\n- commands/orchestrate.md vs 제품 workflow/agent-teams\n- commands/docs-sync.md, init-docs.md vs 제품 /init\n- rules/claude-md-audit.md vs claude-md-management 플러그인\n- agents/reviewer.md, planner.md vs 제품 내장 reviewer/planner subagent\n각 커스텀 항목을 실제로 열어 제품 기능과 무엇이 다르고 무엇이 겹치는지 구체적으로 대조하라. 단순 중복이면 DELETE, 고유 가치가 있으면 KEEP/SHRINK로.`,
  },
  {
    key: 'safety-permission',
    prompt: `역할: Safety and Permission Agent. hooks, allowed-tools(permissions), MCP 설정이 너무 넓은 권한을 주는지 분석한다.\n\n분석 포인트:\n- settings.json permissions.allow가 과도하게 넓은지(예: Bash(node *), Bash(npx *)는 임의 코드 실행 가능)\n- deny 목록의 허점(예: curl/wget만 막고 다른 네트워크 경로 열림, rm -rf만 막음)\n- hooks가 의도대로 안전하게 동작하는지, 너무 광범위한 matcher인지\n- MCP(playwright, claude.ai Gmail/Calendar/Drive)가 필요 이상 권한/공격면을 주는지\n- skipAutoPermissionPrompt:true 의 위험\n주의: 이건 분석만 한다. 권한을 바꾸자는 게 아니라 위험을 평가하고 분류한다. hook/MCP/권한은 위험도 HIGH로 두고 사람 승인 필요로 표시하는 경향을 가져라.`,
  },
]

const analyses = await parallel(
  ANALYZERS.map((a) => () =>
    agent(
      `${READONLY}\n\n${PRINCIPLES}\n\n정식 인벤토리(JSON):\n${inventoryJson}\n\n${a.prompt}\n\n각 발견 항목을 스키마 형식으로 보고하라. recommendedAction은 KEEP/SHRINK/MOVE/SPLIT/CONVERT/DELETE 중 하나. 근거(evidence)에는 실제 파일 내용이나 제품 기능을 인용하라.`,
      { label: `analyze:${a.key}`, phase: 'Analyze', agentType: 'Explore', model: 'opus', schema: ANALYSIS_SCHEMA }
    )
  )
)

const validAnalyses = analyses.filter(Boolean)
const allFindings = validAnalyses.flatMap((r) => (r.findings || []).map((f) => ({ ...f, source: r.perspective })))
log(`분석 완료: ${validAnalyses.length}/4 관점, 총 ${allFindings.length}개 발견`)

// ---------- Phase 3: Classify (Refactor Planner) ----------
phase('Classify')
const classified = await agent(
  `${READONLY}\n\n${PRINCIPLES}\n\n역할: Refactor Planner. 아래는 4개 관점 에이전트가 찾은 발견 목록이다. 중복 항목은 병합하고, 각 항목을 최종적으로 KEEP/SHRINK/MOVE/SPLIT/CONVERT/DELETE로 분류하라.\n\n정식 인벤토리(JSON):\n${inventoryJson}\n\n발견 목록(JSON):\n${JSON.stringify(allFindings, null, 2)}\n\n규칙:\n- 같은 path에 대한 중복 발견은 하나로 병합하고 가장 강한 근거를 합쳐라.\n- 각 항목의 최종 recommendedAction, suggestedLocation, riskLevel, confidence, harnessDietAuto를 확정하라.\n- 권한/hook/MCP 관련은 riskLevel을 보수적으로(MEDIUM 이상) 두라.\n- 인벤토리에 있지만 아무 관점도 다루지 않은 항목 중 명백히 KEEP인 것도 간단히 포함하라(전체 그림용).\n결과는 병합·확정된 finding 배열이다.`,
  {
    label: 'refactor-planner',
    phase: 'Classify',
    agentType: 'Explore', model: 'opus',
    schema: {
      type: 'object',
      required: ['findings'],
      properties: {
        findings: { type: 'array', items: FINDING_ITEM },
        rationale: { type: 'string', description: '분류 시 적용한 핵심 판단 기준 요약' },
      },
    },
  }
)

const finalFindings = classified.findings || []
log(`분류 완료: ${finalFindings.length}개 확정 항목`)

// ---------- Phase 4: Adversarial Review ----------
phase('Adversarial')
const risky = finalFindings.filter((f) => f.recommendedAction !== 'KEEP')
const adversarial = await agent(
  `${READONLY}\n\n역할: Adversarial Reviewer. 아래는 SHRINK/MOVE/SPLIT/CONVERT/DELETE로 분류된 항목들이다. 이걸 줄이거나 삭제하면 "오히려 위험해질 수 있는" 항목을 반박 검토하라.\n\n반박 관점:\n- 이 규칙/skill/hook이 막던 "실제 반복 실수"가 있었는가? 제거하면 그 실수가 돌아오는가?\n- 제품 기본 기능과 중복돼 보이지만 실제로는 미묘하게 다른 고유 가치(한국어 커밋 컨벤션, 특정 스택 규칙 등)가 있는가?\n- 권한/hook 제거가 보안 약화로 이어지는가?\n- "전역→skill 이동"이 실제로는 트리거 누락으로 규칙이 안 먹게 만드는가?\n\n인벤토리:\n${inventoryJson}\n\n검토 대상(JSON):\n${JSON.stringify(risky, null, 2)}\n\n각 항목에 대해 원래 조치를 유지할지, 더 보수적으로 바꿀지(revisedAction), 그 이유를 보고하라. 반박할 게 없으면 originalAction을 confirm하라.`,
  {
    label: 'adversarial-reviewer',
    phase: 'Adversarial',
    agentType: 'Explore', model: 'opus',
    schema: {
      type: 'object',
      required: ['challenges'],
      properties: {
        challenges: {
          type: 'array',
          items: {
            type: 'object',
            required: ['path', 'originalAction', 'verdict', 'revisedAction', 'reason'],
            properties: {
              path: { type: 'string' },
              originalAction: { type: 'string' },
              verdict: { type: 'string', enum: ['CONFIRM', 'DOWNGRADE', 'REJECT'], description: 'CONFIRM=원조치 유지, DOWNGRADE=더 보수적으로, REJECT=조치 철회(KEEP 권고)' },
              revisedAction: { type: 'string', enum: ['KEEP', 'SHRINK', 'MOVE', 'SPLIT', 'CONVERT', 'DELETE'] },
              reason: { type: 'string' },
            },
          },
        },
        overallCaution: { type: 'string', description: '전체적으로 사람이 반드시 손대야 할 위험 영역 요약' },
      },
    },
  }
)

log(`반박 검토 완료: ${adversarial.challenges?.length ?? 0}개 항목 검토`)

// ---------- Phase 5: Synthesize final Korean report ----------
phase('Synthesize')
const report = await agent(
  `${READONLY}\n\n${PRINCIPLES}\n\n역할: 최종 종합 작성자. 아래 데이터로 한국어 하네스 감사 리포트를 마크다운으로 작성하라. 이 리포트가 너의 반환값이며 사람에게 그대로 보여진다.\n\n[인벤토리]\n${inventoryJson}\n\n[확정 분류 findings]\n${JSON.stringify(finalFindings, null, 2)}\n\n[분류 근거]\n${classified.rationale || ''}\n\n[반박 검토 결과]\n${JSON.stringify(adversarial, null, 2)}\n\n작성 지침:\n- 반박 검토(Adversarial)에서 verdict가 DOWNGRADE/REJECT인 항목은 최종 조치를 그에 맞게 반영하라(예: REJECT면 KEEP, DOWNGRADE면 더 보수적 조치).\n- 발견 항목은 카테고리별로 묶고, 각 항목마다 다음 형식을 지켜라:\n  - 경로 / 현재 목적 / 발견한 문제 / 근거 / 추천 조치 / (옮긴다면) 추천 위치 / 변경 시 위험도 / 신뢰도 / /harness-diet 자동 처리 가능 여부\n  표 형태로 압축해도 좋다(가독성 우선).\n\n리포트 마지막에 아래 9개 섹션을 반드시 이 순서로 포함하라:\n1. 전체 요약\n2. 유지해야 할 항목 (KEEP)\n3. 줄여야 할 항목 (SHRINK)\n4. 전역 지침에서 Skill로 옮길 항목 (MOVE)\n5. Skill에서 reference.md 또는 examples.md로 분리할 항목 (SPLIT)\n6. 삭제 후보 (DELETE)\n7. 사람이 직접 승인해야 하는 위험한 변경 (권한/hook/MCP 등 HIGH 위험)\n8. /harness-diet로 넘겨도 되는 low-risk 변경 목록 (harnessDietAuto=true)\n9. /harness-diet 실행용 추천 프롬프트 (복붙 가능한 형태로, 읽기 전용이 아니라 실제 변경을 수행하되 위험 항목은 제외하라는 지시 포함)\n\n간결하고 실행가능하게. 장황한 서론 금지.`,
  { label: 'synthesis', phase: 'Synthesize', agentType: 'Explore', model: 'opus' }
)

return report
