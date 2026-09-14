// src/lib/firebase-admin.ts
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let appInstance: App | undefined;
let authInstance: Auth | undefined;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || 'soy-bond-rx4wp';

try {
  if (!getApps().length) {
    appInstance = initializeApp({
      projectId,
    });
  } else {
    appInstance = getApps()[0];
  }
  authInstance = getAuth(appInstance);
} catch (err) {
  console.warn('Firebase Admin SDK initialization notice:', err);
}

export const adminAuth = {
  verifyIdToken: async (token: string) => {
    if (!authInstance) {
      const apps = getApps();
      if (apps.length > 0) {
        authInstance = getAuth(apps[0]);
      } else {
        appInstance = initializeApp({ projectId });
        authInstance = getAuth(appInstance);
      }
    }
    return authInstance.verifyIdToken(token);
  },
};

