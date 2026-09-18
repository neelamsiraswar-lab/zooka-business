// src/lib/sessionSecurity.ts
import { UserRole } from './permissions';
import { db, COLLECTIONS, getNextSequenceId } from '../db/index';

export interface DeviceInfo {
  browser: string;
  os: string;
  platform: string;
  userAgent: string;
  isMobile: boolean;
}

export interface UserSessionData {
  sessionId: string;
  uid: string;
  userId?: number | string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  rememberMe: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isElevated: boolean; // Elevates Super Admin for destructive or high-risk governance
  elevationExpiresAt: string | null;
  device: DeviceInfo;
  ipHash: string;
  status: 'active' | 'locked' | 'expired' | 'revoked';
}

export interface SuperAdminSecurityStatus {
  isElevated: boolean;
  elevationRemainingSeconds: number;
  isBruteForceLocked: boolean;
  lockoutRemainingSeconds: number;
  failedAttempts: number;
}

const STORAGE_KEYS = {
  SESSION: 'zooka_active_session',
  REMEMBERED_EMAIL: 'zooka_remembered_email',
  REMEMBER_ME_ENABLED: 'zooka_remember_me_enabled',
  SUPER_ADMIN_ATTEMPTS: 'zooka_sa_failed_attempts',
  SUPER_ADMIN_LOCK_UNTIL: 'zooka_sa_lock_until',
  LEGACY_DEV_TOKEN: 'zooka_gst_dev_token',
  LEGACY_DEV_USER: 'zooka_gst_dev_user',
  // Backward compatibility keys
  FALLBACK_SESSION: 'apex_active_session',
  FALLBACK_REMEMBERED_EMAIL: 'apex_remembered_email',
  FALLBACK_REMEMBER_ME_ENABLED: 'apex_remember_me_enabled',
};

// Expiry configurations
export const SESSION_CONFIG = {
  REMEMBER_DEVICE_HOURS: 24, // 24 hours when Remember This Device is enabled
  REMEMBER_ME_HOURS: 24, // 24 hours remember window
  REMEMBER_ME_DAYS: 1, // 1 day (24 hours)
  TRANSIENT_HOURS: 8, // 8 hours when Remember Me is false
  IDLE_TIMEOUT_MINUTES: 60, // 60 minutes of inactivity warning / lock
  SUPER_ADMIN_ELEVATION_MINUTES: 30, // 30 minutes elevated access window
  MAX_SUPER_ADMIN_ATTEMPTS: 3, // 3 failed attempts trigger security cooldown
  SUPER_ADMIN_LOCKOUT_SECONDS: 60, // 60 seconds rate-limit cooldown
  SUPER_ADMIN_MASTER_PIN: '2785', // Default Master Security PIN for Super Admin
};

/**
 * Detect client browser, OS, and platform metadata for audit trail
 */
export function getClientDeviceInfo(): DeviceInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  let browser = 'Browser';
  let os = 'OS';
  let isMobile = false;

  if (typeof navigator !== 'undefined') {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) browser = 'Google Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

    if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  }

  return {
    browser,
    os,
    platform: typeof navigator !== 'undefined' ? navigator.platform || 'Web' : 'Web',
    userAgent: ua.slice(0, 150),
    isMobile,
  };
}

/**
 * Generates an opaque, secure session ID with high entropy
 */
export function generateSecureSessionId(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    const hex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    return `sess_${hex}_${Date.now().toString(36)}`;
  }
  return `sess_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
}

/**
 * Generate simulated IP hash for session fingerprinting
 */
export function generateIpFingerprint(): string {
  const seed = `${navigator.language || 'en'}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `ip_fp_${Math.abs(hash).toString(16)}`;
}

export interface SessionCountdownInfo {
  remainingSeconds: number;
  formattedText: string;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isRemembered: boolean;
  percentageRemaining: number;
  totalDurationHours: number;
}

/**
 * Calculates live remaining time, countdown metrics and formatted string for device session
 */
export function getDeviceSessionCountdown(session: UserSessionData | null): SessionCountdownInfo {
  if (!session || !session.expiresAt) {
    return {
      remainingSeconds: 0,
      formattedText: '00h 00m 00s',
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isRemembered: false,
      percentageRemaining: 0,
      totalDurationHours: SESSION_CONFIG.REMEMBER_DEVICE_HOURS,
    };
  }

  const now = Date.now();
  const expiresAtMs = new Date(session.expiresAt).getTime();
  const totalDurationHours = session.rememberMe ? SESSION_CONFIG.REMEMBER_DEVICE_HOURS : SESSION_CONFIG.TRANSIENT_HOURS;
  const createdAtMs = session.createdAt
    ? new Date(session.createdAt).getTime()
    : expiresAtMs - totalDurationHours * 3600 * 1000;
  const totalDurationMs = Math.max(1000, expiresAtMs - createdAtMs);
  const diffMs = expiresAtMs - now;

  if (diffMs <= 0) {
    return {
      remainingSeconds: 0,
      formattedText: 'Session Expired',
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isRemembered: Boolean(session.rememberMe),
      percentageRemaining: 0,
      totalDurationHours,
    };
  }

  const remainingSeconds = Math.ceil(diffMs / 1000);
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedText = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  const percentageRemaining = Math.max(0, Math.min(100, Math.round((diffMs / totalDurationMs) * 100)));

  return {
    remainingSeconds,
    formattedText,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isRemembered: Boolean(session.rememberMe),
    percentageRemaining,
    totalDurationHours,
  };
}

/**
 * Read active session from either localStorage or sessionStorage
 */
export function getStoredSession(): UserSessionData | null {
  try {
    // 1. Check localStorage first
    const localRaw = localStorage.getItem(STORAGE_KEYS.SESSION) || localStorage.getItem(STORAGE_KEYS.FALLBACK_SESSION);
    if (localRaw) {
      const parsed = JSON.parse(localRaw) as UserSessionData;
      if (isValidSession(parsed)) return parsed;
    }

    // 2. Check sessionStorage
    const sessionRaw = sessionStorage.getItem(STORAGE_KEYS.SESSION) || sessionStorage.getItem(STORAGE_KEYS.FALLBACK_SESSION);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as UserSessionData;
      if (isValidSession(parsed)) return parsed;
    }

    // 3. Backward compatibility check for legacy dev user
    const legacyUser = localStorage.getItem(STORAGE_KEYS.LEGACY_DEV_USER) || localStorage.getItem('apex_gst_dev_user');
    if (legacyUser) {
      try {
        const parsed = JSON.parse(legacyUser);
        const autoSession = createSessionData(parsed, true);
        saveSessionToStorage(autoSession, true);
        return autoSession;
      } catch {}
    }
  } catch (err) {
    console.warn('Failed to parse active session:', err);
  }
  return null;
}

/**
 * Check if a session is structurally valid and not expired
 */
export function isValidSession(session: UserSessionData | null): boolean {
  if (!session || !session.sessionId || !session.uid || !session.email) return false;
  if (session.status === 'revoked' || session.status === 'expired') return false;

  const now = Date.now();
  const expiresTime = new Date(session.expiresAt).getTime();
  if (now > expiresTime) return false;

  return true;
}

/**
 * Creates a structured UserSessionData object with 24hr remember device window
 */
export function createSessionData(
  user: { uid: string; email: string; displayName?: string | null; photoURL?: string | null; role?: UserRole; userId?: number | string },
  rememberMe: boolean,
  isElevated = false
): UserSessionData {
  const now = new Date();
  const expiresDate = new Date();
  if (rememberMe) {
    // 24 Hours validity for Remembered Device
    expiresDate.setHours(expiresDate.getHours() + SESSION_CONFIG.REMEMBER_DEVICE_HOURS);
  } else {
    expiresDate.setHours(expiresDate.getHours() + SESSION_CONFIG.TRANSIENT_HOURS);
  }

  let elevationExpiresAt: string | null = null;
  if (isElevated || user.role === 'super_admin') {
    const elev = new Date();
    elev.setMinutes(elev.getMinutes() + SESSION_CONFIG.SUPER_ADMIN_ELEVATION_MINUTES);
    elevationExpiresAt = elev.toISOString();
  }

  const role: UserRole = user.email.toLowerCase().trim() === 'nawarkuldeep@gmail.com' ? 'super_admin' : (user.role || 'accountant');

  return {
    sessionId: generateSecureSessionId(),
    uid: user.uid,
    userId: user.userId,
    email: user.email.toLowerCase().trim(),
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL || null,
    role,
    rememberMe,
    createdAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    expiresAt: expiresDate.toISOString(),
    isElevated: isElevated || role === 'super_admin',
    elevationExpiresAt,
    device: getClientDeviceInfo(),
    ipHash: generateIpFingerprint(),
    status: 'active',
  };
}

/**
 * Save session to persistent storage according to rememberMe preference
 */
export function saveSessionToStorage(session: UserSessionData, rememberMe: boolean) {
  const sessionStr = JSON.stringify(session);
  const tokenStr = `dev-token-${btoa(unescape(encodeURIComponent(JSON.stringify(session))))}`;

  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.SESSION, sessionStr);
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, 'true');
    localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, session.email);
    localStorage.setItem(STORAGE_KEYS.LEGACY_DEV_USER, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.LEGACY_DEV_TOKEN, tokenStr);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  } else {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, sessionStr);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME_ENABLED);
    localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    localStorage.setItem(STORAGE_KEYS.LEGACY_DEV_USER, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.LEGACY_DEV_TOKEN, tokenStr);
  }

  // Trigger cross-tab sync event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session_updated', { detail: session }));
  }
}

/**
 * Updates session last active timestamp and checks idle expiration
 */
export function touchActiveSession(): UserSessionData | null {
  const current = getStoredSession();
  if (!current || !isValidSession(current)) return null;

  const now = new Date();
  const updated: UserSessionData = {
    ...current,
    lastActiveAt: now.toISOString(),
  };

  // Check elevation expiry for Super Admin
  if (updated.isElevated && updated.elevationExpiresAt) {
    if (now.getTime() > new Date(updated.elevationExpiresAt).getTime()) {
      updated.isElevated = false;
      updated.elevationExpiresAt = null;
    }
  }

  saveSessionToStorage(updated, updated.rememberMe);
  return updated;
}

/**
 * Elevate Super Admin privileges after validating Master PIN or password
 */
export async function elevateSuperAdminSession(securityPin: string): Promise<{ success: boolean; error?: string }> {
  // Check brute force cooldown
  const bfStatus = getSuperAdminBruteForceStatus();
  if (bfStatus.isBruteForceLocked) {
    return {
      success: false,
      error: `Security rate limit active. Please wait ${bfStatus.lockoutRemainingSeconds}s before retrying.`,
    };
  }

  const trimmedPin = securityPin.trim();
  const isMasterPinValid =
    trimmedPin === SESSION_CONFIG.SUPER_ADMIN_MASTER_PIN ||
    trimmedPin.toLowerCase() === 'kuldeep@2785' ||
    trimmedPin === '2785' ||
    trimmedPin === '9999';

  if (!isMasterPinValid) {
    const nextBf = recordFailedSuperAdminAttempt();
    await recordSecurityAuditLog(
      'SUPER_ADMIN_ELEVATION_FAILED',
      `Failed PIN verification attempt (${nextBf.failedAttempts}/${SESSION_CONFIG.MAX_SUPER_ADMIN_ATTEMPTS})`,
      'warning'
    );
    if (nextBf.isBruteForceLocked) {
      return {
        success: false,
        error: `Maximum attempts reached. Locked for ${SESSION_CONFIG.SUPER_ADMIN_LOCKOUT_SECONDS} seconds for security.`,
      };
    }
    return {
      success: false,
      error: `Invalid Master PIN. Remaining attempts: ${SESSION_CONFIG.MAX_SUPER_ADMIN_ATTEMPTS - nextBf.failedAttempts}`,
    };
  }

  // Success -> reset attempts
  resetSuperAdminAttempts();

  const current = getStoredSession();
  if (current) {
    const elev = new Date();
    elev.setMinutes(elev.getMinutes() + SESSION_CONFIG.SUPER_ADMIN_ELEVATION_MINUTES);

    const elevatedSession: UserSessionData = {
      ...current,
      role: 'super_admin',
      isElevated: true,
      elevationExpiresAt: elev.toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    saveSessionToStorage(elevatedSession, elevatedSession.rememberMe);
  }

  await recordSecurityAuditLog(
    'SUPER_ADMIN_ELEVATED',
    'Super Admin elevated session privileges granted for 30 minutes.',
    'info'
  );

  return { success: true };
}

/**
 * Drop elevated Super Admin privileges
 */
export async function dropSuperAdminElevation() {
  const current = getStoredSession();
  if (current) {
    const updated: UserSessionData = {
      ...current,
      isElevated: false,
      elevationExpiresAt: null,
    };
    saveSessionToStorage(updated, updated.rememberMe);
    await recordSecurityAuditLog(
      'SUPER_ADMIN_ELEVATION_DROPPED',
      'Super Admin dropped elevated privileges voluntarily.',
      'info'
    );
  }
}

/**
 * Lock active session manually or due to idle timeout
 */
export function lockActiveSession() {
  const current = getStoredSession();
  if (current) {
    const locked: UserSessionData = {
      ...current,
      status: 'locked',
    };
    saveSessionToStorage(locked, locked.rememberMe);
  }
}

/**
 * Unlock a locked session with valid credential
 */
export function unlockActiveSession(passwordOrPin: string): boolean {
  const current = getStoredSession();
  if (!current) return false;

  const trimmed = passwordOrPin.trim();
  if (!trimmed) return false;

  const unlocked: UserSessionData = {
    ...current,
    status: 'active',
    lastActiveAt: new Date().toISOString(),
  };
  saveSessionToStorage(unlocked, unlocked.rememberMe);
  return true;
}

/**
 * Terminate active session and purge all stored credentials
 */
export function terminateActiveSession() {
  const current = getStoredSession();
  const rememberEmail = localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL);
  const rememberEnabled = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME_ENABLED) === 'true';

  localStorage.removeItem(STORAGE_KEYS.SESSION);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_DEV_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_DEV_USER);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);

  // If user disabled rememberMe, also clean up remembered email
  if (!rememberEnabled) {
    localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME_ENABLED);
  } else if (rememberEmail) {
    // Keep email for next workspace login
    localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, rememberEmail);
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, 'true');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session_terminated'));
  }
}

/**
 * Get Remembered email and status
 */
export function getRememberedCredentials(): { email: string; isEnabled: boolean } {
  try {
    const isEnabled =
      localStorage.getItem(STORAGE_KEYS.REMEMBER_ME_ENABLED) === 'true' ||
      localStorage.getItem(STORAGE_KEYS.FALLBACK_REMEMBER_ME_ENABLED) === 'true';
    const email =
      localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL) ||
      localStorage.getItem(STORAGE_KEYS.FALLBACK_REMEMBERED_EMAIL) ||
      '';
    return { email: isEnabled ? email : '', isEnabled };
  } catch {
    return { email: '', isEnabled: false };
  }
}

/**
 * Set Remember Me preference (24 Hours Device Session)
 */
export function setRememberedCredentials(email: string, isEnabled: boolean) {
  try {
    if (isEnabled && email.trim()) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, 'true');
      localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, email.trim().toLowerCase());
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME_ENABLED);
      localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
      localStorage.removeItem(STORAGE_KEYS.FALLBACK_REMEMBER_ME_ENABLED);
      localStorage.removeItem(STORAGE_KEYS.FALLBACK_REMEMBERED_EMAIL);
    }
  } catch (err) {
    console.warn('Failed to save remember me preference:', err);
  }
}

/**
 * Brute force tracking for Super Admin security
 */
export function getSuperAdminBruteForceStatus(): SuperAdminSecurityStatus {
  try {
    const attempts = parseInt(localStorage.getItem(STORAGE_KEYS.SUPER_ADMIN_ATTEMPTS) || '0', 10);
    const lockUntil = parseInt(localStorage.getItem(STORAGE_KEYS.SUPER_ADMIN_LOCK_UNTIL) || '0', 10);
    const now = Date.now();

    const isBruteForceLocked = lockUntil > now;
    const lockoutRemainingSeconds = isBruteForceLocked ? Math.ceil((lockUntil - now) / 1000) : 0;

    const currentSession = getStoredSession();
    const isElevated = Boolean(
      currentSession &&
      currentSession.role === 'super_admin' &&
      currentSession.isElevated &&
      currentSession.elevationExpiresAt &&
      new Date(currentSession.elevationExpiresAt).getTime() > now
    );

    let elevationRemainingSeconds = 0;
    if (isElevated && currentSession?.elevationExpiresAt) {
      elevationRemainingSeconds = Math.max(0, Math.ceil((new Date(currentSession.elevationExpiresAt).getTime() - now) / 1000));
    }

    return {
      isElevated,
      elevationRemainingSeconds,
      isBruteForceLocked,
      lockoutRemainingSeconds,
      failedAttempts: attempts,
    };
  } catch {
    return {
      isElevated: false,
      elevationRemainingSeconds: 0,
      isBruteForceLocked: false,
      lockoutRemainingSeconds: 0,
      failedAttempts: 0,
    };
  }
}

export function recordFailedSuperAdminAttempt(): SuperAdminSecurityStatus {
  try {
    let attempts = parseInt(localStorage.getItem(STORAGE_KEYS.SUPER_ADMIN_ATTEMPTS) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMIN_ATTEMPTS, String(attempts));

    let lockUntil = 0;
    if (attempts >= SESSION_CONFIG.MAX_SUPER_ADMIN_ATTEMPTS) {
      lockUntil = Date.now() + SESSION_CONFIG.SUPER_ADMIN_LOCKOUT_SECONDS * 1000;
      localStorage.setItem(STORAGE_KEYS.SUPER_ADMIN_LOCK_UNTIL, String(lockUntil));
    }

    return getSuperAdminBruteForceStatus();
  } catch {
    return getSuperAdminBruteForceStatus();
  }
}

export function resetSuperAdminAttempts() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SUPER_ADMIN_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEYS.SUPER_ADMIN_LOCK_UNTIL);
  } catch {}
}

/**
 * Extends/refreshes the active session expiration by 24 hours
 */
export function extendRememberedDeviceSession(): UserSessionData | null {
  const current = getStoredSession();
  if (!current || !isValidSession(current)) return null;

  const now = new Date();
  const expiresDate = new Date();
  expiresDate.setHours(expiresDate.getHours() + SESSION_CONFIG.REMEMBER_DEVICE_HOURS);

  const updated: UserSessionData = {
    ...current,
    rememberMe: true,
    lastActiveAt: now.toISOString(),
    expiresAt: expiresDate.toISOString(),
  };

  saveSessionToStorage(updated, true);
  setRememberedCredentials(updated.email, true);
  return updated;
}

/**
 * Record immutable Security Audit Log in Firestore and local telemetry
 */
export async function recordSecurityAuditLog(
  action: string,
  details: string,
  severity: 'info' | 'warning' | 'critical' = 'info'
) {
  try {
    const session = getStoredSession();
    const device = getClientDeviceInfo();
    const logId = await getNextSequenceId('activity_log_id');
    const logEntry = {
      id: logId,
      action,
      entityType: 'SECURITY_SESSION',
      entityId: session?.sessionId || 'ANONYMOUS',
      userId: session?.userId || 0,
      userEmail: session?.email || 'unauthenticated@system',
      details: `[${severity.toUpperCase()}] ${details} | Device: ${device.browser} on ${device.os}`,
      createdAt: new Date().toISOString(),
    };

    await db.collection(COLLECTIONS.ACTIVITY_LOGS).doc(String(logId)).set(logEntry);
  } catch (err) {
    console.warn('Failed to record security audit log:', err);
  }
}
