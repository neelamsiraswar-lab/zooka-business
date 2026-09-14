// api/index.js - Vercel Serverless Function entry point
process.env.SERVERLESS = '1';

import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedApp = null;

function loadApp() {
  if (cachedApp) return cachedApp;

  const candidatePaths = [
    path.resolve(__dirname, '../dist/server.cjs'),
    path.resolve(process.cwd(), 'dist/server.cjs'),
    path.resolve(__dirname, 'dist/server.cjs'),
    path.resolve(process.cwd(), 'server.cjs'),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const mod = require(candidate);
        cachedApp = mod.default || mod.app || mod;
        return cachedApp;
      }
    } catch (e) {
      console.warn(`Attempted loading ${candidate} failed:`, e);
    }
  }

  return null;
}

export default function handler(req, res) {
  // Normalize path if /api prefix was stripped during rewrite
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  const app = loadApp();
  if (typeof app === 'function') {
    return app(req, res);
  }

  res.status(500).json({
    error: 'Serverless backend initialization failed. Ensure "npm run build" generated dist/server.cjs.',
  });
}
