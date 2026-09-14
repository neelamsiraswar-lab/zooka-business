import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { app } from './server/app.ts';
import { initializeDatabaseSchema } from './server/db/index.ts';

const getDirname = () => {
  if (typeof __dirname !== 'undefined') return __dirname;
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};
const currentDir = getDirname();
const PORT = 3000;

// Vite Middleware for development & static file serving for production
async function startServer() {
  try {
    // If running in a serverless function environment (like Vercel or AWS Lambda), do not start HTTP listener
    if (process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      // Resolve dist path robustly across both local bundling and production container roots
      const possibleDistPaths = [
        path.join(process.cwd(), 'dist'),
        path.resolve(currentDir),
        path.resolve(currentDir, 'dist'),
        path.resolve(process.cwd()),
      ];

      const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];

      app.use(express.static(distPath));

      // Fallback 404 for unhandled API calls in production
      app.use('/api', (req, res) => {
        res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
      });

      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(200).send('<!DOCTYPE html><html><body><h1>Application Starting...</h1></body></html>');
        }
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Tally GST Accounting Server running on http://0.0.0.0:${PORT}`);
      // Asynchronously verify/initialize database tables without blocking server startup
      initializeDatabaseSchema()
        .then((res) => {
          if (res.success) {
            console.log('✅ Database schema verified and all tables are ready.');
          }
        })
        .catch((err) => {
          console.warn('⚠️ Database schema initialization deferred (will connect on-demand):', err?.message || err);
        });
    });
  } catch (err) {
    console.error('Failed to start Express server:', err);
  }
}

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.SERVERLESS
);

if (!isServerless) {
  startServer();
}

export { app };
export default app;
