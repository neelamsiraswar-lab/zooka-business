# Vercel Deployment Instructions (with Supabase PostgreSQL)

Follow these steps to deploy this full-stack application (React + Vite + Express + Supabase PostgreSQL) to Vercel.

---

## 1. Prerequisites
- A GitHub repository with this codebase pushed.
- A [Vercel](https://vercel.com) account.
- A [Supabase](https://supabase.com) project created.

---

## 2. Obtain Your Supabase Connection String
1. In your **Supabase Dashboard**, navigate to **Project Settings** > **Database**.
2. Scroll to **Connection string** > **URI** tab.
3. Select **Transaction Pooler** (port `6543`, recommended for Vercel serverless):
   ```text
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```

---

## 3. Configure Project in Vercel

1. In the Vercel Dashboard, click **Add New...** > **Project** and import your repository.
2. Under **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

## 4. Environment Variables on Vercel
In **Project Settings** > **Environment Variables**, add:

```env
# Supabase PostgreSQL Transaction Pooler connection string:
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require

# Application Security (Token Signing Key)
JWT_SECRET=your_long_random_secure_secret_here

# (Optional) Supabase Client API credentials
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 5. Deployment Verification
Once Vercel finishes building and deploying:

1. **Verify Web Client**: Visit `https://your-project.vercel.app`.
2. **Verify Database Connectivity**: Visit `https://your-project.vercel.app/api/db-diagnostics`.
   - Returns `connected: true`, provider: `"Supabase PostgreSQL"`, and table count.
3. **Automatic Schema Bootstrap**: The database tables are automatically initialized on startup. You can also trigger `POST /api/db-init` to re-verify tables anytime.
