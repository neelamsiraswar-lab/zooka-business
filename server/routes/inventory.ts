import { Router } from 'express';
import { requireRoles, requireNonAuditor, ExtendedAuthRequest } from '../middleware/rbac.ts';
import { authUser } from './auth.ts';
import {
  getInventory,
  createInventoryItem,
  editInventoryItem,
  adjustInventoryStock,
  deleteInventoryItem,
  logActivity,
} from '../db/dataService.ts';

export const inventoryRouter = Router();

// Inventory Items
inventoryRouter.get('/api/inventory', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const items = await getInventory(user.id);
    res.json(items);
  } catch (error: any) {
    console.error('Error in /api/inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to get inventory' });
  }
});

inventoryRouter.post(
  '/api/inventory',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const item = await createInventoryItem(user.id, req.body);
      await logActivity(user.id, user.email, 'ADD_ITEM', 'inventory', String(item.id), `Added stock item ${item.name} with GST ${item.gstRate}%`);
      res.status(201).json(item);
    } catch (error: any) {
      console.error('Error in POST /api/inventory:', error);
      res.status(500).json({ error: error.message || 'Failed to add item' });
    }
  }
);

inventoryRouter.put(
  '/api/inventory/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const item = await editInventoryItem(parseInt(req.params.id), user.id, req.body);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      await logActivity(user.id, user.email, 'UPDATE_ITEM', 'inventory', String(item.id), `Updated stock item ${item.name}`);
      res.json(item);
    } catch (error: any) {
      console.error('Error in PUT /api/inventory/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to update item' });
    }
  }
);

inventoryRouter.patch(
  '/api/inventory/:id/stock',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const { currentStock, reason } = req.body;
      const item = await adjustInventoryStock(parseInt(req.params.id), user.id, parseFloat(currentStock));
      if (!item) return res.status(404).json({ error: 'Item not found' });
      await logActivity(
        user.id,
        user.email,
        'ADJUST_STOCK',
        'inventory',
        String(item.id),
        `Adjusted stock of ${item.name} to ${item.currentStock} ${item.unit} (${reason || 'Physical verification'})`
      );
      res.json(item);
    } catch (error: any) {
      console.error('Error in PATCH /api/inventory/:id/stock:', error);
      res.status(500).json({ error: error.message || 'Failed to adjust stock' });
    }
  }
);

inventoryRouter.delete(
  '/api/inventory/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const itemId = parseInt(req.params.id);
      const deleted = await deleteInventoryItem(itemId, user.id);
      if (!deleted) return res.status(404).json({ error: 'Item not found' });
      await logActivity(
        user.id,
        user.email,
        'DELETE_ITEM',
        'inventory',
        String(deleted.id),
        `Deleted inventory item ${deleted.name} (HSN: ${deleted.hsnCode})`
      );
      res.json({ success: true, message: 'Inventory item deleted successfully' });
    } catch (error: any) {
      console.error('Error in DELETE /api/inventory/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete inventory item' });
    }
  }
);
