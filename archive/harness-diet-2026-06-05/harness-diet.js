export const meta = {
  name: 'harness-diet',
  description: 'Apply ONLY low-risk harness improvements from the harness-legacy-scan report: archive a redundant command, split long SKILL.md into reference.md, narrow over-broad skill descriptions, add "do not use when" sections. Deletion candidates are MOVED to .claude/archive/, never deleted. Hooks/MCP/permissions/app-code are never touched.',
  phases: [
    { title: 'Preflight', detail: 'Verify preconditions against live files; produce go/defer decisions' },
    { title: 'Apply', detail: 'Per-target agents (distinct files, no conflict): archive, split, narrow' },
    { title: 'Verify', detail: 'Validate frontmatter, references, archive, and that nothing forbidden was touched' },
    { title: 'Report', detail: 'Korean report: changed files, reasons, before/after, diff, behavior delta, manual-approval, 5 smoke tests' },
  ],
}

const ROOT = '/Users/pullim/.claude'
const TODAY = '2026-06-05'
const ARCHIVE = `${ROOT}/archive/harness-diet-${TODAY}`

const CONSTRAINTS = `절대 금지(이번 단계):
- 파일을 영구 삭제하지 마라(삭제 후보는 ${ARCHIVE}/ 로 이동).
- hooks(${ROOT}/hooks/*, settings.json hooks 와이어링) 절대 수정 금지.
- MCP 설정(settings.json mcpServers, plugins/config.json, 계정 MCP) 절대 수정 금지.
- permissions(allow/deny), skipAutoPermissionPrompt 절대 수정/확대 금지.
- 프로젝트 애플리케이션 코드 수정 금지.
- 테스트/빌드/배포 명령 실행 금지(npm test/build, prisma migrate 등 금지). 읽기·파일이동·mkdir·git status/diff만 허용.
- 너에게 배정된 '단 하나의 대상 파일/스킬' 외 다른 파일은 건드리지 마라. CLAUDE.md 본문은 수정하지 마라.
- 변경 이유를 파일 안에 과도한 주석으로 남기지 마라. 이유는 반환 데이터(summary)에만 적어라.
- 불확실하면 수정하지 말고 status='skipped'로 사유를 남겨라.`

const PRINCIPLES = `개선 원칙: 하네스는 필요한 순간에만 나타나야 한다. 전역 지침은 짧고 안정적인 원칙만. 반복 절차는 Skill로. 긴 설명/예시/체크리스트는 reference.md로 분리(삭제 아님, 이동). 안전장치는 함부로 건드리지 않는다.`

const CHANGE_RESULT = {
  type: 'object',
  required: ['id', 'status', 'summary'],
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['applied', 'skipped', 'failed'] },
    action: { type: 'string' },
    filesCreated: { type: 'array', items: { type: 'string' } },
    filesMoved: { type: 'array', items: { type: 'string' }, description: '"from -> to" 형식' },
    filesEdited: { type: 'array', items: { type: 'string' } },
    before: { type: 'string', description: '변경 전 핵심 상태(줄 수/구조)' },
    after: { type: 'string', description: '변경 후 핵심 상태(줄 수/구조)' },
    summary: { type: 'string', description: '무엇을 왜 바꿨는지 한 단락' },
    reason: { type: 'string', description: 'skipped/failed 사유. 없으면 "-"' },
  },
}

// ---------- Phase 1: Preflight ----------
phase('Preflight')
const pre = await agent(
  `${CONSTRAINTS}\n\n역할: Preflight 검증자. 아래 변경을 적용해도 되는지 실제 파일을 읽어 확인만 한다(이 단계에서는 수정 금지).\n\n확인 항목:\n1. ${ROOT}/CLAUDE.md 에 "구현 전 계획"을 강제하는 규칙(예: "Always plan before implementing")이 아직 살아있는가? (commands/plan.md 를 아카이브로 옮겨도 plan-first 습관이 전역 규칙으로 남는지 확인하는 게이트)\n2. ${ROOT}/commands/plan.md 가 존재하는가?\n3. 다음 스킬들의 실제 frontmatter(name/description)와 본문 줄 수를 읽어 보고하라: api-design, db-migrations, tdd-workflow. 각 스킬의 frontmatter name이 디렉터리명과 일치하는지, description에 스택 가드(예: NestJS/Prisma만)가 있는지, 100줄 초과인지.\n4. CLAUDE.md가 docs/claude-md-audit.md 를 참조하는 위치(참고용, 이번엔 수정 안 함).\n\n실제 파일을 Read로 열어 확인하라. 추측 금지.`,
  {
    label: 'preflight',
    phase: 'Preflight',
    schema: {
      type: 'object',
      required: ['planFirstRulePresent', 'planMdExists', 'skillChecks', 'blockers'],
      properties: {
        planFirstRulePresent: { type: 'boolean' },
        planFirstEvidence: { type: 'string' },
        planMdExists: { type: 'boolean' },
        skillChecks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['skill', 'frontmatterName', 'nameMatchesDir', 'lineCount'],
            properties: {
              skill: { type: 'string' },
              frontmatterName: { type: 'string' },
              nameMatchesDir: { type: 'boolean' },
              descriptionHasStackGuard: { type: 'boolean' },
              lineCount: { type: 'number' },
              currentDescription: { type: 'string' },
            },
          },
        },
        claudeMdAuditRef: { type: 'string' },
        blockers: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
    },
  }
)
log(`Preflight: plan-first=${pre.planFirstRulePresent}, plan.md=${pre.planMdExists}, skills=${pre.skillChecks?.length}`)

// ---------- Phase 2: Apply (distinct files, parallel) ----------
phase('Apply')

const archiveTask = () =>
  agent(
    `${CONSTRAINTS}\n\n${PRINCIPLES}\n\n역할: 'archive-plan-cmd' 작업자. 전제 충족 시 ${ROOT}/commands/plan.md 를 영구삭제가 아니라 아카이브로 이동한다.\n\nPreflight 결과: plan-first 전역 규칙 존재=${pre.planFirstRulePresent} (근거: ${pre.planFirstEvidence || '-'}). plan.md 존재=${pre.planMdExists}.\n\n절차:\n1. plan-first 전역 규칙이 없으면(=false) 절대 이동하지 말고 status='skipped', reason에 사유.\n2. 충족 시: \`mkdir -p ${ARCHIVE}\` 실행 후, 가능하면 \`git -C ${ROOT} mv commands/plan.md ${ARCHIVE}/plan.md\` 로 이동(히스토리 보존). git mv 실패 시 \`mv ${ROOT}/commands/plan.md ${ARCHIVE}/plan.md\`.\n3. 이동 후 ${ROOT}/commands/plan.md 가 사라지고 ${ARCHIVE}/plan.md 가 생겼는지 \`ls\`로 확인.\n사유: 제품 /plan + impl-plan 스킬과 삼중 중복(고유가치 없음). 단 plan-first 습관은 CLAUDE.md 전역 규칙이 유지.`,
    { label: 'apply:archive-plan', phase: 'Apply', schema: CHANGE_RESULT }
  )

const apiDesignTask = () =>
  agent(
    `${CONSTRAINTS}\n\n${PRINCIPLES}\n\n역할: 'split-api-design' 작업자. 대상은 ${ROOT}/skills/api-design/SKILL.md 뿐이다.\n\n목표: 길고 정적인 레퍼런스(상세 URL 구조 규칙, 페이지네이션/필터/정렬 포맷, 상태코드 표, 에러 응답 스키마, 버저닝 등 "그때그때 참고하는" 내용)를 같은 디렉터리의 reference.md 로 이동(삭제 아님)하고, SKILL.md 본문은 트리거에 필요한 핵심 의사결정 체크리스트 + 워크플로 + reference.md 안내 1~2줄만 남겨 짧게 만든다.\n\n규칙:\n- 내용 손실 금지(잘라낸 부분은 reference.md로 옮긴다).\n- frontmatter(name/description)는 이미 스택 가드(NestJS 전용)가 있으면 건드리지 마라. name이 디렉터리(api-design)와 다르면 그때만 정정.\n- SKILL.md에 "상세 패턴은 reference.md 참고" 식 명시 포인터를 넣어 스킬이 여전히 동작하게 하라.\n- before(원래 줄 수)/after(분리 후 SKILL.md 줄 수, reference.md 줄 수)를 보고하라.`,
    { label: 'apply:split-api-design', phase: 'Apply', schema: CHANGE_RESULT }
  )

const dbMigrationsTask = () =>
  agent(
    `${CONSTRAINTS}\n\n${PRINCIPLES}\n\n역할: 'split-db-migrations' 작업자. 대상은 ${ROOT}/skills/db-migrations/SKILL.md 뿐이다.\n\n세 가지 변경(모두 이 파일/디렉터리 한정):\n1. SPLIT: 긴 SQL/PL-pgSQL 백필 예시, anti-pattern 표, 상세 zero-downtime 단계별 코드 등 "참고용" 내용을 같은 디렉터리 reference.md 로 이동(삭제 아님). SKILL.md에는 안전 체크리스트 + 핵심 워크플로 + reference.md 포인터만 남겨 짧게.\n2. DESCRIPTION 좁히기: frontmatter description에 스택 가드가 없으면 추가하라 — 이 스킬은 Prisma 기반 프로젝트 전용임을 명확히(예: "Prisma/PostgreSQL 마이그레이션 전용. raw SQL-only/비-Prisma 프로젝트나 프론트엔드에는 사용하지 않음").\n3. "Do NOT use when" 섹션을 SKILL.md 본문에 추가: 비-Prisma 프로젝트, 단순 스키마 조회, 프론트엔드/Electron 전용 작업 등에서는 트리거하지 말 것.\n\n규칙: 내용 손실 금지. name이 디렉터리(db-migrations)와 다르면 정정. frontmatter는 유효한 YAML 유지. before/after 줄 수 보고.`,
    { label: 'apply:split-db-migrations', phase: 'Apply', schema: CHANGE_RESULT }
  )

const tddTask = () =>
  agent(
    `${CONSTRAINTS}\n\n${PRINCIPLES}\n\n역할: 'narrow-tdd' 작업자. 대상은 ${ROOT}/skills/tdd-workflow/SKILL.md 뿐이다(64줄 정도라 분리는 불필요).\n\n두 가지 변경:\n1. DESCRIPTION 좁히기: 현재 description의 자동 호출 범위가 너무 넓다. RED→GREEN→REFACTOR TDD 사이클이 실제로 가치 있는 상황(새 기능 구현, 버그 재현 후 수정)으로 트리거 범위를 좁혀 다시 써라. 너무 광범위한 "개발/작업" 류 표현 제거.\n2. "Do NOT use when" 섹션을 본문에 추가: 탐색적 스파이크/throwaway 프로토타입, 설정/문서 전용 변경, 단순 리네임, 테스트가 무의미한 작업에서는 사용하지 말 것.\n\n규칙: 핵심 RED/GREEN/REFACTOR 절차 내용은 보존. frontmatter 유효 YAML 유지. name이 디렉터리(tdd-workflow)와 다르면 정정. before/after 보고.`,
    { label: 'apply:narrow-tdd', phase: 'Apply', schema: CHANGE_RESULT }
  )

const tasks = [apiDesignTask, dbMigrationsTask, tddTask]
if (pre.planFirstRulePresent && pre.planMdExists) {
  tasks.unshift(archiveTask)
} else {
  log('archive-plan 건너뜀: plan-first 전역 규칙 또는 plan.md 미확인 → 수동 승인으로')
}

const applyResults = (await parallel(tasks)).filter(Boolean)
log(`Apply 완료: ${applyResults.filter((r) => r.status === 'applied').length}/${applyResults.length} 적용`)

// ---------- Phase 3: Verify ----------
phase('Verify')
const verify = await agent(
  `${CONSTRAINTS}\n\n역할: 검증자. 아래 적용 결과가 안전하고 일관적인지 실제 파일/끄로 확인한다(추가 수정 금지, 읽기/검사만).\n\n적용 결과(JSON):\n${JSON.stringify(applyResults, null, 2)}\n\n검증 항목:\n1. 변경된 각 SKILL.md의 frontmatter가 여전히 유효한 YAML이고 name/description이 살아있는가.\n2. reference.md 가 생성된 경우 SKILL.md 본문이 그것을 명시 참조하는가(끊긴 링크/유실 내용 없는가).\n3. ${ARCHIVE}/plan.md 가 존재하고 ${ROOT}/commands/plan.md 는 사라졌는가(아카이브가 시도된 경우).\n4. 금지 영역(hooks/*, settings.json, plugins/config.json MCP, permissions, 앱 코드, CLAUDE.md 본문)이 건드려지지 않았는가 — \`git -C ${ROOT} status --short\` 와 \`git -C ${ROOT} diff --stat\` 로 확인하고, 변경 목록에 금지 파일이 있으면 forbiddenTouched에 적어라.\n5. 내용 손실(분리 과정에서 사라진 섹션)이 없는가.\n\ngit status/diff 명령만 실행하라(테스트/빌드 금지).`,
  {
    label: 'verify',
    phase: 'Verify',
    schema: {
      type: 'object',
      required: ['allValid', 'checks', 'forbiddenTouched'],
      properties: {
        allValid: { type: 'boolean' },
        checks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['item', 'ok', 'detail'],
            properties: { item: { type: 'string' }, ok: { type: 'boolean' }, detail: { type: 'string' } },
          },
        },
        forbiddenTouched: { type: 'array', items: { type: 'string' }, description: '금지 영역이 변경됐다면 그 경로. 없으면 빈 배열' },
        gitStatusShort: { type: 'string' },
        gitDiffStat: { type: 'string' },
      },
    },
  }
)
log(`Verify: allValid=${verify.allValid}, forbiddenTouched=${verify.forbiddenTouched?.length ?? 0}`)

// ---------- Phase 4: Report ----------
phase('Report')
const MANUAL = `이번에 적용하지 않고 사람 승인으로 남긴 항목(감사 리포트 기준 MED 이상 또는 안전장치/전역 본문 관련):
- impl-plan SKILL.md 분리(MED): 187줄로 가장 길지만 Output Format 템플릿이 상시 필요해 분리 시 품질 저하 위험.
- rules/claude-md-audit.md → skill CONVERT(MED): CLAUDE.md 편집 안전장치라 트리거가 약해지면 가드 손실 위험. CLAUDE.md line48 참조 동시 수정 필요.
- rules/standards.md 고아 연결(MED): 어디서도 참조되지 않는 죽은 컨텍스트지만 연결하려면 CLAUDE.md 본문 수정 동반. 한국어 커밋 컨벤션 보존 필수.
- skills/verify → pre-push-verify 재명명(MED): 제품 verify/check와 name 충돌. 재명명은 호출 경로 영향.
- settings.json node/npx allow 협소화, deny 보강 등 권한/hook/MCP 일체: 이번 단계 금지(별도 사람 승인).`

const report = await agent(
  `역할: 최종 보고서 작성자(한국어 마크다운). 이 텍스트가 너의 반환값이며 사람에게 그대로 보인다.\n\n[적용 결과]\n${JSON.stringify(applyResults, null, 2)}\n\n[검증 결과]\n${JSON.stringify(verify, null, 2)}\n\n[Preflight]\n${JSON.stringify(pre, null, 2)}\n\n[수동 승인으로 남긴 항목]\n${MANUAL}\n\n다음 7개 섹션을 이 순서로 작성하라:\n1. 변경한 파일 목록 (생성/이동/수정 구분)\n2. 파일별 변경 이유\n3. Before / After 요약 (줄 수·구조 변화 표)\n4. diff 요약 (verify의 gitDiffStat/gitStatusShort 활용)\n5. Claude의 행동이 어떻게 달라질 수 있는지 (예: db-migrations가 비-Prisma 프로젝트에서 더 이상 오발동 안 함, plan.md 제거돼도 plan-first는 유지 등)\n6. 아직 사람이 승인해야 하는 high-risk 항목 (수동 목록 + 권한/hook/MCP)\n7. 새 하네스를 검증하기 위한 smoke-test 프롬프트 5개 — 각 프롬프트는 복붙 가능하고, '기대 결과'를 한 줄 덧붙여라. 최소 1개는 네거티브 테스트(좁힌 스킬이 엉뚱한 상황에서 트리거되지 않아야 함)로 구성.\n\n검증에서 forbiddenTouched가 비어있지 않거나 allValid=false면 맨 위에 ⚠️ 경고를 굵게 표시하라. 간결하게, 장황한 서론 금지.`,
  { label: 'report', phase: 'Report' }
)

return report
