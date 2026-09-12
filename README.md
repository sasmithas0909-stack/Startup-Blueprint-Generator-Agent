# Startup Blueprint Generator Agent
## AICTE Problem Statement 20 — Powered by IBM Granite & IBM watsonx.ai

> An AI-powered web application that takes a startup idea and generates a complete, actionable startup blueprint using IBM Granite as the primary LLM, backed by a RAG (Retrieval-Augmented Generation) architecture.

---

## Problem Statement

Most first-time entrepreneurs lack access to expert startup mentoring. Analyzing a startup idea across market research, competitor analysis, business model design, go-to-market strategy, government schemes, and legal requirements requires weeks of research and thousands of rupees in consulting fees.

## Solution

**Startup Blueprint Generator** automates this analysis using IBM Granite AI. A user enters their startup idea and within minutes receives a comprehensive, structured blueprint covering 13 key dimensions — grounded in a real knowledge base of government schemes, funding sources, and legal information via RAG.

---

## Features

- 🔐 **User Authentication** — Secure JWT-based signup/login
- 📝 **Startup Idea Form** — Structured input with demo pre-fill
- 🤖 **12-Module AI Agent** — Modular analysis pipeline powered by IBM Granite
- 📊 **Business Model Canvas** — Visual 9-block BMC, regeneratable block-by-block
- 🏛 **Government Schemes** — RAG-retrieved, real schemes (Startup India, SIDBI, AIM, etc.)
- 💰 **Funding Opportunities** — Relevant incubators, angels, accelerators
- ⚖️ **Legal Requirements** — Registration, compliance, IP guidance
- 📈 **Market Analysis** — TAM/SAM/SOM with trend analysis
- 📋 **PDF Export** — Professional multi-page PDF blueprint
- 🔄 **Regenerate Sections** — Regenerate any section without redoing the whole blueprint
- 💾 **Blueprint Storage** — All blueprints saved to user account
- 📡 **Live Progress Tracking** — Real-time progress during AI generation

---

## Architecture

```
Frontend (React + Vite + Tailwind)
    ↕ REST API (JWT auth)
Backend (Node.js + Express)
    ├── Auth Routes
    ├── Blueprint Routes
    │     └── Startup Blueprint Agent (Orchestrator)
    │           ├── startupAnalyzer
    │           ├── customerAnalyzer
    │           ├── marketResearch ──── RAG Engine ──── Vector Store ──── Knowledge Base
    │           ├── competitorAnalyzer
    │           ├── businessModelGenerator
    │           ├── revenueModelGenerator
    │           ├── budgetGenerator
    │           ├── gtmGenerator
    │           ├── governmentSchemeFinder ── RAG Engine
    │           ├── fundingFinder ──────────── RAG Engine
    │           ├── legalRequirementAnalyzer ── RAG Engine
    │           └── blueprintGenerator (executive summary)
    │                 ↕
    │           IBM Granite (watsonx.ai REST API)
    └── Database (SQLite/PostgreSQL via Prisma)
```

## IBM Granite Usage

- **Primary LLM**: `ibm/granite-13b-instruct-v2` via IBM watsonx.ai
- **Auth**: IBM IAM API Key → Bearer token (auto-refreshed)
- **Pattern**: Each of the 12 agent modules builds a structured prompt, calls Granite, and validates the JSON response
- **Prompts**: All prompts request structured JSON output for reliable parsing
- **Fallback**: If Granite is unavailable, graceful fallback sections are shown with a regenerate option

## RAG Architecture

- **Knowledge Base**: Curated Markdown documents in categories: `schemes`, `funding`, `legal`, `market`, `policies`
- **Embedder**: TF-IDF based local embedder (no external embedding API required)
- **Vector Store**: In-memory cosine similarity search (swap for ChromaDB in production)
- **Retrieval**: Top-5 most relevant chunks retrieved per query, injected into Granite prompt
- **Sources**: Every retrieved chunk's source is surfaced in the Sources tab and PDF

---

## Setup

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Start

```bash
# 1. Clone and install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Set up backend environment
cd backend
cp .env.example .env
# Edit .env — add WATSONX_API_KEY and WATSONX_PROJECT_ID

# 3. Set up database
npx prisma generate
npx prisma db push

# 4. Start backend
npm run dev

# 5. Start frontend (new terminal)
cd frontend
npm run dev

# App runs at: http://localhost:5173
# API runs at: http://localhost:5000
```

---

## Environment Variables

See [backend/.env.example](./backend/.env.example) for all required variables.

### Required

| Variable | Description |
|----------|-------------|
| `WATSONX_API_KEY` | IBM Cloud API key (from cloud.ibm.com/iam/apikeys) |
| `WATSONX_PROJECT_ID` | watsonx.ai project ID |
| `JWT_SECRET` | Random long string for JWT signing |
| `DATABASE_URL` | SQLite: `file:./dev.db` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `WATSONX_URL` | `https://us-south.ml.cloud.ibm.com` | Region URL |
| `WATSONX_MODEL_ID` | `ibm/granite-13b-instruct-v2` | Granite model |
| `PORT` | `5000` | Backend port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |

---

## API Reference

See [API.md](./API.md) for the full API specification.

---

## Testing

```bash
# Backend tests
cd backend
npm test

# Run specific test file
npx jest tests/backend/auth.test.js
```

---

## IBM Cloud Lite Deployment

The application is designed to run on IBM Cloud Lite:

1. **IBM Code Engine** — Deploy backend as a containerised application
2. **IBM Cloud Databases (PostgreSQL)** — Replace SQLite with `DATABASE_URL` pointing to IBM Cloud Postgres
3. **IBM watsonx.ai** — Already integrated; Lite tier includes free Granite tokens
4. **IBM Cloud Object Storage** — For PDF storage (optional)

---

## Project Structure

```
startup-blueprint-generator/
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── agents/    # 12 AI agent modules + orchestrator
│   │   ├── services/  # IBM Granite client + RAG engine
│   │   ├── routes/    # Express routes
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── db/        # Prisma client
│   │   └── utils/
│   ├── prisma/        # Database schema
│   └── server.js
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── pages/     # Landing, Login, Signup, Dashboard, NewBlueprint, BlueprintResult
│       ├── components/ # Navbar, BMCCanvas, Spinner
│       ├── services/  # API service layer
│       ├── store/     # Zustand auth store
│       └── utils/     # PDF export
├── tests/             # Jest tests
└── docs/              # Documentation
```

---

## Disclaimer

- Market size figures and budget estimates are AI-generated and labeled as such
- Government schemes and funding information are retrieved from the knowledge base and may change — always verify on official portals
- Legal information is general and does not constitute legal advice
- This is an academic project demonstration (AICTE Problem Statement 20)
