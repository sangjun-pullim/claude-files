---
name: db-migrations
description: Guide safe database migrations with Prisma — zero-downtime patterns, safety checklist, and common pitfalls. Prisma/PostgreSQL 마이그레이션 전용. raw SQL-only/비-Prisma 프로젝트, 프론트엔드/Electron 작업에는 사용하지 않음.
---

# Database Migration Patterns (Prisma/PostgreSQL)

## Do NOT use when

- 비-Prisma 프로젝트 (raw SQL-only, TypeORM, Drizzle, Knex 등)
- 단순 스키마 조회/확인 (마이그레이션 변경이 없는 경우)
- 프론트엔드/Electron 전용 작업 (DB 스키마 변경과 무관한 경우)

## How Prisma executes a migration — read this first

Most "correct Postgres advice" fails here because of *how Prisma runs it*, not the SQL:

- **A migration file with 2+ statements runs inside one transaction.** A file with a
  single statement does not. So `CREATE INDEX CONCURRENTLY` and any `COMMIT` inside a
  `DO $$` block **must be the only statement in their migration file** — otherwise they
  fail with `cannot run inside a transaction block` (P3018).
- **There are no down migrations.** A "rollback" is always a new forward migration, so
  every destructive step needs its reverse written before you ship it.
- **`migrate dev` can reset the database** when it detects drift. Never point it at a
  production or shared DB — `migrate deploy` is the only production command.
- **Renaming a field in `schema.prisma` generates `DROP` + `ADD`, not `RENAME`.** The
  data is lost unless you hand-edit the migration. This is the real reason renames go
  through expand-contract.

## Safety Checklist

Before applying any migration:

- [ ] New columns are nullable OR have a default value (never add NOT NULL without default)
- [ ] `CREATE INDEX CONCURRENTLY` / `COMMIT`-bearing blocks are ALONE in their migration file
- [ ] Data backfill is a separate migration from schema change
- [ ] Tested against production-sized data if table has 100K+ rows
- [ ] Reverse migration written (Prisma has no `down` — the rollback is a forward migration)

## Prisma Workflow

```bash
# Create migration from schema changes (LOCAL ONLY — can reset the DB on drift)
npx prisma migrate dev --name <description>

# Apply in production
npx prisma migrate deploy

# Create empty migration for custom SQL (concurrent index, data backfill)
npx prisma migrate dev --create-only --name <description>

# Run SQL outside the migration engine (no transaction wrapper)
npx prisma db execute --file ./script.sql --schema prisma/schema.prisma

# Regenerate client
npx prisma generate
```

## When a migration fails (P3009)

A failed migration blocks **every** later `migrate deploy` until it is resolved — retrying
does nothing. A partially applied migration is worse than none, so decide which it was:

```bash
# You manually finished the remaining DDL:
npx prisma migrate resolve --applied <migration_name>

# You manually reverted the partial DDL:
npx prisma migrate resolve --rolled-back <migration_name>
```

Then re-run `migrate deploy`. Check the real database state before choosing — a failed
`CREATE INDEX CONCURRENTLY` leaves an INVALID index that must be dropped first.

## Core Rules

- Add columns as nullable or with a default — never NOT NULL without default on an existing table.
- Rename via expand-contract (add → dual-write → backfill → switch read → drop), never in place.
- Remove code references before dropping a column.
- Keep schema changes and data backfills in separate migrations.
- Backfill large tables in batches, not a single UPDATE.

## Reference

Detailed examples (safe column addition, concurrent index, expand-contract rename, batched backfill PL/pgSQL, anti-pattern table) live in `reference.md` in this directory. Read it when you need the exact SQL/Prisma snippets.

$ARGUMENTS
