import { Router } from 'express';
import {
  testDatabaseDiagnostics,
  initializeDatabaseSchema,
} from '../db/index.ts';

export const diagnosticsRouter = Router();

// Health check endpoint for Cloud Run, Vercel, and deployment probes
diagnosticsRouter.get(['/api/health', '/health'], async (req, res) => {
  const checkDb = req.query.db === 'true';
  let dbStatus = undefined;

  if (checkDb) {
    try {
      dbStatus = await testDatabaseDiagnostics();
    } catch (e: any) {
      dbStatus = { connected: false, error: e?.message || String(e) };
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    ...(dbStatus ? { database: dbStatus } : {}),
  });
});

// Comprehensive Database Diagnostics Endpoint for troubleshooting Supabase PostgreSQL
diagnosticsRouter.get(['/api/db-diagnostics', '/db-diagnostics'], async (req, res) => {
  try {
    const diagnostics = await testDatabaseDiagnostics();
    const httpCode = diagnostics.connected ? 200 : 503;
    res.status(httpCode).json(diagnostics);
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      error: {
        message: err?.message || String(err),
        troubleshooting: 'Failed to run database diagnostics. Check server environment variables.',
      },
    });
  }
});

// Automatic Database Schema Initializer Endpoint (safe and idempotent)
diagnosticsRouter.post(['/api/db-init', '/db-init'], async (req, res) => {
  try {
    const result = await initializeDatabaseSchema();
    if (result.success) {
      res.json({
        message: 'Database schema verified and tables initialized successfully.',
        tables: result.tablesCreated,
      });
    } else {
      res.status(500).json({
        error: 'Schema initialization encountered an error.',
        details: result.error,
      });
    }
  } catch (err: any) {
    console.error('Failed to initialize schema via /api/db-init:', err);
    res.status(500).json({
      error: 'Failed to initialize database schema.',
      message: err?.message || String(err),
    });
  }
});
