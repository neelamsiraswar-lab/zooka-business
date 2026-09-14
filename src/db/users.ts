// src/db/users.ts
import { db } from './index.ts';
import {
  users,
  companyProfiles,
  parties,
  inventoryItems,
  invoices,
  expenses,
  payments,
  journalEntries,
  chequeBooks,
  cheques,
  bankStatements,
  activityLogs,
} from './schema.ts';
import { eq, desc } from 'drizzle-orm';

const userMemoryCache = new Map<string, { user: typeof users.$inferSelect; expiresAt: number }>();

export type UserRole = 'admin' | 'accountant' | 'auditor' | 'billing_operator';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  avatarUrl?: string | null,
  initialRole?: UserRole
) {
  // Check memory cache first (valid for 5 minutes)
  const cached = userMemoryCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    if (uid === 'admin-workspace-user' && cached.user.role !== 'admin') {
      userMemoryCache.delete(uid);
    } else {
      return cached.user;
    }
  }

  try {
    // 1. Try selecting existing user first to avoid lock contention on concurrent requests
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      let u = existing[0];
      if ((uid === 'admin-workspace-user' || initialRole === 'admin') && u.role !== 'admin') {
        const updated = await db.update(users)
          .set({ role: 'admin', pin: u.pin || '9999' })
          .where(eq(users.id, u.id))
          .returning();
        if (updated.length > 0) u = updated[0];
      }
      userMemoryCache.set(uid, { user: u, expiresAt: Date.now() + 5 * 60 * 1000 });
      return u;
    }

    // 2. If new user, insert
    const result = await db.insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        avatarUrl: avatarUrl || null,
        role: initialRole || 'accountant',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || undefined,
          avatarUrl: avatarUrl || undefined,
        },
      })
      .returning();

    const created = result[0];
    userMemoryCache.set(uid, { user: created, expiresAt: Date.now() + 5 * 60 * 1000 });
    return created;
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    // fallback query
    const fallback = await db.select().from(users).where(eq(users.uid, uid));
    if (fallback.length > 0) {
      const u = fallback[0];
      userMemoryCache.set(uid, { user: u, expiresAt: Date.now() + 5 * 60 * 1000 });
      return u;
    }
    throw new Error('Failed to resolve or create user profile', { cause: error });
  }
}

export async function updateUserProfile(
  userId: number,
  data: {
    displayName?: string;
    role?: UserRole;
    avatarUrl?: string;
    email?: string;
    pin?: string;
  }
) {
  const updateData: any = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName.trim();
  if (data.role !== undefined) updateData.role = data.role;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (data.pin !== undefined) updateData.pin = data.pin.trim();

  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();
  
  if (result[0]) {
    for (const [uid, cached] of userMemoryCache.entries()) {
      if (cached.user.id === userId) {
        userMemoryCache.delete(uid);
      }
    }
  }
  return result[0];
}

export async function deleteUser(userId: number, reassignToUserId?: number) {
  // Clear from cache
  for (const [uid, cached] of userMemoryCache.entries()) {
    if (cached.user.id === userId) {
      userMemoryCache.delete(uid);
    }
  }

  // Find an admin to safely reassign child records to
  let targetAdminId = reassignToUserId;
  if (!targetAdminId || targetAdminId === userId) {
    const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
    const otherAdmin = adminUsers.find((a) => a.id !== userId);
    if (otherAdmin) {
      targetAdminId = otherAdmin.id;
    }
  }

  // Safely reassign foreign key dependencies before deletion
  if (targetAdminId && targetAdminId !== userId) {
    try {
      await db.update(companyProfiles).set({ userId: targetAdminId }).where(eq(companyProfiles.userId, userId));
    } catch (e) {
      console.error('Error reassigning companyProfiles:', e);
    }
    try {
      await db.update(parties).set({ userId: targetAdminId }).where(eq(parties.userId, userId));
    } catch (e) {
      console.error('Error reassigning parties:', e);
    }
    try {
      await db.update(inventoryItems).set({ userId: targetAdminId }).where(eq(inventoryItems.userId, userId));
    } catch (e) {
      console.error('Error reassigning inventoryItems:', e);
    }
    try {
      await db.update(invoices).set({ userId: targetAdminId }).where(eq(invoices.userId, userId));
    } catch (e) {
      console.error('Error reassigning invoices:', e);
    }
    try {
      await db.update(expenses).set({ userId: targetAdminId }).where(eq(expenses.userId, userId));
    } catch (e) {
      console.error('Error reassigning expenses:', e);
    }
    try {
      await db.update(payments).set({ userId: targetAdminId }).where(eq(payments.userId, userId));
    } catch (e) {
      console.error('Error reassigning payments:', e);
    }
    try {
      await db.update(journalEntries).set({ userId: targetAdminId }).where(eq(journalEntries.userId, userId));
    } catch (e) {
      console.error('Error reassigning journalEntries:', e);
    }
    try {
      await db.update(chequeBooks).set({ userId: targetAdminId }).where(eq(chequeBooks.userId, userId));
    } catch (e) {
      console.error('Error reassigning chequeBooks:', e);
    }
    try {
      await db.update(cheques).set({ userId: targetAdminId }).where(eq(cheques.userId, userId));
    } catch (e) {
      console.error('Error reassigning cheques:', e);
    }
    try {
      await db.update(bankStatements).set({ userId: targetAdminId }).where(eq(bankStatements.userId, userId));
    } catch (e) {
      console.error('Error reassigning bankStatements:', e);
    }
    try {
      await db.update(activityLogs).set({ userId: targetAdminId }).where(eq(activityLogs.userId, userId));
    } catch (e) {
      console.error('Error reassigning activityLogs:', e);
    }
  } else {
    try {
      await db.delete(activityLogs).where(eq(activityLogs.userId, userId));
    } catch (e) {
      console.error('Error deleting activityLogs for user:', e);
    }
  }

  const result = await db.delete(users).where(eq(users.id, userId)).returning({
    id: users.id,
    uid: users.uid,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
  });

  return result[0];
}

export async function getUserById(id: number) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllUsers() {
  let all = await db.select({
    id: users.id,
    uid: users.uid,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    pin: users.pin,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt));

  // Safeguard: Ensure at least one Administrator profile is always active and returned
  const hasAdmin = all.some(u => u.role === 'admin');
  if (!hasAdmin) {
    console.warn('No administrator found in workspace. Auto-recovering primary Administrator profile...');
    const adminRecord = await getOrCreateUser(
      'admin-workspace-user',
      'nawarkuldeep@gmail.com',
      'Kuldeep Siraswar (Admin)',
      'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
      'admin'
    );
    // Explicitly enforce role='admin'
    await db.update(users).set({ role: 'admin', pin: '9999', displayName: 'Kuldeep Siraswar (Admin)' }).where(eq(users.id, adminRecord.id));
    userMemoryCache.clear();
    all = await db.select({
      id: users.id,
      uid: users.uid,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      pin: users.pin,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
  }

  // Sort order: Admin first, then Accountant, Billing Operator, Auditor, then any extra custom users
  const roleRank: Record<string, number> = {
    admin: 1,
    accountant: 2,
    billing_operator: 3,
    auditor: 4,
  };

  return all.sort((a, b) => {
    const rankA = roleRank[a.role] || 10;
    const rankB = roleRank[b.role] || 10;
    if (rankA !== rankB) return rankA - rankB;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
}

export async function updateUserRole(userId: number, role: UserRole) {
  if (role !== 'admin') {
    const currentAdmins = await db.select().from(users).where(eq(users.role, 'admin'));
    if (currentAdmins.length === 1 && currentAdmins[0].id === userId) {
      throw new Error('Cannot demote the only remaining Administrator account in the workspace.');
    }
  }

  const result = await db.update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      uid: users.uid,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      pin: users.pin,
      avatarUrl: users.avatarUrl,
    });

  if (result[0]) {
    for (const [uid, cached] of userMemoryCache.entries()) {
      if (cached.user.id === userId) {
        userMemoryCache.delete(uid);
      }
    }
  }
  return result[0];
}

export async function createTeamMember(data: { email: string; displayName: string; role: UserRole; pin?: string }) {
  const dummyUid = `member-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const result = await db.insert(users)
    .values({
      uid: dummyUid,
      email: data.email.toLowerCase().trim(),
      displayName: data.displayName.trim(),
      role: data.role,
      pin: data.pin ? data.pin.trim() : null,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.displayName)}`,
    })
    .returning();
  return result[0];
}



