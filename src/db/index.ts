// src/db/index.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';
import { ensureDatabaseTablesExist } from './initSchema.ts';

// Add global connection pool caching to persist across hot-reloads and serverless invocations
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

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.SQL_DATABASE_URL;

    // Detect Cloud SQL Unix domain socket vs TCP host
    let host =
      process.env.SQL_HOST ||
      process.env.DB_HOST ||
      process.env.POSTGRES_HOST ||
      '';

    const instanceConn =
      process.env.INSTANCE_CONNECTION_NAME ||
      process.env.CLOUD_SQL_CONNECTION_NAME;

    if (!host && instanceConn) {
      host = instanceConn.startsWith('/cloudsql/') ? instanceConn : `/cloudsql/${instanceConn}`;
    } else if (host && !host.startsWith('/') && host.includes(':') && host.split(':').length === 3) {
      // If user pasted "project:region:instance" into SQL_HOST, map to Unix socket path
      host = `/cloudsql/${host}`;
    }

    const isUnixSocket = host.startsWith('/cloudsql/') || (host.startsWith('/') && !host.includes('://'));

    if (!host && !connectionString) {
      if (process.env.NODE_ENV === 'production' || isServerless) {
        console.warn(
          '⚠️ [Database] Neither SQL_HOST nor DATABASE_URL is set in production environment variables. ' +
          'Defaulting to localhost:5432. If using Google Cloud SQL on Cloud Run or Vercel, please set ' +
          'SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME or DATABASE_URL.'
        );
      }
      host = 'localhost';
    }

    const user =
      process.env.SQL_USER ||
      process.env.SQL_ADMIN_USER ||
      process.env.DB_USER ||
      process.env.POSTGRES_USER ||
      'postgres';

    const password =
      process.env.SQL_PASSWORD ||
      process.env.SQL_ADMIN_PASSWORD ||
      process.env.DB_PASS ||
      process.env.POSTGRES_PASSWORD ||
      '';

    const database =
      process.env.SQL_DB_NAME ||
      process.env.DB_NAME ||
      process.env.POSTGRES_DATABASE ||
      'postgres';

    const port = isUnixSocket
      ? undefined
      : process.env.SQL_PORT
      ? parseInt(process.env.SQL_PORT, 10)
      : 5432;

    // SSL determination:
    // 1. Unix sockets (/cloudsql/...) MUST NOT use SSL
    // 2. Explicit SQL_SSL=false disables SSL
    // 3. Remote hosts or connection strings default to SSL { rejectUnauthorized: false }
    let ssl: boolean | { rejectUnauthorized: boolean } | undefined = undefined;

    if (isUnixSocket) {
      ssl = false;
    } else if (process.env.SQL_SSL === 'true') {
      ssl = { rejectUnauthorized: false };
    } else if (process.env.SQL_SSL === 'false') {
      ssl = false;
    } else if (connectionString) {
      if (connectionString.includes('sslmode=disable')) {
        ssl = false;
      } else if (
        connectionString.includes('sslmode=require') ||
        connectionString.includes('sslmode=no-verify') ||
        connectionString.includes('ssl=true') ||
        (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'))
      ) {
        ssl = { rejectUnauthorized: false };
      }
    } else {
      // Discrete host: auto-enable SSL for any remote public IP / domain (Google Cloud SQL Public IP, Neon, Supabase, etc.)
      if (host !== 'localhost' && !host.startsWith('127.') && !host.startsWith('/')) {
        ssl = { rejectUnauthorized: false };
      }
    }

    const poolMax = process.env.SQL_POOL_MAX
      ? parseInt(process.env.SQL_POOL_MAX, 10)
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
          ...(port ? { port } : {}),
          user,
          password,
          database,
          max: poolMax,
          connectionTimeoutMillis: 15000,
          idleTimeoutMillis: 15000,
          ...(ssl !== undefined ? { ssl } : {}),
        };

    global._postgresPool = new Pool(poolConfig);

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

/**
 * Diagnostic helper to test the database connection and return descriptive troubleshooting info
 */
export async function testDatabaseDiagnostics(): Promise<{
  connected: boolean;
  responseTimeMs: number;
  config: {
    connectionType: 'unix_socket' | 'tcp' | 'connection_string';
    hostSanitized: string;
    database: string;
    user: string;
    sslEnabled: boolean;
    isServerless: boolean;
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
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SQL_DATABASE_URL;

  const host = process.env.SQL_HOST || process.env.INSTANCE_CONNECTION_NAME || 'localhost';
  const isUnix = host.startsWith('/cloudsql/') || (host.startsWith('/') && !host.includes('://'));

  const baseConfig = {
    connectionType: (connectionString ? 'connection_string' : isUnix ? 'unix_socket' : 'tcp') as 'unix_socket' | 'tcp' | 'connection_string',
    hostSanitized: connectionString ? '[DATABASE_URL provided]' : host,
    database: process.env.SQL_DB_NAME || process.env.DB_NAME || 'postgres',
    user: process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres',
    sslEnabled: process.env.SQL_SSL !== 'false' && !isUnix,
    isServerless,
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
    let troubleshooting = 'Check your database credentials and network connectivity.';

    if (errorCode === 'ECONNREFUSED') {
      troubleshooting =
        'Connection refused on ' +
        (baseConfig.hostSanitized || 'localhost') +
        '. In production (e.g. Vercel or Cloud Run), ensure SQL_HOST or DATABASE_URL is set in your environment variables. If deploying to Vercel, localhost is not reachable; you must provide Cloud SQL Public IP or a hosted PostgreSQL URL.';
    } else if (errorCode === 'ETIMEDOUT') {
      troubleshooting =
        'Connection timed out. In Google Cloud SQL, check Authorized Networks in GCP Console (SQL > Instance > Connections > Networking) to allow your deployment platform IP (e.g., 0.0.0.0/0 with password & SSL if deploying to Vercel).';
    } else if (errorCode === '28P01') {
      troubleshooting =
        'Password authentication failed. Please verify that SQL_USER and SQL_PASSWORD (or DATABASE_URL) match your Google Cloud SQL user credentials.';
    } else if (errorCode === '3D000') {
      troubleshooting =
        'Database does not exist. Verify that SQL_DB_NAME matches an existing database created in your Google Cloud SQL instance.';
    } else if (errorCode === '28000' || errorMsg.includes('no pg_hba.conf entry')) {
      troubleshooting =
        'Google Cloud SQL rejected the unencrypted connection. Ensure SQL_SSL=true (or sslmode=require in DATABASE_URL) and check Authorized Networks in GCP Console.';
    } else if (isUnix && (errorCode === 'ENOENT' || errorMsg.includes('connect ENOENT'))) {
      troubleshooting =
        'Cloud SQL Unix domain socket not found at ' +
        host +
        '. In Google Cloud Run, ensure the Cloud SQL connection is added under Service Settings > Cloud SQL connections.';
    }

    return {
      connected: false,
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
 * Initialize database tables if missing
 */
export async function initializeDatabaseSchema() {
  const p = createPool();
  return ensureDatabaseTablesExist(p);
}


