// src/db/users.ts
import { db, COLLECTIONS, getNextSequenceId } from './index.ts';

export type UserRole = 'admin' | 'accountant' | 'auditor' | 'billing_operator';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  pin?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

const userMemoryCache = new Map<string, { user: DbUser; expiresAt: number }>();

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  avatarUrl?: string | null,
  initialRole?: UserRole
): Promise<DbUser> {
  // Check memory cache first (valid for 5 minutes)
  const cached = userMemoryCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    const usersRef = db.collection(COLLECTIONS.USERS);
    // 1. Try querying existing user by uid
    const querySnapshot = await usersRef.where('uid', '==', uid).limit(1).get();
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data() as DbUser;
      const userObj: DbUser = {
        id: typeof data.id === 'number' ? data.id : parseInt(doc.id) || 1,
        uid: data.uid || uid,
        email: data.email || email,
        displayName: data.displayName || displayName || email.split('@')[0],
        role: data.role || initialRole || 'accountant',
        pin: data.pin || null,
        avatarUrl: data.avatarUrl || avatarUrl || null,
        createdAt: data.createdAt || new Date().toISOString(),
      };
      userMemoryCache.set(uid, { user: userObj, expiresAt: Date.now() + 5 * 60 * 1000 });
      return userObj;
    }

    // 2. Also check if user exists by email (to merge if needed)
    const emailSnapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();
    if (!emailSnapshot.empty) {
      const doc = emailSnapshot.docs[0];
      const data = doc.data() as DbUser;
      const updatedUser: DbUser = {
        ...data,
        uid,
        displayName: displayName || data.displayName,
        avatarUrl: avatarUrl || data.avatarUrl,
      };
      await doc.ref.update({
        uid,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
      });
      userMemoryCache.set(uid, { user: updatedUser, expiresAt: Date.now() + 5 * 60 * 1000 });
      return updatedUser;
    }

    // 3. New user - allocate sequential ID and save to Firestore
    const nextId = await getNextSequenceId('user_id');
    const newUser: DbUser = {
      id: nextId,
      uid,
      email: email.toLowerCase().trim(),
      displayName: displayName || email.split('@')[0],
      avatarUrl: avatarUrl || null,
      role: initialRole || (email === 'nawarkuldeep@gmail.com' ? 'admin' : 'accountant'),
      pin: initialRole === 'admin' || email === 'nawarkuldeep@gmail.com' ? '9999' : '1234',
      createdAt: new Date().toISOString(),
    };

    await usersRef.doc(String(nextId)).set(newUser);
    userMemoryCache.set(uid, { user: newUser, expiresAt: Date.now() + 5 * 60 * 1000 });
    return newUser;
  } catch (error) {
    console.error('getOrCreateUser Firestore error:', error);
    // In-memory fallback if Firestore cold-start
    const fallbackUser: DbUser = {
      id: 1,
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      avatarUrl: avatarUrl || null,
      role: initialRole || 'admin',
      pin: '9999',
      createdAt: new Date().toISOString(),
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
    pin?: string;
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
  if (data.pin !== undefined) updatePayload.pin = data.pin.trim();

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
        pin: data.pin || null,
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
    return {
      id: typeof data.id === 'number' ? data.id : parseInt(doc.id) || 1,
      uid: data.uid || doc.id,
      email: data.email || '',
      displayName: data.displayName || data.email?.split('@')[0] || 'User',
      role: data.role || 'accountant',
      pin: data.pin || null,
      avatarUrl: data.avatarUrl || null,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  });

  // Filter out any corrupted/empty records
  all = all.filter((u) => u.email && u.email.includes('@'));

  // Bootstrap initial team ONLY IF the database is completely empty
  if (all.length === 0) {
    console.log('Bootstrapping initial workspace team members in Firestore...');
    const defaultTeamRoles = [
      {
        uid: 'admin-workspace-user',
        email: 'nawarkuldeep@gmail.com',
        displayName: 'Kuldeep Siraswar (Admin)',
        role: 'admin' as UserRole,
        pin: '9999',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
      },
      {
        uid: 'accountant-ca-kuldeep',
        email: 'ca.kuldeep@apexaccounting.com',
        displayName: 'CA Kuldeep Nawar',
        role: 'accountant' as UserRole,
        pin: '2468',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=CA%20Kuldeep%20Nawar',
      },
      {
        uid: 'billing-operator-demo',
        email: 'billing.rohit@apexaccounting.com',
        displayName: 'Rohit Sharma',
        role: 'billing_operator' as UserRole,
        pin: '1357',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Rohit%20Sharma',
      },
      {
        uid: 'auditor-neha-demo',
        email: 'auditor.neha@apexaccounting.com',
        displayName: 'Neha Gupta',
        role: 'auditor' as UserRole,
        pin: '8080',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Neha%20Gupta',
      },
    ];

    for (const member of defaultTeamRoles) {
      try {
        const nextId = await getNextSequenceId('user_id');
        const newMember: DbUser = {
          id: nextId,
          uid: member.uid,
          email: member.email,
          displayName: member.displayName,
          role: member.role,
          pin: member.pin,
          avatarUrl: member.avatarUrl,
          createdAt: new Date().toISOString(),
        };
        await usersRef.doc(String(nextId)).set(newMember);
        all.push(newMember);
      } catch (err) {
        console.error(`Failed to bootstrap team member in Firestore:`, err);
      }
    }
  }

  // Deduplicate by user ID
  const uniqueUsersMap = new Map<number, DbUser>();
  for (const u of all) {
    if (!uniqueUsersMap.has(u.id)) {
      uniqueUsersMap.set(u.id, u);
    }
  }
  const uniqueUsers = Array.from(uniqueUsersMap.values());

  // Sort order: Admin first, then Accountant, Billing Operator, Auditor, then custom
  const roleRank: Record<string, number> = {
    admin: 1,
    accountant: 2,
    billing_operator: 3,
    auditor: 4,
  };

  return uniqueUsers.sort((a, b) => {
    const rankA = roleRank[a.role] || 10;
    const rankB = roleRank[b.role] || 10;
    if (rankA !== rankB) return rankA - rankB;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
}

export async function updateUserRole(userId: number, role: UserRole) {
  return await updateUserProfile(userId, { role });
}

export async function createTeamMember(data: { email: string; displayName: string; role: UserRole; pin?: string }) {
  const dummyUid = `member-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nextId = await getNextSequenceId('user_id');
  const newMember: DbUser = {
    id: nextId,
    uid: dummyUid,
    email: data.email.toLowerCase().trim(),
    displayName: data.displayName.trim(),
    role: data.role,
    pin: data.pin ? data.pin.trim() : '1234',
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.displayName)}`,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.USERS).doc(String(nextId)).set(newMember);
  userMemoryCache.clear();
  return newMember;
}
