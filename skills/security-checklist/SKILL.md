# Security Checklist

Perform a security audit on the current codebase focused on NestJS/Node.js applications.

## Instructions

Scan the codebase and check each category below. Report findings as a checklist with PASS/FAIL/WARN status for each item.

## Checklist

### 1. Authentication & Authorization (OWASP A01/A07)
- [ ] All endpoints have appropriate Guards (`@UseGuards`)
- [ ] JWT/session validation is applied globally or per-controller
- [ ] Role-based access control is enforced where needed
- [ ] No endpoints are accidentally public without `@Public()` decorator

### 2. Input Validation (OWASP A03)
- [ ] All DTOs use `class-validator` decorators (`@IsString`, `@IsEmail`, etc.)
- [ ] `ValidationPipe` is enabled globally or per-endpoint
- [ ] Array/nested object inputs are validated with `@ValidateNested()` and `@Type()`
- [ ] Query params and path params are validated (not just body)

### 3. Injection Prevention (OWASP A03)
- [ ] No raw SQL queries with string interpolation — use parameterized queries or Prisma
- [ ] No `eval()`, `new Function()`, or `child_process.exec()` with user input
- [ ] Template rendering escapes user input (no XSS via server-side rendering)
- [ ] No unsanitized user input in shell commands, file paths, or redirects

### 4. Secrets & Configuration (OWASP A02)
- [ ] No hardcoded API keys, tokens, passwords, or connection strings in source code
- [ ] Secrets loaded via `ConfigService` or environment variables only
- [ ] `.env` files are in `.gitignore`
- [ ] No secrets logged or exposed in error responses

### 5. Data Exposure (OWASP A01)
- [ ] Sensitive fields excluded from API responses (passwords, tokens, internal IDs)
- [ ] DTOs or serialization groups control response shape — no raw entity returns
- [ ] Error responses don't leak stack traces or internal details in production
- [ ] Logging doesn't include PII or sensitive data

### 6. Dependencies & Infrastructure
- [ ] No known vulnerable dependencies (`npm audit` or equivalent)
- [ ] Helmet middleware enabled for HTTP header security
- [ ] CORS configured with explicit allowed origins (not `*` in production)
- [ ] Rate limiting applied to auth endpoints and public APIs

### 7. Interceptors & Middleware
- [ ] Logging interceptor doesn't capture sensitive request/response data
- [ ] Exception filters sanitize error output for production
- [ ] File upload limits and type validation are configured
- [ ] Request timeout is configured to prevent slow-loris attacks

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
- (list any FAIL items with file paths and recommended fixes)

### Recommendations
- (list WARN items with suggested improvements)
```
