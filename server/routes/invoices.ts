import { Router } from 'express';
import { requireRoles, requireNonAuditor, ExtendedAuthRequest } from '../middleware/rbac.ts';
import { authUser } from './auth.ts';
import {
  getInvoices,
  getInvoiceDetails,
  getNextAvailableInvoiceNumber,
  checkInvoiceNumberDuplicate,
  createInvoiceWithItems,
  editInvoiceWithItems,
  deleteInvoice,
  logActivity,
} from '../db/dataService.ts';

export const invoicesRouter = Router();

// List Invoices / Vouchers
invoicesRouter.get('/api/invoices', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const list = await getInvoices(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoices' });
  }
});

invoicesRouter.get('/api/invoices/next-number', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const voucherType = (req.query.type as string) === 'purchase' ? 'purchase' : 'sales';
    const result = await getNextAvailableInvoiceNumber(user.id, voucherType);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/invoices/next-number:', error);
    res.status(500).json({ error: error.message || 'Failed to get next invoice number' });
  }
});

invoicesRouter.get('/api/invoices/check-duplicate', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const invoiceNumber = (req.query.number as string) || '';
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : undefined;
    const result = await checkInvoiceNumberDuplicate(user.id, invoiceNumber, excludeId);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/invoices/check-duplicate:', error);
    res.status(500).json({ error: error.message || 'Failed to check duplicate' });
  }
});

invoicesRouter.get('/api/invoices/:id', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const invoice = await getInvoiceDetails(parseInt(req.params.id));
    if (!invoice || invoice.userId !== user.id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error: any) {
    console.error('Error in /api/invoices/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoice' });
  }
});

// Create Invoice: Admin, Accountant, Billing Operator (Auditor blocked)
invoicesRouter.post(
  '/api/invoices',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant', 'billing_operator'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const invoice = await createInvoiceWithItems(user.id, req.body);
      await logActivity(
        user.id,
        user.email,
        'CREATE_INVOICE',
        'invoice',
        String(invoice?.id),
        `Created ${invoice?.voucherType.toUpperCase()} Invoice ${invoice?.invoiceNumber} for ₹${invoice?.grandTotal}`
      );
      res.status(201).json(invoice);
    } catch (error: any) {
      console.error('Error in POST /api/invoices:', error);
      res.status(500).json({ error: error.message || 'Failed to create invoice' });
    }
  }
);

// Update Invoice: Admin, Accountant, Billing Operator (Auditor blocked)
invoicesRouter.put(
  '/api/invoices/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant', 'billing_operator'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const invoiceId = parseInt(req.params.id);
      const updated = await editInvoiceWithItems(invoiceId, user.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Invoice not found' });
      await logActivity(
        user.id,
        user.email,
        'UPDATE_INVOICE',
        'invoice',
        String(updated.id),
        `Updated ${updated.voucherType.toUpperCase()} Voucher ${updated.invoiceNumber} (Total: ₹${updated.grandTotal})`
      );
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/invoices/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to update invoice' });
    }
  }
);

// Delete Invoice: Admin & Accountant only (Billing Operator & Auditor blocked!)
invoicesRouter.delete(
  '/api/invoices/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const invoiceId = parseInt(req.params.id);
      const result = await deleteInvoice(invoiceId, user.id);
      if (!result) return res.status(404).json({ error: 'Invoice not found' });
      await logActivity(
        user.id,
        user.email,
        'DELETE_INVOICE',
        'invoice',
        String(invoiceId),
        `Deleted ${result.voucherType?.toUpperCase() || ''} Voucher ${result.invoiceNumber}`
      );
      res.json({ success: true, message: `Voucher ${result.invoiceNumber} deleted successfully` });
    } catch (error: any) {
      console.error('Error in DELETE /api/invoices/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete invoice' });
    }
  }
);
