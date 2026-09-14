// src/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SQL_DATABASE_URL;

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: connectionString
    ? { url: connectionString }
    : {
        host: process.env.SUPABASE_HOST || process.env.DB_HOST || process.env.SQL_HOST || 'localhost',
        port: parseInt(process.env.SUPABASE_PORT || process.env.DB_PORT || process.env.SQL_PORT || '5432', 10),
        user: process.env.SUPABASE_USER || process.env.DB_USER || process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres',
        password: process.env.SUPABASE_PASSWORD || process.env.DB_PASSWORD || process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || '',
        database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME || process.env.SQL_DB_NAME || 'postgres',
        ssl: { rejectUnauthorized: false },
      },
  verbose: true,
});
