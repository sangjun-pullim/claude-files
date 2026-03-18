---
name: db-migrate
description: Guide safe database migrations with Prisma — zero-downtime patterns, safety checklist, and common pitfalls
---

# Database Migration Patterns (Prisma)

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

## Safe Column Addition

```prisma
// GOOD: nullable column
model User {
  avatarUrl String? @map("avatar_url")
}

// GOOD: column with default (Postgres 11+ is instant, no rewrite)
model User {
  isActive Boolean @default(true) @map("is_active")
}

// BAD: NOT NULL without default on existing table → full table rewrite + lock
model User {
  role String @map("role")  // This will lock the table!
}
```

## Concurrent Index (Custom SQL)

Prisma cannot generate `CONCURRENTLY`. Use `--create-only`:

```bash
npx prisma migrate dev --create-only --name add_email_index
```

Then edit the generated SQL:

```sql
-- migration.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

## Rename Column (Zero-Downtime, Expand-Contract)

Never rename directly in production:

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

```sql
-- BAD: locks entire table
UPDATE users SET normalized_email = LOWER(email);

-- GOOD: batch update
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
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Anti-Patterns

| Anti-Pattern | Risk | Do Instead |
|-------------|------|------------|
| NOT NULL without default | Table lock + full rewrite | Add nullable, backfill, then add constraint |
| Inline index on large table | Blocks writes during build | CREATE INDEX CONCURRENTLY |
| Schema + data in one migration | Long transaction, hard rollback | Separate migrations |
| Drop column before removing code | Application errors | Remove code first |
| Edit deployed migration | Drift between environments | Create new migration |
| Manual SQL in production | No audit trail | Always use migration files |

$ARGUMENTS
