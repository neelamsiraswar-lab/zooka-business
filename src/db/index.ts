// src/db/index.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'postgres';
    const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || '';
    const host = process.env.SQL_HOST || 'localhost';
    const database = process.env.SQL_DB_NAME || 'postgres';
    const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;

    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.SQL_DATABASE_URL;

    // SSL determination: Only enable SSL if explicitly requested or required by connection string
    let ssl: boolean | { rejectUnauthorized: boolean } | undefined = undefined;
    if (process.env.SQL_SSL === 'true') {
      ssl = { rejectUnauthorized: false };
    } else if (process.env.SQL_SSL === 'false') {
      ssl = false;
    } else if (connectionString) {
      if (connectionString.includes('sslmode=require') || connectionString.includes('sslmode=no-verify')) {
        ssl = { rejectUnauthorized: false };
      } else if (connectionString.includes('sslmode=disable')) {
        ssl = false;
      }
    }

    const poolConfig: PoolConfig = connectionString
      ? {
          connectionString,
          max: 10,
          connectionTimeoutMillis: 15000,
          ...(ssl !== undefined ? { ssl } : {}),
        }
      : {
          host,
          port,
          user,
          password,
          database,
          max: 10,
          connectionTimeoutMillis: 15000,
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

