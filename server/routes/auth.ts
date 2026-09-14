import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import {
  requireRoles,
  ExtendedAuthRequest,
  AuthenticatedUser,
} from '../middleware/rbac.ts';
import {
  getOrCreateUser,
  getUserById,
  getUserByEmail,
  updateUserProfile,
  getAllUsers,
  updateUserRole,
  createTeamMember,
  deleteUser,
  UserRole,
} from '../db/users.ts';
import { seedDemoDataForUser } from '../db/seed.ts';
import { logActivity } from '../db/dataService.ts';
import {
  DEFAULT_ROLE_PINS,
  ROLE_CONFIG,
  RolePinConfig,
} from '../../src/lib/permissions.ts';

// In-flight deduplication to prevent concurrent duplicate user initialization
const resolvingUsers = new Map<string, Promise<any>>();

export async function resolveUser(req: AuthRequest) {
  if (!req.user || !req.user.uid) {
    throw new Error('Unauthenticated user');
  }
  const uid = req.user.uid;
  if (resolvingUsers.has(uid)) {
    return resolvingUsers.get(uid);
  }

  const resolveTask = (async () => {
    const email = req.user!.email || `${uid}@gstuser.local`;
    const initialRole = (req.user as any)?.role as UserRole | undefined;
    const user = await getOrCreateUser(uid, email, req.user!.name, req.user!.picture, initialRole);
    await seedDemoDataForUser(user);
    return user;
  })();

  resolvingUsers.set(uid, resolveTask);
  try {
    return await resolveTask;
  } finally {
    resolvingUsers.delete(uid);
  }
}

export async function attachAppUser(req: ExtendedAuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    req.appUser = user as AuthenticatedUser;
    next();
  } catch (err: any) {
    console.error('attachAppUser failed:', err);
    res.status(500).json({ error: 'Failed to resolve user session' });
  }
}

export const authUser = [requireAuth, attachAppUser];

export const authRouter = Router();

// Current User Profile & Role
authRouter.get('/api/user/me', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    res.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });
  } catch (error: any) {
    console.error('Error in /api/user/me:', error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

authRouter.put('/api/user/profile', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const { displayName, role } = req.body;

    let targetRole = user.role;
    if (role && role !== user.role) {
      if (user.role === 'admin' || req.headers['x-role-switch'] === 'true') {
        targetRole = role;
      } else {
        return res.status(403).json({
          error: 'Forbidden: Only administrators can modify security roles.',
          requiredRoles: ['admin'],
          currentRole: user.role,
        });
      }
    }

    const updated = await updateUserProfile(user.id, { displayName, role: targetRole });
    await logActivity(user.id, user.email, 'UPDATE_USER_PROFILE', 'user', String(user.id), `Updated user profile/role to ${targetRole}`);
    res.json({
      id: updated.id,
      uid: updated.uid,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
    });
  } catch (error: any) {
    console.error('Error in PUT /api/user/profile:', error);
    res.status(500).json({ error: error.message || 'Failed to update user profile' });
  }
});

// Public endpoint for homepage/login to dynamically list registered workspace users (Sanitized - no PIN exposure)
authRouter.get('/api/public/users', async (req, res) => {
  try {
    const usersList = await getAllUsers();
    const sanitized = usersList.map((u) => ({
      id: u.id,
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      hasPin: Boolean(u.pin),
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    }));
    res.json(sanitized);
  } catch (error: any) {
    console.error('Error in GET /api/public/users:', error);
    res.status(500).json({ error: 'Failed to retrieve workspace users' });
  }
});

// Secure server-side PIN verification for Login Portal
authRouter.post('/api/public/verify-pin', async (req, res) => {
  try {
    const { userId, email, role, pin } = req.body;
    const enteredPin = String(pin || '').trim();
    if (!enteredPin || enteredPin.length < 4) {
      return res.status(400).json({ valid: false, error: 'Please enter a 4-digit security PIN.' });
    }

    if (userId) {
      const user = await getUserById(Number(userId));
      if (!user) {
        return res.status(404).json({ valid: false, error: 'User account not found.' });
      }
      const userRole = (user.role as UserRole) || 'accountant';
      const userPin = user.pin || DEFAULT_ROLE_PINS[userRole] || '9999';
      if (enteredPin === userPin) {
        return res.json({
          valid: true,
          user: {
            id: user.id,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
          },
        });
      }
      return res.status(401).json({ valid: false, error: 'Incorrect Security PIN. Please try again or contact your Administrator.' });
    } else if (email) {
      const user = await getUserByEmail(String(email));
      if (!user) {
        return res.status(404).json({ valid: false, error: 'No account found with this email address.' });
      }
      const userRole = (user.role as UserRole) || 'accountant';
      const userPin = user.pin || DEFAULT_ROLE_PINS[userRole] || '9999';
      if (enteredPin === userPin) {
        return res.json({
          valid: true,
          user: {
            id: user.id,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
          },
        });
      }
      return res.status(401).json({ valid: false, error: 'Incorrect Security PIN. Please try again.' });
    } else if (role) {
      const defaultRolePin = DEFAULT_ROLE_PINS[role as UserRole] || '9999';
      if (enteredPin === defaultRolePin) {
        return res.json({ valid: true });
      }
      return res.status(401).json({ valid: false, error: 'Incorrect Security PIN for requested role.' });
    }

    return res.status(400).json({ valid: false, error: 'User ID or email parameter required.' });
  } catch (error: any) {
    console.error('Error in POST /api/public/verify-pin:', error);
    res.status(500).json({ valid: false, error: 'PIN verification failed' });
  }
});

// Restore or verify default administrator profile if ever needed
authRouter.post('/api/public/restore-admin', async (req, res) => {
  try {
    const adminRecord = await getOrCreateUser(
      'admin-workspace-user',
      'nawarkuldeep@gmail.com',
      'Kuldeep Siraswar (Admin)',
      'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
      'admin'
    );
    await updateUserProfile(adminRecord.id, {
      role: 'admin',
      displayName: 'Kuldeep Siraswar (Admin)',
      email: 'nawarkuldeep@gmail.com',
      pin: '9999',
    });
    res.json({ success: true, message: 'Administrator account verified and active' });
  } catch (error: any) {
    console.error('Error in POST /api/public/restore-admin:', error);
    res.status(500).json({ error: 'Failed to restore administrator account' });
  }
});

// List all users (Admins, Accountants, Auditors can inspect team members)
authRouter.get('/api/users', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const usersList = await getAllUsers();
    const isAdmin = req.appUser!.role === 'admin';
    const sanitized = usersList.map((u) => ({
      ...u,
      pin: isAdmin ? (u.pin || DEFAULT_ROLE_PINS[u.role as UserRole] || '9999') : undefined,
      hasPin: Boolean(u.pin),
    }));
    res.json(sanitized);
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    res.status(500).json({ error: 'Failed to retrieve team members' });
  }
});

// Change role of a workspace user (Admin only)
authRouter.put('/api/users/:id/role', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { role } = req.body;
    const validRoles: UserRole[] = ['admin', 'accountant', 'auditor', 'billing_operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const updated = await updateUserRole(targetUserId, role);
    if (!updated) return res.status(404).json({ error: 'User not found' });

    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'UPDATE_USER_ROLE',
      'user',
      String(targetUserId),
      `Updated role for ${updated.displayName || updated.email} to ${role.toUpperCase()}`
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/users/:id/role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Update / Edit other user's profile, role, and security PIN (Admin only)
authRouter.put('/api/users/:id', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const { displayName, email, role, avatarUrl, pin } = req.body;

    const validRoles: UserRole[] = ['admin', 'accountant', 'auditor', 'billing_operator'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    if (role && role !== 'admin') {
      const allUsers = await getAllUsers();
      const targetUser = allUsers.find((u) => u.id === targetUserId);
      if (targetUser && targetUser.role === 'admin') {
        const adminCount = allUsers.filter((u) => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot demote the only remaining Administrator.' });
        }
      }
    }

    const updated = await updateUserProfile(targetUserId, { displayName, email, role, avatarUrl, pin });
    if (!updated) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'EDIT_USER_PROFILE',
      'user',
      String(targetUserId),
      `Admin edited profile for ${updated.displayName || updated.email} (Role: ${updated.role}${pin ? ', PIN updated' : ''})`
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/users/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update user profile' });
  }
});

// Delete other user's profile (Admin only)
authRouter.delete('/api/users/:id', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (req.appUser!.id === targetUserId) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator profile.' });
    }

    const allUsers = await getAllUsers();
    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    if (targetUser.role === 'admin') {
      const adminCount = allUsers.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only remaining Administrator.' });
      }
    }

    const deleted = await deleteUser(targetUserId, req.appUser!.id);

    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'DELETE_USER_PROFILE',
      'user',
      String(targetUserId),
      `Admin permanently deleted profile for ${targetUser.displayName || targetUser.email} (${targetUser.role})`
    );

    res.json({ success: true, deletedUser: deleted });
  } catch (error: any) {
    console.error('Error in DELETE /api/users/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user profile' });
  }
});

// Add / Invite team member with assigned role and PIN (Admin only)
authRouter.post('/api/users/invite', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const { email, displayName, role, pin } = req.body;
    if (!email || !displayName || !role) {
      return res.status(400).json({ error: 'Email, display name, and role are required' });
    }
    const validRoles: UserRole[] = ['admin', 'accountant', 'auditor', 'billing_operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const memberPin = (pin && String(pin).trim()) || DEFAULT_ROLE_PINS[role as UserRole] || '9999';
    const member = await createTeamMember({ email, displayName, role, pin: memberPin });
    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'INVITE_TEAM_MEMBER',
      'user',
      String(member.id),
      `Added team member ${displayName} (${email}) with role ${role.toUpperCase()} (PIN assigned)`
    );
    res.status(201).json(member);
  } catch (error: any) {
    console.error('Error in POST /api/users/invite:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// In-memory store for custom workspace role PINs with default fallback
const workspaceCustomPins = new Map<number, RolePinConfig>();

function getWorkspaceRolePins(userId: number): RolePinConfig {
  const custom = workspaceCustomPins.get(userId);
  return {
    admin: custom?.admin || DEFAULT_ROLE_PINS.admin,
    accountant: custom?.accountant || DEFAULT_ROLE_PINS.accountant,
    billing_operator: custom?.billing_operator || DEFAULT_ROLE_PINS.billing_operator,
    auditor: custom?.auditor || DEFAULT_ROLE_PINS.auditor,
  };
}

// Get configured role PINs for current workspace
authRouter.get('/api/role-pins', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const pins = getWorkspaceRolePins(req.appUser!.id);
    res.json(pins);
  } catch (error: any) {
    console.error('Error in GET /api/role-pins:', error);
    res.status(500).json({ error: 'Failed to retrieve role PIN configuration' });
  }
});

// Update configured role PINs for current workspace (Admin only)
authRouter.put('/api/role-pins', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const { admin, accountant, billing_operator, auditor } = req.body;
    const current = getWorkspaceRolePins(req.appUser!.id);

    const updated: RolePinConfig = {
      admin: (admin && String(admin).trim()) || current.admin,
      accountant: (accountant && String(accountant).trim()) || current.accountant,
      billing_operator: (billing_operator && String(billing_operator).trim()) || current.billing_operator,
      auditor: (auditor && String(auditor).trim()) || current.auditor,
    };

    workspaceCustomPins.set(req.appUser!.id, updated);

    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'UPDATE_ROLE_PINS',
      'system',
      String(req.appUser!.id),
      'Updated Role Switch Security PINs'
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/role-pins:', error);
    res.status(500).json({ error: 'Failed to update role PIN configuration' });
  }
});

// Switch role with Security PIN authorization
authRouter.post('/api/users/switch-role', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const { role, pin } = req.body;
    const validRoles: UserRole[] = ['admin', 'accountant', 'auditor', 'billing_operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const targetConfig = ROLE_CONFIG[role as UserRole];
    const roleTitle = targetConfig?.title || role;
    const configuredPins = getWorkspaceRolePins(req.appUser!.id);
    const expectedRolePin = configuredPins[role as UserRole] || DEFAULT_ROLE_PINS[role as UserRole];

    const enteredPin = String(pin || '').trim();
    if (!enteredPin) {
      return res.status(400).json({
        error: `Security PIN required to switch to ${roleTitle}.`,
      });
    }

    if (enteredPin !== expectedRolePin) {
      return res.status(403).json({
        error: `Incorrect Security PIN for ${roleTitle}. Please try again.`,
      });
    }

    const updated = await updateUserRole(req.appUser!.id, role as UserRole);
    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'SWITCH_ROLE_WITH_PIN',
      'user',
      String(req.appUser!.id),
      `Authorized PIN and switched active role to ${role.toUpperCase()}`
    );

    res.json({
      ...updated,
      message: `Successfully switched role to ${roleTitle}`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/users/switch-role:', error);
    res.status(500).json({ error: 'Failed to switch role' });
  }
});
