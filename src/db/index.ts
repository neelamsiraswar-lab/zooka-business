// src/db/index.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';
import { ensureDatabaseTablesExist } from './initSchema.ts';

// Global connection pool caching to persist across hot-reloads and serverless invocations (Vercel)
declare global {
  var _postgresPool: Pool | undefined;
}

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.SERVERLESS
);

/**
 * Creates or retrieves the cached PostgreSQL / Supabase connection pool.
 */
export const createPool = (): Pool => {
  if (!global._postgresPool) {
    // 1. Connection string resolution (Supabase / PostgreSQL)
    let connectionString =
      process.env.SUPABASE_DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.SQL_DATABASE_URL ||
      '';

    // 2. Individual parameter resolution
    let host =
      process.env.SUPABASE_HOST ||
      process.env.DB_HOST ||
      process.env.POSTGRES_HOST ||
      process.env.SQL_HOST ||
      '';

    const user =
      process.env.SUPABASE_USER ||
      process.env.DB_USER ||
      process.env.POSTGRES_USER ||
      process.env.SQL_USER ||
      process.env.SQL_ADMIN_USER ||
      'postgres';

    const password =
      process.env.SUPABASE_PASSWORD ||
      process.env.DB_PASSWORD ||
      process.env.POSTGRES_PASSWORD ||
      process.env.SQL_PASSWORD ||
      process.env.SQL_ADMIN_PASSWORD ||
      '';

    const database =
      process.env.SUPABASE_DB_NAME ||
      process.env.DB_NAME ||
      process.env.POSTGRES_DATABASE ||
      process.env.SQL_DB_NAME ||
      'postgres';

    const port = process.env.SUPABASE_PORT
      ? parseInt(process.env.SUPABASE_PORT, 10)
      : process.env.SQL_PORT
      ? parseInt(process.env.SQL_PORT, 10)
      : process.env.DB_PORT
      ? parseInt(process.env.DB_PORT, 10)
      : 5432;

    // Check if host is a Unix socket (legacy or local socket)
    const isUnixSocket = host.startsWith('/') && !host.includes('://');

    if (!host && !connectionString) {
      if (process.env.NODE_ENV === 'production' || isServerless) {
        console.warn(
          '⚠️ [Database] Neither DATABASE_URL nor SUPABASE_DATABASE_URL is configured in environment variables. ' +
          'Please set DATABASE_URL (e.g. from your Supabase Project Settings > Database > Connection string).'
        );
      }
      host = 'localhost';
    }

    // SSL Configuration:
    // Supabase cloud databases ALWAYS require SSL with { rejectUnauthorized: false }
    let ssl: boolean | { rejectUnauthorized: boolean } | undefined = undefined;

    if (isUnixSocket) {
      ssl = false;
    } else if (process.env.DB_SSL === 'false' || process.env.SQL_SSL === 'false') {
      ssl = false;
    } else if (process.env.DB_SSL === 'true' || process.env.SQL_SSL === 'true') {
      ssl = { rejectUnauthorized: false };
    } else if (connectionString) {
      if (connectionString.includes('sslmode=disable')) {
        ssl = false;
      } else {
        // Default to SSL enabled for remote connection strings (Supabase, Neon, etc.)
        ssl = { rejectUnauthorized: false };
      }
    } else {
      // Discrete host: auto-enable SSL for any remote host (e.g. *.supabase.co, *.supabase.com, AWS, etc.)
      if (host !== 'localhost' && !host.startsWith('127.')) {
        ssl = { rejectUnauthorized: false };
      }
    }

    // Pool capacity sizing
    const poolMax = process.env.DB_POOL_MAX
      ? parseInt(process.env.DB_POOL_MAX, 10)
      : isServerless
      ? 2
      : 10;

    const poolConfig: PoolConfig = connectionString
      ? {
          connectionString,
          max: poolMax,
          connectionTimeoutMillis: 15000,
          idleTimeoutMillis: 15000,
          ...(ssl !== undefined ? { ssl } : {}),
        }
      : {
          host,
          port,
          user,
          password,
          database,
          max: poolMax,
          connectionTimeoutMillis: 15000,
          idleTimeoutMillis: 15000,
          ...(ssl !== undefined ? { ssl } : {}),
        };

    global._postgresPool = new Pool(poolConfig);

    // Prevent unhandled pool-level errors from crashing the Node.js process
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL/Supabase pool client:', err);
    });
  }

  return global._postgresPool;
};

// Create or retrieve the pool instance
export const pool = createPool();

// Initialize Drizzle ORM with the connection pool and database schema
export const db = drizzle(pool, { schema });

/**
 * Diagnostic helper to test the database connection and return descriptive troubleshooting info
 */
export async function testDatabaseDiagnostics(): Promise<{
  connected: boolean;
  provider: 'Supabase PostgreSQL' | 'PostgreSQL';
  responseTimeMs: number;
  config: {
    connectionType: 'connection_string' | 'tcp' | 'unix_socket';
    hostSanitized: string;
    database: string;
    user: string;
    sslEnabled: boolean;
    isServerless: boolean;
    isSupabase: boolean;
  };
  serverInfo?: {
    database: string;
    user: string;
    version: string;
    timestamp: string;
    tableCount: number;
  };
  error?: {
    code?: string;
    message: string;
    troubleshooting: string;
  };
}> {
  const p = createPool();
  const startTime = Date.now();

  const connectionString =
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SQL_DATABASE_URL ||
    '';

  const host =
    process.env.SUPABASE_HOST ||
    process.env.DB_HOST ||
    process.env.POSTGRES_HOST ||
    process.env.SQL_HOST ||
    'localhost';

  const isSupabase =
    connectionString.includes('supabase.co') ||
    connectionString.includes('supabase.com') ||
    host.includes('supabase.co') ||
    host.includes('supabase.com') ||
    Boolean(process.env.SUPABASE_URL);

  const baseConfig = {
    connectionType: (connectionString ? 'connection_string' : host.startsWith('/') ? 'unix_socket' : 'tcp') as 'connection_string' | 'tcp' | 'unix_socket',
    hostSanitized: connectionString
      ? connectionString.replace(/:[^:@]+@/, ':****@')
      : host,
    database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME || process.env.SQL_DB_NAME || 'postgres',
    user: process.env.SUPABASE_USER || process.env.DB_USER || process.env.SQL_USER || 'postgres',
    sslEnabled: process.env.DB_SSL !== 'false' && process.env.SQL_SSL !== 'false',
    isServerless,
    isSupabase,
  };

  try {
    const client = await p.connect();
    try {
      const pingResult = await client.query(`
        SELECT 
          NOW() as current_time, 
          current_database() as db_name, 
          current_user as user_name, 
          version() as pg_version;
      `);

      const tablesResult = await client.query(`
        SELECT COUNT(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);

      const row = pingResult.rows[0];
      const tableCount = tablesResult.rows[0]?.count || 0;

      return {
        connected: true,
        provider: isSupabase ? 'Supabase PostgreSQL' : 'PostgreSQL',
        responseTimeMs: Date.now() - startTime,
        config: baseConfig,
        serverInfo: {
          database: row.db_name,
          user: row.user_name,
          version: row.pg_version,
          timestamp: row.current_time,
          tableCount,
        },
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    const errorCode = err?.code;
    let troubleshooting = 'Check your Supabase/PostgreSQL database credentials and network settings.';

    if (errorCode === 'ECONNREFUSED') {
      troubleshooting =
        'Connection refused on ' +
        (baseConfig.hostSanitized || 'localhost') +
        '. Ensure DATABASE_URL is set in your environment variables (e.g., in Vercel project settings or .env file).';
    } else if (errorCode === 'ETIMEDOUT') {
      troubleshooting =
        'Connection timed out. If using Supabase with IPv4-only networks or serverless platforms, use the Supabase Transaction Pooler connection string (port 6543) or Session Pooler (port 5432).';
    } else if (errorCode === '28P01') {
      troubleshooting =
        'Password authentication failed. Please verify that your Supabase database password in DATABASE_URL is correct.';
    } else if (errorCode === '3D000') {
      troubleshooting =
        'Database does not exist. In Supabase, the default database name is always "postgres".';
    } else if (errorCode === '28000' || errorMsg.includes('no pg_hba.conf entry')) {
      troubleshooting =
        'SSL is required for Supabase. Ensure ?sslmode=require is appended to your connection string.';
    }

    return {
      connected: false,
      provider: isSupabase ? 'Supabase PostgreSQL' : 'PostgreSQL',
      responseTimeMs: Date.now() - startTime,
      config: baseConfig,
      error: {
        code: errorCode,
        message: errorMsg,
        troubleshooting,
      },
    };
  }
}

/**
 * Initialize database tables if missing (idempotent)
 */
export async function initializeDatabaseSchema() {
  const p = createPool();
  return ensureDatabaseTablesExist(p);
}
