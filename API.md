# API Reference — Startup Blueprint Generator

Base URL: `http://localhost:5000/api`

All protected endpoints require: `Authorization: Bearer <JWT_TOKEN>`

---

## Authentication

### POST /auth/signup
Create a new user account.

**Body:**
```json
{
  "name": "string (required, 2-100 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)"
}
```

**Response 201:**
```json
{
  "success": true,
  "token": "JWT_TOKEN",
  "user": { "id": "uuid", "name": "...", "email": "...", "createdAt": "..." }
}
```

---

### POST /auth/login
Login and receive JWT.

**Body:**
```json
{ "email": "...", "password": "..." }
```

**Response 200:**
```json
{ "success": true, "token": "JWT", "user": { ... } }
```

---

### GET /auth/me *(protected)*
Get current user info.

**Response 200:**
```json
{ "success": true, "user": { "id": "...", "name": "...", "email": "...", "createdAt": "..." } }
```

---

## User

### GET /user/me *(protected)*
Get user profile with stats.

**Response 200:**
```json
{
  "success": true,
  "user": {
    "id": "...", "name": "...", "email": "...",
    "totalBlueprints": 5,
    "completedBlueprints": 4
  }
}
```

### GET /user/blueprints *(protected)*
List user's blueprints (paginated).

**Query params:** `?page=1&limit=10`

**Response 200:**
```json
{
  "success": true,
  "blueprints": [ { "id": "...", "status": "completed", "startupIdea": { ... } } ],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```

---

## Blueprint

### POST /blueprint/generate *(protected)*
Submit a startup idea and start blueprint generation.

**Body:**
```json
{
  "startupName": "string (required)",
  "idea": "string (required, min 20 chars)",
  "industry": "string (required)",
  "targetLocation": "string (required)",
  "targetCustomer": "string (required)",
  "initialBudget": "string (required)",
  "teamSize": "integer (required, 1-1000)",
  "stage": "ideation | validation | mvp | growth | scaling",
  "additionalNotes": "string (optional)"
}
```

**Response 202:** (returns immediately, generation runs in background)
```json
{
  "success": true,
  "message": "Blueprint generation started",
  "blueprintId": "uuid",
  "startupIdeaId": "uuid"
}
```

---

### GET /blueprint/:id *(protected)*
Get complete blueprint with all sections.

**Response 200:**
```json
{
  "success": true,
  "blueprint": {
    "id": "uuid",
    "status": "completed",
    "createdAt": "...",
    "startupIdea": { ... },
    "sections": {
      "problem": { "title": "...", "content": { ... }, "generatedAt": "..." },
      "customers": { ... },
      "market": { ... },
      "competitors": { ... },
      "bmc": { ... },
      "revenue": { ... },
      "budget": { ... },
      "gtm": { ... },
      "schemes": { ... },
      "funding": { ... },
      "legal": { ... },
      "executive_summary": { ... }
    },
    "sources": [ { "title": "...", "url": "...", "category": "..." } ]
  }
}
```

---

### GET /blueprint/:id/status *(protected)*
Lightweight polling endpoint for progress tracking.

**Response 200:**
```json
{
  "success": true,
  "status": "generating",
  "progress": 58,
  "sectionsCompleted": 7,
  "totalSections": 12,
  "errorMessage": null
}
```

---

### POST /blueprint/:id/section/:key/regenerate *(protected)*
Regenerate a single section of the blueprint.

**Path params:**
- `:id` — blueprint ID
- `:key` — one of: `problem | customers | market | competitors | bmc | revenue | budget | gtm | schemes | funding | legal | executive_summary`

**Response 200:**
```json
{
  "success": true,
  "sectionKey": "market",
  "content": { ... }
}
```

---

### DELETE /blueprint/:id *(protected)*
Delete a blueprint and all its sections.

**Response 200:**
```json
{ "success": true, "message": "Blueprint deleted" }
```

---

## Health Check

### GET /health
Check API and IBM Granite connectivity.

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "api": "ok",
    "granite": "ok",
    "graniteModel": "ibm/granite-13b-instruct-v2",
    "graniteError": null
  }
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": [ { "field": "email", "message": "Valid email is required" } ]
}
```

**Error codes:**
- `VALIDATION_ERROR` — 400
- `AUTH_ERROR` — 401
- `FORBIDDEN` — 403
- `NOT_FOUND` — 404
- `EMAIL_EXISTS` — 409
- `RATE_LIMIT` — 429
- `AI_SERVICE_ERROR` — 503
- `INTERNAL_ERROR` — 500
