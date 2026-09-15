// src/db/seed.ts
import { DbUser } from './users.ts';

/**
 * seedDemoDataForUser:
 * No-op: Ensures no default, mock, or hardcoded seed data is inserted into Firestore.
 * The application operates purely with genuine user-created Firestore records.
 */
export async function seedDemoDataForUser(_userRecord: DbUser): Promise<void> {
  // No-op: Keep Firestore free from unsolicited default records
  return;
}

