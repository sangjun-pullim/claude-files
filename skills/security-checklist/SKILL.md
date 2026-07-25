---
name: security-checklist
description: Security Checklist — perform a security audit on NestJS/Node.js projects. Use this skill when the user asks about security review, vulnerability check, OWASP compliance, hardcoded secrets scan, or wants to audit their NestJS/Node.js application for security issues. Only trigger for NestJS or Node.js backend projects, not for React/Next.js frontend-only or Electron projects.
---

# Security Checklist

Perform a security audit on the current codebase focused on NestJS/Node.js applications.

## Do NOT use when

- Frontend-only projects (React/Next.js/Electron) — the detection commands assume NestJS structure
- Fixing one already-identified vulnerability (this is a full sweep, not a targeted fix)
- Only a dependency CVE check is needed (`npm audit` alone is enough)

## How to run this

Each category has a **Find it** block. Run those first, then judge the results — do not
answer from reading code impressionistically. Adjust `src/` to the project's actual source
root. Commands use `rg` (ripgrep); substitute `grep -rn` where it is unavailable.

Never pipe a file list into `xargs rg` — run the second search in a shell loop instead.
An empty list makes `xargs` search the whole working directory and report false hits.

Report every category as PASS / WARN / FAIL with file:line evidence. A category with no
mechanical way to verify (marked *manual*) still needs an explicit judgment, not a skip.

## 1. Authentication & Authorization (OWASP A01/A07)

```bash
# Controllers with no guard anywhere in the file
for f in $(rg -l '@Controller\(' src); do rg -q '@UseGuards' "$f" || echo "no guard: $f"; done
# Is a guard registered globally instead?
rg -n 'APP_GUARD|useGlobalGuards' src
# Explicitly public routes — each one needs a reason
rg -n '@Public\(\)|@SkipAuth' src
```

- [ ] Every controller is covered by a guard — per-controller or via `APP_GUARD`
- [ ] Each `@Public()` route is intentionally public
- [ ] Role/ownership checks exist where a record belongs to a user (*manual* — guards prove authn, not authz)

## 2. Input Validation (OWASP A03)

```bash
# Is ValidationPipe registered, and does it strip unknown fields?
rg -n 'useGlobalPipes|APP_PIPE|ValidationPipe' src
rg -n 'whitelist|forbidNonWhitelisted' src
# DTO classes carrying no class-validator decorator
for f in $(rg -l 'class \w*Dto' src); do rg -q '@Is[A-Z]' "$f" || echo "unvalidated DTO: $f"; done
# Nested/array payloads need both to validate at all
rg -n '@ValidateNested|@Type\(' src
```

- [ ] `ValidationPipe` is global, with `whitelist: true`
- [ ] Every DTO has class-validator decorators
- [ ] Nested objects/arrays use `@ValidateNested()` + `@Type()`
- [ ] Query and path params are validated, not just bodies

## 3. Injection Prevention (OWASP A03)

```bash
# Prisma raw escape hatches — Unsafe variants take a plain string
rg -n '\$queryRawUnsafe|\$executeRawUnsafe' src
# Template interpolation inside a tagged raw query
rg -n '\$(query|execute)Raw`[^`]*\$\{' src
# Code and shell execution
rg -n '\beval\(|new Function\(|child_process|execSync?\(' src
```

- [ ] No raw SQL built by string concatenation or interpolation
- [ ] `$queryRaw` tagged templates only (parameterized), never `*Unsafe` with user input
- [ ] No `eval`/`new Function`/shell exec reachable from user input
- [ ] User input never lands in file paths or redirect targets unsanitized

## 4. Secrets & Configuration (OWASP A02)

```bash
rg -in "(api[_-]?key|secret|password|token)\s*[:=]\s*[\"'][^\"']{8,}" src
rg -n 'postgres://|mysql://|mongodb(\+srv)?://|redis://' src
git check-ignore .env && echo ".env ignored OK" || echo "WARN: .env not gitignored"
git log --all --name-only --pretty=format: -- '*.env' | sort -u   # ever committed?
```

- [ ] No hardcoded keys, tokens, passwords, or connection strings
- [ ] Secrets read through `ConfigService` / env only
- [ ] `.env` is gitignored **and** was never committed historically
- [ ] Secrets never appear in logs or error responses

## 5. Data Exposure (OWASP A01)

```bash
# Is any serialization layer in use?
rg -n 'ClassSerializerInterceptor|@Exclude\(\)|plainToInstance' src
# Sensitive fields that must never serialize
rg -n 'password|passwordHash|refreshToken|salt|mfaSecret' src --glob '*.entity.ts' --glob '*.model.ts'
# Handlers returning a repository/prisma result straight through
rg -n 'return (await )?this\.\w+\.(find|findMany|findUnique|findOne)' src
# Stack traces leaking from filters
rg -n '\.stack' src
```

- [ ] Sensitive fields excluded from responses (`@Exclude` + `ClassSerializerInterceptor`, or explicit `select`)
- [ ] Handlers return DTOs, not raw entities
- [ ] Production error responses carry no stack traces or internal details
- [ ] Logs contain no PII or credentials

## 6. Dependencies & Infrastructure

```bash
npm audit --audit-level=high
rg -n 'helmet\(' src
rg -n 'enableCors|origin:' src          # look for '*' or true in production config
rg -n 'ThrottlerModule|@Throttle' src
```

- [ ] No high/critical advisories outstanding
- [ ] Helmet enabled
- [ ] CORS uses an explicit origin allowlist, not `*`/`true`, in production
- [ ] Rate limiting on auth endpoints and public APIs

## 7. Interceptors & Middleware

```bash
rg -l 'Interceptor|ExceptionFilter' src
rg -n 'FileInterceptor|MulterModule|limits:|fileFilter' src
rg -n 'timeout' src
```

- [ ] Logging interceptors redact request/response secrets
- [ ] Exception filters sanitize output in production
- [ ] File uploads set size `limits` and a `fileFilter`
- [ ] Request timeout configured

## Output Format

```
## Security Audit Results

| Category | Status | Issues |
|----------|--------|--------|
| Auth & Authz | PASS/WARN/FAIL | ... |
| Input Validation | PASS/WARN/FAIL | ... |
| Injection Prevention | PASS/WARN/FAIL | ... |
| Secrets & Config | PASS/WARN/FAIL | ... |
| Data Exposure | PASS/WARN/FAIL | ... |
| Dependencies | PASS/WARN/FAIL | ... |
| Interceptors | PASS/WARN/FAIL | ... |

### Critical Issues
- (FAIL items with file:line and the recommended fix)

### Recommendations
- (WARN items with suggested improvements)

### Not Mechanically Verified
- (checks marked *manual*, and what judgment was made)
```
