# Database Migration Reference (Prisma/PostgreSQL)

Detailed examples and patterns. The SKILL.md keeps the safety checklist and core workflow; this file holds the long examples.

## Safe Column Addition

```prisma
// GOOD: nullable column
model User {
  avatarUrl String? @map("avatar_url")
}

// GOOD: column with default (Postgres 11+ is metadata-only, no table rewrite)
model User {
  isActive Boolean @default(true) @map("is_active")
}

// BAD: NOT NULL without default on a table that already has rows
model User {
  role String @map("role")
}
```

What actually happens with the BAD case on Postgres: the migration **fails outright** —
`ERROR: column "role" of relation "users" contains null values`. It is not a slow lock,
it is a hard stop. (`migrate dev` usually catches it earlier and offers to reset, which is
worse if you were pointed at a shared DB.) The fix is always: add nullable → backfill →
`SET NOT NULL` in a later migration.

## Concurrent Index (Custom SQL)

Prisma cannot generate `CONCURRENTLY`. Use `--create-only`:

```bash
npx prisma migrate dev --create-only --name add_email_index
```

Then edit the generated SQL so the file contains **this statement and nothing else** —
Prisma wraps multi-statement files in a transaction, and `CONCURRENTLY` cannot run there:

```sql
-- migration.sql — must be the ONLY statement in this file
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

If it fails midway it leaves an INVALID index **and** a failed migration (P3009) that
blocks all later deploys. Recovery:

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;  -- clean up the invalid index
```
```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

Alternative when you would rather keep it out of the migration history entirely:
`npx prisma db execute --file ./add-index.sql` (no transaction wrapper).

## Rename Column (Zero-Downtime, Expand-Contract)

Never rename directly in production. Renaming the field in `schema.prisma` makes Prisma
emit `DROP COLUMN` + `ADD COLUMN`, which silently discards the data:

```
Step 1: Add new column (nullable)          → migration 001
Step 2: Deploy app writing to BOTH columns
Step 3: Backfill existing data             → migration 002 (data only)
Step 4: Deploy app reading from NEW only
Step 5: Drop old column                    → migration 003
```

## Remove Column Safely

```
Step 1: Remove all code references to the column → deploy
Step 2: Drop the column in next migration        → deploy
```

Never drop a column before removing the code that uses it.

## Large Data Backfill

Prerequisite — without a partial index the loop re-scans the whole table every batch,
turning the backfill into O(n²):

```sql
-- own migration file (CONCURRENTLY = single statement per file)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_backfill
  ON users (id) WHERE normalized_email IS NULL;
```

```sql
-- BAD: locks entire table for one long transaction
UPDATE users SET normalized_email = LOWER(email);
```

```sql
-- GOOD: batch update. COMMIT inside DO is only legal at top level, so this must be
-- the ONLY statement in its migration file (or run via `prisma db execute`).
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE normalized_email IS NULL
      ORDER BY id
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

`SKIP LOCKED` keeps the backfill from blocking on rows live traffic holds, but it also
means a batch can return 0 while rows remain — the loop exits "successfully" with work
left. Always verify before dropping the index or adding a NOT NULL constraint:

```sql
SELECT count(*) FROM users WHERE normalized_email IS NULL;  -- must be 0
```

## Anti-Patterns

| Anti-Pattern | Risk | Do Instead |
|-------------|------|------------|
| NOT NULL without default | Migration fails on any non-empty table | Add nullable, backfill, then SET NOT NULL |
| Inline index on large table | Blocks writes during build | CREATE INDEX CONCURRENTLY, alone in its file |
| CONCURRENTLY beside other statements | P3018 — cannot run inside a transaction block | One statement per migration file |
| Schema + data in one migration | Long transaction, hard rollback | Separate migrations |
| Drop column before removing code | Application errors | Remove code first |
| Renaming a field in schema.prisma | Prisma emits DROP + ADD → data loss | Expand-contract |
| Retrying a failed migration | P3009 blocks every later deploy | `migrate resolve --applied/--rolled-back` first |
| `migrate dev` against shared/prod DB | Can reset the database on drift | `migrate deploy` only |
| Edit deployed migration | Drift between environments | Create new migration |
