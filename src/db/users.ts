// src/db/users.ts
import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

const userMemoryCache = new Map<string, { user: typeof users.$inferSelect; expiresAt: number }>();

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null, avatarUrl?: string | null) {
  // Check memory cache first (valid for 5 minutes)
  const cached = userMemoryCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    // 1. Try selecting existing user first to avoid lock contention on concurrent requests
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      const u = existing[0];
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
        role: 'accountant',
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

export async function updateUserProfile(userId: number, data: { displayName?: string; role?: 'admin' | 'accountant' | 'auditor' | 'billing_operator'; avatarUrl?: string }) {
  const result = await db.update(users)
    .set({
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
    })
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


