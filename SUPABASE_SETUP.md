# Supabase Database Setup & Integration Guide

This guide walks you through connecting this GST Accounting & Billing platform to a **Supabase PostgreSQL database** for development, Vercel, or production hosting.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Fill in:
   - **Name**: `Tally GST Accounting` (or your preferred name)
   - **Database Password**: Set a strong password (save this safely!).
   - **Region**: Select a region close to your users (e.g. `ap-south-1` for India / Asia, or `us-east-1` for US).
4. Click **Create new project**.

---

## 2. Get Your Supabase Connection String

1. In your Supabase dashboard, click the **Settings (Gear Icon)** in the left sidebar.
2. Navigate to **Database**.
3. Scroll down to **Connection string**.
4. Select the **URI** tab.
5. Choose **Transaction Pooler** (recommended for Vercel / serverless):
   - Port: `6543`
   - Mode: `Transaction`
   - It will look like:
     ```text
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
     ```
   - Replace `[YOUR-PASSWORD]` with the database password you chose during project creation.

---

## 3. Set Environment Variables

### In Vercel (Production):
Under **Project Settings** > **Environment Variables**, add:

| Key | Value |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require` |
| `JWT_SECRET` | `your-secure-random-string` |
| `SUPABASE_URL` *(optional)* | `https://[YOUR-PROJECT-REF].supabase.co` |
| `SUPABASE_ANON_KEY` *(optional)* | `ey...` |

### In Local `.env` (Development):
```env
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
JWT_SECRET="local-dev-secret"
```

---

## 4. Automatic Table Initialization

The application automatically verifies and bootstraps all 13 required relational tables on startup via `initSchema.ts`:
- `users`
- `company_profiles`
- `parties` (Ledgers)
- `inventory_items`
- `invoices` & `invoice_items`
- `expenses`
- `activity_logs`
- `payments` (Vouchers)
- `journal_entries`
- `cheque_books` & `cheques`
- `bank_statements`

You can also manually verify or trigger schema creation anytime by calling:
- **Diagnostic Check**: `GET https://your-domain/api/db-diagnostics`
- **Manual Schema Bootstrap**: `POST https://your-domain/api/db-init`
