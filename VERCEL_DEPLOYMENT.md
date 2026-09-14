# Vercel Deployment Guide: Frontend & Backend Architecture

This project is partitioned into a modular **Frontend** and **Backend** architecture, optimized for seamless development and production deployment on **Vercel** with **Supabase PostgreSQL**.

---

## 📁 Architecture Structure

```
├── src/                     # 🌐 FRONTEND (React 19, Tailwind CSS, Vite)
│   ├── components/          # UI Components & Modular Views
│   ├── context/             # Auth & Dialog Context Providers
│   ├── services/            # API Client (supports VITE_API_URL for split hosting)
│   ├── lib/                 # Permissions, RBAC utilities, number-to-words
│   └── main.tsx             # Frontend Entry Point with automatic API proxy routing
│
├── server/                  # ⚙️ BACKEND (Modular Express API & Services)
│   ├── app.ts               # Core Express app with CORS, JSON body parsers & routes
│   ├── routes/              # Subdivided Route Controllers:
│   │   ├── auth.ts          # Authentication, PIN verification, user & role management
│   │   ├── company.ts       # Company profiles, backups, restore, ledger clearing
│   │   ├── invoices.ts      # GST Tax Invoices & Purchase Vouchers
│   │   ├── parties.ts       # Customers & Vendors ledger management
│   │   ├── inventory.ts     # Stock items, units, HSN codes & physical stock verification
│   │   ├── expenses.ts      # Expense tracking & categorisation
│   │   ├── banking.ts       # Payments, Receipts, Journal vouchers, Cheques & Bank Statements
│   │   └── diagnostics.ts   # Health checks & Supabase database schema initialization
│   ├── db/                  # Database Layer (Supabase PostgreSQL Connection Pool & Schema)
│   └── middleware/          # Security & Role-Based Access Control (RBAC)
│
├── api/                     # ⚡ VERCEL SERVERLESS FUNCTION
│   └── index.ts             # Lightweight Vercel handler importing `server/app.ts`
│
├── vercel.json              # Vercel routing & build configuration
└── server.ts                # Dev server & container runner with Vite middleware
```

---

## Deployment Option 1: Unified Full-Stack on Vercel (Recommended)

In this approach, Vercel hosts both the React frontend and the Express API serverless functions within a single unified project.

### 1. Push Repository
Commit and push this codebase to your GitHub or GitLab repository.

### 2. Import into Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** > **"Project"**.
2. Select your repository.
3. Configure **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Set Environment Variables
In the Vercel project settings, add the following environment variables:

| Variable | Value Description |
|---|---|
| `DATABASE_URL` | Supabase Session or Transaction pooler URI (e.g. `postgresql://postgres.[REF]:[PASS]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require`) |
| `JWT_SECRET` | Secret key for token verification (`58e09cbc-1c43-4447-ae91-f4d073f3d36e`) |
| `SUPABASE_URL` | (Optional) `https://hraysjtpgeylpawygzrb.supabase.co` |
| `SUPABASE_ANON_KEY` | (Optional) Supabase Anon API key |

### 4. Deploy
Click **Deploy**. Vercel will:
1. Build the frontend into static assets in `dist/`.
2. Compile `api/index.ts` into serverless edge/lambda functions.
3. Route any incoming request to `/api/*` to the backend Express serverless handler.
4. Route all other requests to the React SPA with client-side routing.

---

## Deployment Option 2: Split Deployment (Independent Frontend & Backend)

If you prefer to deploy the frontend and backend to separate Vercel projects or separate domains:

### A. Deploy Backend API
1. Deploy this repository to Vercel as your API service.
2. In `vercel.json` on the backend, only the `/api` routes are required.
3. Add `DATABASE_URL` and `JWT_SECRET`.
4. Note your backend URL (e.g., `https://my-gst-backend.vercel.app`).

### B. Deploy Frontend
1. Deploy the frontend repository to Vercel.
2. Under **Environment Variables**, add:
   ```env
   VITE_API_URL=https://my-gst-backend.vercel.app
   ```
3. The centralized API client (`src/services/apiClient.ts` and `src/main.tsx`) automatically redirects all API calls to your remote backend URL with full CORS credentials support!

---

## 🔍 Verification & Post-Deployment Checklist

After deployment completes:

1. **Verify Frontend UI**: Visit `https://your-deployment.vercel.app`.
2. **Verify Backend Health**: Visit `https://your-deployment.vercel.app/api/health`.
   - Returns `{"status":"ok", "timestamp": ...}`.
3. **Verify Database Connection**: Visit `https://your-deployment.vercel.app/api/db-diagnostics`.
   - Confirms connectivity to Supabase PostgreSQL, active pool statistics, and table status.
4. **Sign In**:
   - Access the login screen.
   - Enter your email `nawarkuldeep@gmail.com` and your 4-digit Security PIN `9999`.
   - Access the Administrator workspace with full privileges.
