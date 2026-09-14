import express from 'express';
import cors from 'cors';
import { diagnosticsRouter } from './routes/diagnostics.ts';
import { authRouter, authUser } from './routes/auth.ts';
import { companyRouter } from './routes/company.ts';
import { invoicesRouter } from './routes/invoices.ts';
import { partiesRouter } from './routes/parties.ts';
import { inventoryRouter } from './routes/inventory.ts';
import { expensesRouter } from './routes/expenses.ts';
import { bankingRouter } from './routes/banking.ts';

export const app = express();

// Security & Parsing Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-role-switch'],
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Path normalization for Vercel Serverless Function rewrites
app.use((req, res, next) => {
  const matchedPath = (req.headers['x-matched-path'] as string) || (req.headers['x-vercel-matched-path'] as string) || (req.headers['x-forwarded-uri'] as string);
  if (matchedPath && matchedPath.startsWith('/api') && req.url === '/api') {
    req.url = matchedPath;
  }
  next();
});

// Root API Health & Diagnostic Base Endpoints
app.get(['/', '/api'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Tally GST Accounting API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routers
app.use(diagnosticsRouter);
app.use(authRouter);
app.use(companyRouter);
app.use(invoicesRouter);
app.use(partiesRouter);
app.use(inventoryRouter);
app.use(expensesRouter);
app.use(bankingRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: err?.message || 'Internal Server Error',
    code: err?.code,
  });
});

export { authUser };
export default app;
