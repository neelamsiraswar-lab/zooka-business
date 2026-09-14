// server/middleware/rbac.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.ts';
import { UserRole, PermissionAction, hasPermission } from '../../src/lib/permissions.ts';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  avatarUrl: string | null;
}

export interface ExtendedAuthRequest extends AuthRequest {
  appUser?: AuthenticatedUser;
}

/**
 * Middleware that requires the user to have one of the specified roles.
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: ExtendedAuthRequest, res: Response, next: NextFunction) => {
    const role = req.appUser?.role;
    if (!role) {
      return res.status(401).json({ error: 'Unauthorized: User profile or role could not be determined.' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Access Denied: This operation requires one of the following roles: [${allowedRoles.join(
          ', '
        )}]. Your current role is '${role}'.`,
        code: 'FORBIDDEN_ROLE',
        requiredRoles: allowedRoles,
        currentRole: role,
      });
    }

    next();
  };
};

/**
 * Middleware that requires a specific granular permission action.
 */
export const requirePermission = (action: PermissionAction) => {
  return (req: ExtendedAuthRequest, res: Response, next: NextFunction) => {
    const role = req.appUser?.role;
    if (!role) {
      return res.status(401).json({ error: 'Unauthorized: User profile or role could not be determined.' });
    }

    if (!hasPermission(role, action)) {
      return res.status(403).json({
        error: `Access Denied: You lack the required '${action}' permission. Current role: '${role}'.`,
        code: 'FORBIDDEN_PERMISSION',
        action,
        currentRole: role,
      });
    }

    next();
  };
};

/**
 * Middleware that blocks any mutation if the user is an Auditor (strictly read-only role).
 */
export const requireNonAuditor = (req: ExtendedAuthRequest, res: Response, next: NextFunction) => {
  const role = req.appUser?.role;
  if (role === 'auditor') {
    return res.status(403).json({
      error: 'Access Denied: The Auditor role is strictly read-only. Data modifications, creation, and deletion are forbidden.',
      code: 'AUDITOR_READ_ONLY',
      currentRole: role,
    });
  }
  next();
};
