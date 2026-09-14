import type { Request, Response } from 'express';
import { app } from '../server/app.ts';

export default function handler(req: Request, res: Response) {
  // Normalize path if /api prefix was stripped during Vercel rewrite
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
