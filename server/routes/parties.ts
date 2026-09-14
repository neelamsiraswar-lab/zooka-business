import { Router } from 'express';
import { requireRoles, requireNonAuditor, ExtendedAuthRequest } from '../middleware/rbac.ts';
import { authUser } from './auth.ts';
import {
  getParties,
  createParty,
  editParty,
  deleteParty,
  logActivity,
} from '../db/dataService.ts';

export const partiesRouter = Router();

// Parties (Customers / Vendors)
partiesRouter.get('/api/parties', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const list = await getParties(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/parties:', error);
    res.status(500).json({ error: error.message || 'Failed to get parties' });
  }
});

partiesRouter.post(
  '/api/parties',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant', 'billing_operator'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const party = await createParty(user.id, req.body);
      await logActivity(user.id, user.email, 'ADD_PARTY', 'party', String(party.id), `Added party ${party.name} (${party.partyType})`);
      res.status(201).json(party);
    } catch (error: any) {
      console.error('Error in POST /api/parties:', error);
      res.status(500).json({ error: error.message || 'Failed to add party' });
    }
  }
);

partiesRouter.put(
  '/api/parties/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant', 'billing_operator'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const party = await editParty(parseInt(req.params.id), user.id, req.body);
      if (!party) return res.status(404).json({ error: 'Party not found' });
      await logActivity(user.id, user.email, 'EDIT_PARTY', 'party', String(party.id), `Updated party ${party.name}`);
      res.json(party);
    } catch (error: any) {
      console.error('Error in PUT /api/parties/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to update party' });
    }
  }
);

partiesRouter.delete(
  '/api/parties/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const partyId = parseInt(req.params.id);
      const deleted = await deleteParty(partyId, user.id);
      if (!deleted) return res.status(404).json({ error: 'Party not found' });
      await logActivity(user.id, user.email, 'DELETE_PARTY', 'party', String(partyId), `Deleted party ${deleted.name}`);
      res.json({ success: true, message: `Party ${deleted.name} deleted successfully` });
    } catch (error: any) {
      console.error('Error in DELETE /api/parties/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete party' });
    }
  }
);
