import { Router } from 'express';
import { requireRoles, requireNonAuditor, ExtendedAuthRequest } from '../middleware/rbac.ts';
import { authUser } from './auth.ts';
import {
  getExpenses,
  createExpense,
  editExpense,
  deleteExpense,
  logActivity,
} from '../db/dataService.ts';

export const expensesRouter = Router();

// Expenses
expensesRouter.get(
  '/api/expenses',
  authUser,
  requireRoles('admin', 'accountant', 'auditor'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const list = await getExpenses(user.id);
      res.json(list);
    } catch (error: any) {
      console.error('Error in /api/expenses:', error);
      res.status(500).json({ error: error.message || 'Failed to get expenses' });
    }
  }
);

expensesRouter.post(
  '/api/expenses',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const exp = await createExpense(user.id, req.body);
      await logActivity(
        user.id,
        user.email,
        'ADD_EXPENSE',
        'expense',
        String(exp.id),
        `Logged expense ₹${exp.amount} under ${exp.category}`
      );
      res.status(201).json(exp);
    } catch (error: any) {
      console.error('Error in POST /api/expenses:', error);
      res.status(500).json({ error: error.message || 'Failed to add expense' });
    }
  }
);

expensesRouter.put(
  '/api/expenses/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const expId = parseInt(req.params.id);
      const updated = await editExpense(expId, user.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Expense not found' });
      await logActivity(
        user.id,
        user.email,
        'UPDATE_EXPENSE',
        'expense',
        String(updated.id),
        `Updated expense ₹${updated.amount} under ${updated.category} (${updated.vendorName || 'Direct'})`
      );
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/expenses/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to update expense' });
    }
  }
);

expensesRouter.delete(
  '/api/expenses/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const expId = parseInt(req.params.id);
      const deleted = await deleteExpense(expId, user.id);
      if (!deleted) return res.status(404).json({ error: 'Expense not found' });
      await logActivity(
        user.id,
        user.email,
        'DELETE_EXPENSE',
        'expense',
        String(deleted.id),
        `Deleted expense ₹${deleted.amount} (${deleted.category})`
      );
      res.json({ success: true, message: 'Expense deleted successfully' });
    } catch (error: any) {
      console.error('Error in DELETE /api/expenses/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete expense' });
    }
  }
);
