# Vercel Deployment Instructions

Follow these steps to deploy this full-stack application (React + Vite + Express + Google Cloud SQL / PostgreSQL) to Vercel.

---

## 1. Prerequisites
- A GitHub/GitLab/Bitbucket repository with this codebase pushed.
- A [Vercel](https://vercel.com) account.
- A running Google Cloud SQL instance (PostgreSQL) or any hosted PostgreSQL database (Neon, Supabase, AWS RDS, etc.).

---

## 2. Google Cloud SQL Network Configuration (Crucial for Vercel)
Vercel serverless functions run outside Google Cloud's private VPC network. To allow Vercel to reach your Google Cloud SQL instance:

1. In the **Google Cloud Console**, go to **Cloud SQL** > select your instance (e.g. `ai-studio-535483e3`).
2. Go to **Connections** > **Networking**:
   - Under **IP address**, ensure **Public IP** is enabled. Note your instance's **Public IP address**.
   - Under **Authorized networks**, click **Add network**:
     - **Name**: `Vercel Serverless`
     - **Network**: `0.0.0.0/0` (Vercel uses dynamic IP addresses, so `0.0.0.0/0` with SSL and a strong password is the standard configuration).
3. Under the **Users** tab, ensure your database user (e.g. `ai_studio_app_user` or `postgres`) has a strong password set.
4. Save the changes.

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
In **Project Settings** > **Environment Variables**, add the following:

### Database (Google Cloud SQL):
```env
# Standard PostgreSQL connection string with SSL required:
DATABASE_URL=postgresql://ai_studio_app_user:YOUR_DB_PASSWORD@YOUR_CLOUD_SQL_PUBLIC_IP:5432/cloud_sql_development_database?sslmode=require

# Or discrete parameters:
SQL_HOST=YOUR_CLOUD_SQL_PUBLIC_IP
SQL_PORT=5432
SQL_USER=ai_studio_app_user
SQL_PASSWORD=YOUR_DB_PASSWORD
SQL_DB_NAME=cloud_sql_development_database
SQL_SSL=true
```

### Application Security & Keys:
```env
# Secret key used for signing session/JWT tokens (required for secure session authentication in production)
JWT_SECRET=your_long_random_secure_secret_here

# (Optional) Google Gemini API Key if using smart AI features
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 5. Deployment Verification
Once Vercel builds and deploys your application:

1. **Verify Web Client**: Visit `https://your-project.vercel.app`. The React frontend should load smoothly.
2. **Verify Database Connectivity**: Visit `https://your-project.vercel.app/api/db-diagnostics`.
   - Should return HTTP 200 with `connected: true`, database name, response latency, and table count.
3. **Verify Health**: Visit `https://your-project.vercel.app/api/health?db=true`.

If tables need initialization on a blank database, make a POST request to:
`POST https://your-project.vercel.app/api/db-init` (it will safely and idempotently create all tables).
