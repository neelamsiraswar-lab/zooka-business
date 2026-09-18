// src/db/users.ts
import { db, COLLECTIONS, getNextSequenceId } from './index.ts';
import { ROLE_CONFIG } from '../lib/permissions.ts';

export type UserRole = 'super_admin' | 'admin' | 'accountant' | 'auditor' | 'billing_operator';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  password?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  workspaceId?: string | null;
  workspaces?: string[];
  status?: 'active' | 'suspended';
  lastLogin?: string;
  phone?: string;
  pin?: string | null;
}

const userMemoryCache = new Map<string, { user: DbUser; expiresAt: number }>();

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  avatarUrl?: string | null,
  initialRole?: UserRole
): Promise<DbUser> {
  const normalizedEmail = email.toLowerCase().trim();
  const isSuperAdminEmail = normalizedEmail === 'nawarkuldeep@gmail.com';

  // Check memory cache first (valid for 5 minutes)
  const cached = userMemoryCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    if (isSuperAdminEmail && cached.user.role !== 'super_admin') {
      cached.user.role = 'super_admin';
    }
    return cached.user;
  }

  try {
    const usersRef = db.collection(COLLECTIONS.USERS);
    // 1. Try querying existing user by uid
    const querySnapshot = await usersRef.where('uid', '==', uid).limit(1).get();
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data() as DbUser;
      const targetRole: UserRole = isSuperAdminEmail ? 'super_admin' : (initialRole || data.role || 'accountant');
      
      const userObj: DbUser = {
        id: typeof data.id === 'number' ? data.id : parseInt(doc.id) || 1,
        uid: data.uid || uid,
        email: data.email || normalizedEmail,
        displayName: data.displayName || displayName || normalizedEmail.split('@')[0],
        role: targetRole,
        avatarUrl: data.avatarUrl || avatarUrl || null,
        createdAt: data.createdAt || new Date().toISOString(),
        workspaceId: data.workspaceId || null,
        workspaces: data.workspaces || [],
        status: data.status || 'active',
        password: data.password || null,
        lastLogin: data.lastLogin || new Date().toISOString(),
      };

      if (data.role !== targetRole) {
        await doc.ref.update({ role: targetRole });
      }

      userMemoryCache.set(uid, { user: userObj, expiresAt: Date.now() + 5 * 60 * 1000 });
      return userObj;
    }

    // 2. Also check if user exists by email (to merge if needed)
    const emailSnapshot = await usersRef.where('email', '==', normalizedEmail).limit(1).get();
    if (!emailSnapshot.empty) {
      const doc = emailSnapshot.docs[0];
      const data = doc.data() as DbUser;
      const targetRole: UserRole = isSuperAdminEmail ? 'super_admin' : (initialRole || data.role || 'accountant');
      
      const updatedUser: DbUser = {
        ...data,
        uid,
        role: targetRole,
        displayName: displayName || data.displayName,
        avatarUrl: avatarUrl || data.avatarUrl,
        password: data.password || null,
        workspaceId: data.workspaceId || null,
        workspaces: data.workspaces || [],
        status: data.status || 'active',
      };
      await doc.ref.update({
        uid,
        role: targetRole,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
      });
      userMemoryCache.set(uid, { user: updatedUser, expiresAt: Date.now() + 5 * 60 * 1000 });
      return updatedUser;
    }

    // 3. New user - allocate sequential ID and save to Firestore
    const nextId = await getNextSequenceId('user_id');
    const targetRole: UserRole = isSuperAdminEmail ? 'super_admin' : (initialRole || 'accountant');
    const newUser: DbUser = {
      id: nextId,
      uid,
      email: normalizedEmail,
      displayName: displayName || (isSuperAdminEmail ? 'Kuldeep Siraswar (Super Admin)' : normalizedEmail.split('@')[0]),
      avatarUrl: avatarUrl || null,
      role: targetRole,
      createdAt: new Date().toISOString(),
      status: 'active',
      workspaces: [],
      workspaceId: null,
    };

    await usersRef.doc(String(nextId)).set(newUser);
    userMemoryCache.set(uid, { user: newUser, expiresAt: Date.now() + 5 * 60 * 1000 });
    return newUser;
  } catch (error) {
    console.error('getOrCreateUser Firestore error:', error);
    // In-memory fallback if Firestore cold-start
    const targetRole: UserRole = isSuperAdminEmail ? 'super_admin' : (initialRole || 'accountant');
    const fallbackUser: DbUser = {
      id: 1,
      uid,
      email: normalizedEmail,
      displayName: displayName || (isSuperAdminEmail ? 'Kuldeep Siraswar (Super Admin)' : normalizedEmail.split('@')[0]),
      avatarUrl: avatarUrl || null,
      role: targetRole,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    return fallbackUser;
  }
}

export async function updateUserProfile(
  userId: number,
  data: {
    displayName?: string;
    role?: UserRole;
    avatarUrl?: string;
    email?: string;
    password?: string;
    workspaceId?: string | null;
    workspaces?: string[];
    status?: 'active' | 'suspended';
    phone?: string;
  }
) {
  const usersRef = db.collection(COLLECTIONS.USERS);
  const docRef = usersRef.doc(String(userId));
  const snap = await docRef.get();

  const updatePayload: Partial<DbUser> = {};
  if (data.displayName !== undefined) updatePayload.displayName = data.displayName.trim();
  if (data.role !== undefined) updatePayload.role = data.role;
  if (data.avatarUrl !== undefined) updatePayload.avatarUrl = data.avatarUrl;
  if (data.email !== undefined) updatePayload.email = data.email.toLowerCase().trim();
  if (data.password !== undefined) updatePayload.password = data.password.trim();
  if (data.workspaceId !== undefined) updatePayload.workspaceId = data.workspaceId;
  if (data.workspaces !== undefined) updatePayload.workspaces = data.workspaces;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.phone !== undefined) updatePayload.phone = data.phone.trim();

  let updatedUser: DbUser;

  if (snap.exists) {
    await docRef.update(updatePayload);
    const refreshed = await docRef.get();
    updatedUser = { id: userId, ...(refreshed.data() as any) };
  } else {
    // If querying by numeric ID didn't find the doc directly, query where id == userId
    const q = await usersRef.where('id', '==', userId).limit(1).get();
    if (!q.empty) {
      const matchDoc = q.docs[0];
      await matchDoc.ref.update(updatePayload);
      const refreshed = await matchDoc.ref.get();
      updatedUser = { id: userId, ...(refreshed.data() as any) };
    } else {
      throw new Error(`User with ID ${userId} not found`);
    }
  }

  // Invalidate cache
  for (const [cachedUid, cached] of userMemoryCache.entries()) {
    if (cached.user.id === userId) {
      userMemoryCache.delete(cachedUid);
    }
  }

  return updatedUser;
}

export async function deleteUser(userId: number, reassignToUserId?: number) {
  // Clear the in-memory cache completely
  userMemoryCache.clear();

  const usersRef = db.collection(COLLECTIONS.USERS);
  let targetUser: DbUser | null = null;

  // Retrieve all user docs to find and delete any doc matching the ID
  const snap = await usersRef.get();
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const numericId = typeof data.id === 'number' ? data.id : parseInt(docSnap.id);
    if (numericId === userId || data.id === userId || docSnap.id === String(userId)) {
      targetUser = {
        id: userId,
        uid: data.uid || docSnap.id,
        email: data.email || '',
        displayName: data.displayName || 'User',
        role: data.role || 'accountant',
        avatarUrl: data.avatarUrl || null,
        createdAt: data.createdAt || new Date().toISOString(),
      };
      await docSnap.ref.delete();
      console.log(`Deleted user document ${docSnap.id} (User ID: ${userId}) from Firestore`);
    }
  }

  // Also ensure direct doc reference deletion
  try {
    await usersRef.doc(String(userId)).delete();
  } catch {
    // Already deleted or handled above
  }

  // Reassign child records in Firestore collections if reassignToUserId is provided
  if (reassignToUserId && reassignToUserId !== userId) {
    const collectionsToReassign = [
      COLLECTIONS.COMPANY_PROFILES,
      COLLECTIONS.PARTIES,
      COLLECTIONS.INVENTORY_ITEMS,
      COLLECTIONS.INVOICES,
      COLLECTIONS.EXPENSES,
      COLLECTIONS.PAYMENTS,
      COLLECTIONS.JOURNAL_ENTRIES,
      COLLECTIONS.CHEQUE_BOOKS,
      COLLECTIONS.CHEQUES,
      COLLECTIONS.BANK_STATEMENTS,
      COLLECTIONS.ACTIVITY_LOGS,
    ];

    for (const colName of collectionsToReassign) {
      try {
        const records = await db.collection(colName).where('userId', '==', userId).get();
        if (!records.empty) {
          for (const doc of records.docs) {
            await doc.ref.update({ userId: reassignToUserId });
          }
        }
      } catch (err) {
        console.warn(`Reassignment warning for ${colName}:`, err);
      }
    }
  }

  return targetUser || { id: userId, email: '', role: 'accountant', uid: `user-${userId}`, displayName: 'User', createdAt: new Date().toISOString() };
}

export async function getAllUsers(): Promise<DbUser[]> {
  const usersRef = db.collection(COLLECTIONS.USERS);
  const snapshot = await usersRef.get();
  let all: DbUser[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    const rawEmail = (data.email || '').toLowerCase().trim();
    const isSuperAdminEmail = rawEmail === 'nawarkuldeep@gmail.com';
    return {
      id: typeof data.id === 'number' ? data.id : parseInt(doc.id) || 1,
      uid: data.uid || doc.id,
      email: data.email || '',
      displayName: data.displayName || data.email?.split('@')[0] || (isSuperAdminEmail ? 'Kuldeep Siraswar (Super Admin)' : 'User'),
      role: isSuperAdminEmail ? (data.role || 'super_admin') : (data.role || 'accountant'),
      pin: data.pin || null,
      password: data.password || null,
      avatarUrl: data.avatarUrl || null,
      createdAt: data.createdAt || new Date().toISOString(),
      workspaceId: data.workspaceId || null,
      workspaces: data.workspaces || [],
      status: data.status || 'active',
      lastLogin: data.lastLogin || null,
      phone: data.phone || '',
    };
  });

  // Filter out any corrupted/empty records
  all = all.filter((u) => u.email && u.email.includes('@'));

  // Deduplicate by user ID
  const uniqueUsersMap = new Map<number, DbUser>();
  for (const u of all) {
    if (!uniqueUsersMap.has(u.id)) {
      uniqueUsersMap.set(u.id, u);
    }
  }
  const uniqueUsers = Array.from(uniqueUsersMap.values());

  // Sort order: Super Admin first, Admin, then Accountant, Billing Operator, Auditor
  const roleRank: Record<string, number> = {
    super_admin: 0,
    admin: 1,
    accountant: 2,
    billing_operator: 3,
    auditor: 4,
  };

  return uniqueUsers.sort((a, b) => {
    const rankA = roleRank[a.role] ?? 10;
    const rankB = roleRank[b.role] ?? 10;
    if (rankA !== rankB) return rankA - rankB;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
}

export async function getWorkspaceUsers(workspaceId: string, ownerEmail?: string): Promise<DbUser[]> {
  const all = await getAllUsers();
  const normalizedOwner = (ownerEmail || '').toLowerCase().trim();
  return all.filter((u) => {
    const userEmail = (u.email || '').toLowerCase().trim();
    if (normalizedOwner && userEmail === normalizedOwner) return true;
    if (u.workspaceId === workspaceId) return true;
    if (Array.isArray(u.workspaces) && u.workspaces.includes(workspaceId)) return true;
    return false;
  });
}

export async function updateUserRole(userId: number, role: UserRole) {
  return await updateUserProfile(userId, { role });
}

export async function changeUserPassword(userId: number, newPassword: string): Promise<DbUser> {
  return await updateUserProfile(userId, { password: newPassword });
}

export async function createTeamMember(data: {
  email: string;
  displayName: string;
  role: UserRole;
  password?: string;
  avatarUrl?: string;
  workspaceId?: string;
}) {
  const dummyUid = `member-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nextId = await getNextSequenceId('user_id');
  const newMember: DbUser = {
    id: nextId,
    uid: dummyUid,
    email: data.email.toLowerCase().trim(),
    displayName: data.displayName.trim(),
    role: data.role,
    password: data.password?.trim() || null,
    avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.displayName)}`,
    createdAt: new Date().toISOString(),
    workspaceId: data.workspaceId || null,
    workspaces: data.workspaceId ? [data.workspaceId] : [],
    status: 'active',
  };

  await db.collection(COLLECTIONS.USERS).doc(String(nextId)).set(newMember);
  userMemoryCache.clear();
  return newMember;
}

export async function assignUserToWorkspace(userId: number, workspaceId: string): Promise<DbUser> {
  const all = await getAllUsers();
  const target = all.find((u) => u.id === userId);
  if (!target) throw new Error(`User with ID ${userId} not found`);

  const currentWorkspaces = Array.isArray(target.workspaces) ? [...target.workspaces] : [];
  if (!currentWorkspaces.includes(workspaceId)) {
    currentWorkspaces.push(workspaceId);
  }

  return await updateUserProfile(userId, {
    workspaces: currentWorkspaces,
    workspaceId: target.workspaceId || workspaceId,
  });
}

export async function removeUserFromWorkspace(userId: number, workspaceId: string): Promise<DbUser> {
  const all = await getAllUsers();
  const target = all.find((u) => u.id === userId);
  if (!target) throw new Error(`User with ID ${userId} not found`);

  const currentWorkspaces = Array.isArray(target.workspaces)
    ? target.workspaces.filter((id) => id !== workspaceId)
    : [];
  const newPrimaryWorkspace = target.workspaceId === workspaceId
    ? (currentWorkspaces[0] || null)
    : target.workspaceId;

  return await updateUserProfile(userId, {
    workspaces: currentWorkspaces,
    workspaceId: newPrimaryWorkspace,
  });
}


