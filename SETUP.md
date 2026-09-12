# Setup Guide — Startup Blueprint Generator

## Prerequisites

- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- IBM Cloud account (free Lite tier: https://cloud.ibm.com/registration)
- IBM watsonx.ai project

---

## Step 1 — IBM Cloud Setup

### 1.1 Create IBM Cloud Account
1. Go to https://cloud.ibm.com/registration
2. Sign up for a free Lite account
3. Verify your email

### 1.2 Create a watsonx.ai Project
1. Go to https://dataplatform.cloud.ibm.com/
2. Click "New project" → "Create an empty project"
3. Name it "Startup Blueprint Generator"
4. Copy your **Project ID** from the project settings

### 1.3 Get an API Key
1. Go to https://cloud.ibm.com/iam/apikeys
2. Click "Create an IBM Cloud API key"
3. Copy the key (it shows only once — save it securely)

### 1.4 Verify Granite Model Access
1. In watsonx.ai, go to the Prompt Lab
2. Try a test generation with model `ibm/granite-13b-instruct-v2`
3. If on Lite tier and that model is unavailable, try `ibm/granite-3-8b-instruct`
4. Update `WATSONX_MODEL_ID` in your `.env` accordingly

---

## Step 2 — Project Setup

```bash
# Clone or unzip the project
cd startup-blueprint-generator

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 3 — Environment Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DATABASE_URL="file:./dev.db"

JWT_SECRET=replace-this-with-a-long-random-string-at-least-32-chars

WATSONX_API_KEY=your_ibm_cloud_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-instruct-v2
```

> ⚠️ Never commit your `.env` file to version control.

---

## Step 4 — Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Create the SQLite database and apply schema
npx prisma db push

# (Optional) View the database in a browser GUI
npx prisma studio
```

---

## Step 5 — Start the Application

### Terminal 1 — Backend
```bash
cd backend
npm run dev
# API running at http://localhost:5000
# Check health: http://localhost:5000/api/health
```

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
# App running at http://localhost:5173
```

---

## Step 6 — Verify Setup

1. Open http://localhost:5000/api/health
   - Should show `"status": "ok"`
   - If `granite` is `"unavailable"`, check your API key and project ID

2. Open http://localhost:5173
   - Sign up for an account
   - Create a new blueprint using a demo idea
   - Wait 3–8 minutes for AI generation
   - Explore all 13 tabs including the BMC canvas
   - Export as PDF

---

## Troubleshooting

### "IBM Granite authentication failed"
- Check `WATSONX_API_KEY` is correct
- Ensure your IBM Cloud account is active
- Try generating a new API key at https://cloud.ibm.com/iam/apikeys

### "WATSONX_PROJECT_ID is not configured"
- Find your Project ID at: https://dataplatform.cloud.ibm.com/ → Your project → Manage → General

### "Model not found / 404"
- The model ID may differ by region. Check available models in your watsonx.ai instance.
- Try `ibm/granite-3-8b-instruct` as an alternative

### "Rate limit reached"
- Lite tier has token limits. Wait 1 hour or upgrade to a paid tier.

### Database errors
- Delete `backend/dev.db` and run `npx prisma db push` again

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check `vite.config.js` proxy configuration

---

## Running Tests

```bash
cd backend

# Run all tests
npm test

# Run specific file
npx jest tests/backend/auth.test.js --verbose
```

> Tests require a real database connection. SQLite dev.db is used automatically.

---

## Production Deployment (IBM Cloud)

1. Build frontend: `cd frontend && npm run build`
2. Serve `frontend/dist` as static files from Express (or deploy to IBM Static Site)
3. Deploy backend to IBM Code Engine or IBM Cloud Foundry
4. Set environment variables in IBM Cloud dashboard
5. Switch `DATABASE_URL` to IBM Cloud Databases for PostgreSQL
6. Update `FRONTEND_URL` to your production domain
