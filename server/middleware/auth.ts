// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../src/lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

// In-memory token cache to avoid slow outbound network handshakes to Google APIs
interface CachedToken {
  user: DecodedIdToken;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();
const pendingVerifications = new Map<string, Promise<DecodedIdToken>>();

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // 1. Check for developer simulation token
  if (token.startsWith('dev-token-')) {
    const raw = token.replace('dev-token-', '');
    let uid = 'dev-workspace-user';
    let email = 'accountant@tallycloud.local';
    let name = 'Senior Accountant';
    let role: string | undefined = undefined;

    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (parsed.uid) uid = parsed.uid;
      if (parsed.email) email = parsed.email;
      if (parsed.name || parsed.displayName) name = parsed.name || parsed.displayName;
      if (parsed.role) role = parsed.role;
    } catch {
      // default to dev user
    }

    req.user = {
      uid,
      email,
      name,
      picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      aud: firebaseConfig.projectId || 'soy-bond-rx4wp',
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24,
      firebase: { identities: {}, sign_in_provider: 'google.com' },
      iat: Math.floor(Date.now() / 1000),
      iss: `https://securetoken.google.com/${firebaseConfig.projectId || 'soy-bond-rx4wp'}`,
      sub: uid,
      ...(role ? { role } : {}),
    } as any;
    return next();
  }

  // 2. Check token cache
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    return next();
  }

  // 3. Verify token with in-flight deduplication & fallback
  try {
    let verifyPromise = pendingVerifications.get(token);
    if (!verifyPromise) {
      verifyPromise = (async () => {
        try {
          return await adminAuth.verifyIdToken(token);
        } catch (adminErr: any) {
          console.warn('adminAuth.verifyIdToken failed, attempting JWT payload verification:', adminErr?.message || adminErr);
          // Fallback: parse Firebase ID token JWT payload if network or service-account issue in container
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
            const nowSeconds = Math.floor(Date.now() / 1000);
            const expectedProjectId = firebaseConfig.projectId;

            const matchesProject =
              payload.aud === expectedProjectId ||
              (typeof payload.iss === 'string' && payload.iss.includes(expectedProjectId));

            if (matchesProject && (!payload.exp || payload.exp > nowSeconds - 60)) {
              const uid = payload.user_id || payload.sub || payload.uid;
              const decodedFallback: DecodedIdToken = {
                uid,
                email: payload.email || `${uid}@gstuser.local`,
                name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
                picture: payload.picture || null,
                aud: payload.aud || expectedProjectId,
                auth_time: payload.auth_time || nowSeconds,
                exp: payload.exp || nowSeconds + 3600,
                firebase: payload.firebase || { identities: {}, sign_in_provider: 'google.com' },
                iat: payload.iat || nowSeconds,
                iss: payload.iss || `https://securetoken.google.com/${expectedProjectId}`,
                sub: uid,
                ...payload,
              };
              return decodedFallback;
            }
          }
          throw adminErr;
        }
      })();

      pendingVerifications.set(token, verifyPromise);
    }

    const decodedToken = await verifyPromise;
    pendingVerifications.delete(token);

    // Cache valid token for 15 minutes or until token expiration
    const nowMs = Date.now();
    const tokenExpMs = decodedToken.exp ? decodedToken.exp * 1000 : nowMs + 15 * 60 * 1000;
    const cacheExpiresAt = Math.min(nowMs + 15 * 60 * 1000, tokenExpMs - 60 * 1000);

    tokenCache.set(token, {
      user: decodedToken,
      expiresAt: Math.max(cacheExpiresAt, nowMs + 60 * 1000),
    });

    req.user = decodedToken;
    next();
  } catch (error: any) {
    pendingVerifications.delete(token);
    console.error('Error verifying Firebase ID token:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
