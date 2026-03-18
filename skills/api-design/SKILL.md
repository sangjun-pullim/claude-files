---
name: api-design
description: REST API design patterns — resource naming, status codes, pagination, error responses, and validation for NestJS APIs
---

# API Design Patterns

## Resource URL Structure

```
GET    /api/v1/users              # List
GET    /api/v1/users/:id          # Get one
POST   /api/v1/users              # Create
PATCH  /api/v1/users/:id          # Update
DELETE /api/v1/users/:id          # Delete

# Sub-resources
GET    /api/v1/users/:id/orders

# Actions (use verbs sparingly)
POST   /api/v1/orders/:id/cancel
```

Rules: plural nouns, kebab-case, no verbs in resource URLs.

## Response Structure

- Single: `{ data: { ...entity } }`
- Collection: `{ data: [...], meta: { total, page, perPage, totalPages } }`
- Error: `{ error: { code, message, details: [{ field, message }] } }`

## Pagination

### Offset (simple, for admin/small datasets)

```
GET /api/v1/users?page=2&perPage=20
```

### Cursor (scalable, for feeds/large datasets)

```
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20

Response:
{
  "data": [...],
  "meta": { "hasNext": true, "nextCursor": "eyJpZCI6MTQzfQ" }
}
```

| Use Case | Type |
|----------|------|
| Admin dashboard, <10K rows | Offset |
| Infinite scroll, feeds, >10K rows | Cursor |
| Search results | Offset (users expect page numbers) |

## Filtering & Sorting

```
# Equality
GET /api/v1/orders?status=active

# Comparison
GET /api/v1/products?price[gte]=10&price[lte]=100

# Multiple values
GET /api/v1/products?category=electronics,clothing

# Sorting (prefix - for desc)
GET /api/v1/products?sort=-createdAt,price

# Sparse fields
GET /api/v1/users?fields=id,name,email
```

## NestJS Validation Pattern

```typescript
// DTO with class-validator
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}

// Controller
@Post()
async create(@Body() dto: CreateUserDto) {
  const user = await this.userService.create(dto);
  return { data: user };
}
```

## Versioning

- Start with `/api/v1/` — don't version until breaking change is needed
- Maintain at most 2 active versions
- Non-breaking (no new version needed): adding fields, adding optional params, adding endpoints
- Breaking (new version needed): removing/renaming fields, changing types, changing auth

## Checklist

Before shipping a new endpoint:

- [ ] URL follows naming conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method and status codes
- [ ] Input validated with DTO + class-validator
- [ ] Error responses use standard format
- [ ] Pagination for list endpoints
- [ ] Auth/authz required (or explicitly public)
- [ ] No internal details leaked in error responses

$ARGUMENTS
