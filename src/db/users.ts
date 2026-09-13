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
    if (initialRole && cached.user.role !== initialRole) {
      cached.user.role = initialRole;
    }
    return cached.user;
  }

  try {
    // 1. Try selecting existing user first to avoid lock contention on concurrent requests
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      const u = existing[0];
      if (initialRole && u.role !== initialRole) {
        await db.update(users).set({ role: initialRole }).where(eq(users.id, u.id));
        u.role = initialRole;
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
          ...(initialRole ? { role: initialRole } : {}),
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
  }
) {
  const updateData: any = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName.trim();
  if (data.role !== undefined) updateData.role = data.role;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();

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

  // Reassign or cleanup child references to avoid foreign key violations
  if (reassignToUserId && reassignToUserId !== userId) {
    await db.update(companyProfiles).set({ userId: reassignToUserId }).where(eq(companyProfiles.userId, userId)).catch(() => {});
    await db.update(parties).set({ userId: reassignToUserId }).where(eq(parties.userId, userId)).catch(() => {});
    await db.update(inventoryItems).set({ userId: reassignToUserId }).where(eq(inventoryItems.userId, userId)).catch(() => {});
    await db.update(invoices).set({ userId: reassignToUserId }).where(eq(invoices.userId, userId)).catch(() => {});
    await db.update(expenses).set({ userId: reassignToUserId }).where(eq(expenses.userId, userId)).catch(() => {});
    await db.update(payments).set({ userId: reassignToUserId }).where(eq(payments.userId, userId)).catch(() => {});
    await db.update(journalEntries).set({ userId: reassignToUserId }).where(eq(journalEntries.userId, userId)).catch(() => {});
    await db.update(chequeBooks).set({ userId: reassignToUserId }).where(eq(chequeBooks.userId, userId)).catch(() => {});
    await db.update(cheques).set({ userId: reassignToUserId }).where(eq(cheques.userId, userId)).catch(() => {});
    await db.update(bankStatements).set({ userId: reassignToUserId }).where(eq(bankStatements.userId, userId)).catch(() => {});
    await db.update(activityLogs).set({ userId: reassignToUserId }).where(eq(activityLogs.userId, userId)).catch(() => {});
  } else {
    await db.delete(activityLogs).where(eq(activityLogs.userId, userId)).catch(() => {});
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

export async function getAllUsers() {
  return await db.select({
    id: users.id,
    uid: users.uid,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: UserRole) {
  const result = await db.update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      uid: users.uid,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
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

export async function createTeamMember(data: { email: string; displayName: string; role: UserRole }) {
  const dummyUid = `member-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const result = await db.insert(users)
    .values({
      uid: dummyUid,
      email: data.email.toLowerCase().trim(),
      displayName: data.displayName.trim(),
      role: data.role,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.displayName)}`,
    })
    .returning();
  return result[0];
}



