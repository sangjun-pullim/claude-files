---
name: api-design
description: REST API design patterns for NestJS — resource naming, status codes, pagination, error responses, and validation. Only trigger for NestJS backend API projects, not for React/Next.js frontend or Electron projects.
---

# API Design Patterns

Decision checklist and workflow for designing a NestJS REST endpoint. For detailed formats (URL structure, response/error schemas, pagination params, filtering/sorting syntax, validation example, versioning rules), see `reference.md` in this directory.

## Do NOT use when

- GraphQL / tRPC / gRPC interfaces — REST conventions do not apply
- Changing only the internals of an existing endpoint (the contract stays the same)
- Frontend work that consumes the API rather than defines it

## Workflow

1. Name the resource: plural noun, kebab-case, no verbs in the URL.
2. Pick the HTTP method + status code for the operation.
3. Define the DTO and validate input with class-validator.
4. Shape the response/error using the standard envelope.
5. For list endpoints, choose a pagination strategy (offset vs cursor).
6. Confirm auth/authz and that no internal details leak.

→ Pull the exact patterns for each step from `reference.md`.

## Pre-ship Checklist

- [ ] URL follows naming conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method and status codes
- [ ] Input validated with DTO + class-validator
- [ ] Error responses use standard format
- [ ] Pagination for list endpoints (offset vs cursor — see reference.md)
- [ ] Auth/authz required (or explicitly public)
- [ ] No internal details leaked in error responses

$ARGUMENTS
