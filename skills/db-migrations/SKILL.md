---
name: db-migrations
description: Guide safe database migrations with Prisma — zero-downtime patterns, safety checklist, and common pitfalls. Prisma/PostgreSQL 마이그레이션 전용. raw SQL-only/비-Prisma 프로젝트, 프론트엔드/Electron 작업에는 사용하지 않음.
---

# Database Migration Patterns (Prisma/PostgreSQL)

## Do NOT use when

- 비-Prisma 프로젝트 (raw SQL-only, TypeORM, Drizzle, Knex 등)
- 단순 스키마 조회/확인 (마이그레이션 변경이 없는 경우)
- 프론트엔드/Electron 전용 작업 (DB 스키마 변경과 무관한 경우)

## Safety Checklist

Before applying any migration:

- [ ] New columns are nullable OR have a default value (never add NOT NULL without default)
- [ ] Indexes on large tables use `CREATE INDEX CONCURRENTLY` (custom SQL migration)
- [ ] Data backfill is a separate migration from schema change
- [ ] Tested against production-sized data if table has 100K+ rows
- [ ] Rollback plan documented

## Prisma Workflow

```bash
# Create migration from schema changes
npx prisma migrate dev --name <description>

# Apply in production
npx prisma migrate deploy

# Create empty migration for custom SQL (concurrent index, data backfill)
npx prisma migrate dev --create-only --name <description>

# Regenerate client
npx prisma generate
```

## Core Rules

- Add columns as nullable or with a default — never NOT NULL without default on an existing table.
- Rename via expand-contract (add → dual-write → backfill → switch read → drop), never in place.
- Remove code references before dropping a column.
- Keep schema changes and data backfills in separate migrations.
- Backfill large tables in batches, not a single UPDATE.

## Reference

Detailed examples (safe column addition, concurrent index, expand-contract rename, batched backfill PL/pgSQL, anti-pattern table) live in `reference.md` in this directory. Read it when you need the exact SQL/Prisma snippets.

$ARGUMENTS
