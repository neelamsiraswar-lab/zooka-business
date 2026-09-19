import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  UserCheck,
  UserCog,
  Trash2,
  Edit,
  X,
  Search,
  Filter,
  Check,
  Copy,
  RefreshCw,
  Sparkles,
  CreditCard,
  Layers,
  Landmark,
  MapPin,
  Mail,
  Phone,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Workspace } from '../types';
import {
  DbUser,
  UserRole,
  getAllUsers,
  getWorkspaceUsers,
  updateUserProfile,
  changeUserPassword,
  createTeamMember,
  assignUserToWorkspace,
  removeUserFromWorkspace,
} from '../db/users';
import { ROLE_CONFIG } from '../lib/permissions';
import { logActivity } from '../db/dataService';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { getPlanConfig, getSubscriptionStatusMeta, getDaysRemaining, formatINR } from '../data/subscriptionPlans';

interface WorkspaceDetailsUsersModalProps {
  workspace: Workspace;
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceUpdated?: () => void;
  onEnterWorkspace?: (ws: Workspace) => void;
}

export const WorkspaceDetailsUsersModal: React.FC<WorkspaceDetailsUsersModalProps> = ({
  workspace,
  isOpen,
  onClose,
  onWorkspaceUpdated,
  onEnterWorkspace,
}) => {
  const dialog = useDialog();
  const { user: currentAuthUser, profile: currentProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'overview' | 'subscription'>('users');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [workspaceUsers, setWorkspaceUsers] = useState<DbUser[]>([]);
  const [allPlatformUsers, setAllPlatformUsers] = useState<DbUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Password Change Modal State
  const [passwordTargetUser, setPasswordTargetUser] = useState<DbUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Add New User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addMode, setAddMode] = useState<'create_new' | 'assign_existing'>('create_new');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('accountant');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(true);
  const [newUserAvatar, setNewUserAvatar] = useState('');
  const [selectedExistingUserId, setSelectedExistingUserId] = useState<number | ''>('');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('accountant');
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'suspended'>('active');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete / Remove Confirmation State
  const [userToRemove, setUserToRemove] = useState<DbUser | null>(null);
  const [removingUser, setRemovingUser] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const [wsMembers, allUsers] = await Promise.all([
        getWorkspaceUsers(workspace.id, workspace.ownerEmail),
        getAllUsers(),
      ]);

      // If workspace owner is not in list, find them or create representation
      let members = [...wsMembers];
      const ownerEmail = (workspace.ownerEmail || '').toLowerCase().trim();
      const hasOwnerInList = members.some(
        (u) => (u.email || '').toLowerCase().trim() === ownerEmail
      );

      if (!hasOwnerInList && ownerEmail) {
        const matchingPlatformUser = allUsers.find(
          (u) => (u.email || '').toLowerCase().trim() === ownerEmail
        );
        if (matchingPlatformUser) {
          members.unshift(matchingPlatformUser);
        }
      }

      setWorkspaceUsers(members);
      setAllPlatformUsers(allUsers);
    } catch (err) {
      console.error('Failed to load workspace users:', err);
      dialog.toast.error('Failed to load workspace members');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, workspace.id]);

  if (!isOpen) return null;

  // Plan & Subscription Helpers
  const planConfig = getPlanConfig(workspace.plan);
  const statusMeta = getSubscriptionStatusMeta(workspace.subscriptionStatus || workspace.status);
  const expiryMeta = getDaysRemaining(workspace.currentPeriodEnd || workspace.trialEndsAt);
  const maxSeats = workspace.maxUsers ?? planConfig.maxUsers;
  const isUnlimitedSeats = maxSeats === -1;

  // Filtered Users
  const filteredUsers = workspaceUsers.filter((u) => {
    const matchesSearch =
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(u.id).includes(searchQuery);

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Candidate existing users who are not yet in this workspace
  const unassignedExistingUsers = allPlatformUsers.filter(
    (u) => !workspaceUsers.some((wu) => wu.id === u.id)
  );

  // Strong Password Generator Helper
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const handleOpenPasswordModal = (user: DbUser) => {
    setPasswordTargetUser(user);
    const suggested = generateRandomPassword();
    setNewPassword(suggested);
    setShowPassword(true);
    setPasswordCopied(false);
    setPasswordError(null);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setPasswordCopied(true);
    dialog.toast.success('Password copied to clipboard');
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;

    if (!newPassword || newPassword.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    setUpdatingPassword(true);
    setPasswordError(null);

    try {
      await changeUserPassword(passwordTargetUser.id, newPassword.trim());

      await logActivity(
        currentProfile?.id || 1,
        currentProfile?.email || currentAuthUser?.email || 'admin@gstbooks.local',
        'SUPERADMIN_RESET_USER_PASSWORD',
        'User',
        String(passwordTargetUser.id),
        `Super Admin reset password for workspace user ${passwordTargetUser.email} (${passwordTargetUser.displayName}) in workspace "${workspace.name}" [ID: ${workspace.id}]`
      );

      dialog.toast.success(`Password for ${passwordTargetUser.displayName || passwordTargetUser.email} updated successfully`);
      setPasswordTargetUser(null);
      await loadUsers();
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setPasswordError(err.message || 'Failed to update user password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleOpenAddUser = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('accountant');
    setNewUserPassword(generateRandomPassword());
    setShowNewUserPassword(true);
    setNewUserAvatar('');
    setSelectedExistingUserId(unassignedExistingUsers[0]?.id || '');
    setAddMode('create_new');
    setShowAddUserModal(true);
  };

  const handleCreateOrAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);

    try {
      if (addMode === 'create_new') {
        if (!newUserEmail || !newUserName) {
          dialog.toast.warning('Please enter both name and email');
          setSubmittingUser(false);
          return;
        }

        const created = await createTeamMember({
          email: newUserEmail.trim(),
          displayName: newUserName.trim(),
          role: newUserRole,
          password: newUserPassword.trim() || undefined,
          avatarUrl: newUserAvatar || undefined,
          workspaceId: workspace.id,
        });

        await logActivity(
          currentProfile?.id || 1,
          currentProfile?.email || currentAuthUser?.email || 'admin@gstbooks.local',
          'SUPERADMIN_CREATE_WORKSPACE_USER',
          'User',
          String(created.id),
          `Super Admin provisioned new ${newUserRole} "${created.displayName}" (${created.email}) into workspace "${workspace.name}"`
        );

        dialog.toast.success(`User ${created.displayName} created and enrolled in ${workspace.name}`);
      } else {
        if (!selectedExistingUserId) {
          dialog.toast.warning('Please select a platform user to assign');
          setSubmittingUser(false);
          return;
        }

        const assigned = await assignUserToWorkspace(Number(selectedExistingUserId), workspace.id);

        await logActivity(
          currentProfile?.id || 1,
          currentProfile?.email || currentAuthUser?.email || 'admin@gstbooks.local',
          'SUPERADMIN_ASSIGN_WORKSPACE_USER',
          'User',
          String(assigned.id),
          `Super Admin assigned existing user "${assigned.displayName}" (${assigned.email}) to workspace "${workspace.name}"`
        );

        dialog.toast.success(`User ${assigned.displayName} assigned to ${workspace.name}`);
      }

      setShowAddUserModal(false);
      await loadUsers();
      onWorkspaceUpdated?.();
    } catch (err: any) {
      console.error('Failed to add workspace user:', err);
      dialog.toast.error(err.message || 'Failed to add user to workspace');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleOpenEditUser = (u: DbUser) => {
    setEditingUser(u);
    setEditUserName(u.displayName || '');
    setEditUserEmail(u.email || '');
    setEditUserRole(u.role || 'accountant');
    setEditUserStatus(u.status || 'active');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmittingEdit(true);
    try {
      await updateUserProfile(editingUser.id, {
        displayName: editUserName.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        status: editUserStatus,
      });

      await logActivity(
        currentProfile?.id || 1,
        currentProfile?.email || currentAuthUser?.email || 'admin@gstbooks.local',
        'SUPERADMIN_UPDATE_WORKSPACE_USER',
        'User',
        String(editingUser.id),
        `Super Admin updated user profile for ${editUserEmail} in workspace "${workspace.name}"`
      );

      dialog.toast.success(`User profile updated for ${editUserName || editUserEmail}`);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to update user:', err);
      dialog.toast.error(err.message || 'Failed to update user details');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleConfirmRemoveUser = async () => {
    if (!userToRemove) return;
    setRemovingUser(true);

    try {
      await removeUserFromWorkspace(userToRemove.id, workspace.id);

      await logActivity(
        currentProfile?.id || 1,
        currentProfile?.email || currentAuthUser?.email || 'admin@gstbooks.local',
        'SUPERADMIN_REMOVE_WORKSPACE_USER',
        'User',
        String(userToRemove.id),
        `Super Admin unlinked user "${userToRemove.displayName}" (${userToRemove.email}) from workspace "${workspace.name}"`
      );

      dialog.toast.success(`User ${userToRemove.displayName || userToRemove.email} removed from workspace`);
      setUserToRemove(null);
      await loadUsers();
      onWorkspaceUpdated?.();
    } catch (err: any) {
      console.error('Failed to remove user:', err);
      dialog.toast.error(err.message || 'Failed to remove user');
    } finally {
      setRemovingUser(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">{workspace.name}</h2>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {planConfig.name} Plan
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                  <span>{statusMeta.label}</span>
                </span>
                {workspace.isDefault && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-semibold uppercase">
                    Primary
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>{workspace.businessName}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-400">GSTIN: {workspace.gstin || 'Unregistered'}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{workspace.stateName} ({workspace.stateCode})</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {onEnterWorkspace && (
              <button
                type="button"
                onClick={() => {
                  onEnterWorkspace(workspace);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Enter Books</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Workspace Users & Credentials</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {workspaceUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Entity & Tax Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'subscription'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Plan & Quota Controls</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: USERS & CREDENTIALS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              
              {/* Top Banner with Quota & Add Member Button */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Workspace Membership & Security Authority
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Super Admin has full rights to inspect user credentials, reset passwords, and assign RBAC privileges.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden md:block">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Enrolled Seats
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {workspaceUsers.length} of {isUnlimitedSeats ? '∞ Unlimited' : `${maxSeats} Max`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddUser}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add / Enroll User</span>
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or ID..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Administrator</option>
                    <option value="accountant">Senior Accountant</option>
                    <option value="billing_operator">Billing Operator</option>
                    <option value="auditor">Statutory Auditor</option>
                  </select>

                  <button
                    type="button"
                    onClick={loadUsers}
                    disabled={loadingUsers}
                    title="Refresh user list"
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {loadingUsers ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                    <p className="text-xs">Fetching workspace users and security roles from Cloud Firestore...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-3">
                    <Users className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">No users found for this workspace</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Click the "Add / Enroll User" button to invite a team member or assign an existing platform user.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Responsive Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">User & Contact</th>
                            <th className="py-3 px-3">Role & Permissions</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Enrolled / Added</th>
                            <th className="py-3 px-3 text-center">Credentials</th>
                            <th className="py-3 px-4 text-right">Super Admin Governance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredUsers.map((u) => {
                            const isOwner =
                              (u.email || '').toLowerCase().trim() ===
                              (workspace.ownerEmail || '').toLowerCase().trim();
                            
                            const roleMeta = ROLE_CONFIG[u.role] || {
                              title: u.role,
                              badge: u.role,
                              bgBadge: 'bg-slate-800',
                              textBadge: 'text-slate-300',
                              borderBadge: 'border-slate-700',
                            };

                            return (
                              <tr key={u.id} className="hover:bg-slate-800/30 transition">
                                {/* Avatar + Name + Email */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      {u.avatarUrl ? (
                                        <img
                                          src={u.avatarUrl}
                                          alt={u.displayName}
                                          className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center justify-center text-xs">
                                          {(u.displayName || u.email || 'U').substring(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      {isOwner && (
                                        <span
                                          title="Workspace Primary Owner"
                                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center border-2 border-slate-900"
                                        >
                                          ★
                                        </span>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="font-bold text-white flex items-center gap-1.5">
                                        <span className="truncate">{u.displayName || 'Unnamed User'}</span>
                                        {isOwner && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold uppercase">
                                            Owner
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-slate-400 text-xs font-mono truncate">{u.email}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">UID: {u.uid?.slice(0, 10) || `user-${u.id}`}</div>
                                    </div>
                                  </div>
                                </td>

                                {/* Role */}
                                <td className="py-3.5 px-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${roleMeta.bgBadge} ${roleMeta.textBadge} ${roleMeta.borderBadge}`}
                                  >
                                    <Shield className="w-3 h-3" />
                                    <span>{roleMeta.title || u.role}</span>
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      u.status === 'suspended'
                                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        u.status === 'suspended' ? 'bg-rose-400' : 'bg-emerald-400'
                                      }`}
                                    />
                                    <span className="capitalize">{u.status || 'Active'}</span>
                                  </span>
                                </td>

                                {/* Joined Date */}
                                <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  }) : 'Platform Launch'}
                                </td>

                                {/* Credentials Status */}
                                <td className="py-3.5 px-3 text-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-medium text-slate-300 font-mono">
                                    <Lock className="w-2.5 h-2.5 text-indigo-400" />
                                    <span>Password Set</span>
                                  </span>
                                </td>

                                {/* Super Admin Action Buttons */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    {/* Right to Change Password */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPasswordModal(u)}
                                      title="Right to Reset / Change User Password"
                                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm hover:scale-102"
                                    >
                                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Change Password</span>
                                    </button>

                                    {/* Edit Profile & Role */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditUser(u)}
                                      title="Edit User Profile & Role"
                                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Remove / Unlink from Workspace */}
                                    <button
                                      type="button"
                                      onClick={() => setUserToRemove(u)}
                                      title="Remove User from this Workspace"
                                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Responsive Cards View */}
                    <div className="block md:hidden divide-y divide-slate-800/60">
                      {filteredUsers.map((u) => {
                        const isOwner =
                          (u.email || '').toLowerCase().trim() ===
                          (workspace.ownerEmail || '').toLowerCase().trim();
                        
                        const roleMeta = ROLE_CONFIG[u.role] || {
                          title: u.role,
                          badge: u.role,
                          bgBadge: 'bg-slate-800',
                          textBadge: 'text-slate-300',
                          borderBadge: 'border-slate-700',
                        };

                        return (
                          <div key={u.id} className="p-4 space-y-3.5 hover:bg-slate-800/20 transition">
                            {/* User Header: Avatar, Name, Owner Badge, Status */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                  {u.avatarUrl ? (
                                    <img
                                      src={u.avatarUrl}
                                      alt={u.displayName}
                                      className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center justify-center text-xs">
                                      {(u.displayName || u.email || 'U').substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  {isOwner && (
                                    <span
                                      title="Workspace Primary Owner"
                                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center border-2 border-slate-900"
                                    >
                                      ★
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                                    <span className="truncate">{u.displayName || 'Unnamed User'}</span>
                                    {isOwner && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold uppercase">
                                        Owner
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-400 text-xs font-mono truncate">{u.email}</div>
                                </div>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                                  u.status === 'suspended'
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    u.status === 'suspended' ? 'bg-rose-400' : 'bg-emerald-400'
                                  }`}
                                />
                                <span className="capitalize">{u.status || 'Active'}</span>
                              </span>
                            </div>

                            {/* User Badges & Metadata */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${roleMeta.bgBadge} ${roleMeta.textBadge} ${roleMeta.borderBadge}`}
                              >
                                <Shield className="w-3 h-3" />
                                <span>{roleMeta.title || u.role}</span>
                              </span>

                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-medium text-slate-300 font-mono">
                                <Lock className="w-2.5 h-2.5 text-indigo-400" />
                                <span>Password Set</span>
                              </span>

                              <span className="text-[10px] text-slate-500 ml-auto font-mono">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                }) : 'Enrolled'}
                              </span>
                            </div>

                            {/* Mobile Action Buttons: Large touch-friendly controls */}
                            <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
                              {/* Change Password Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenPasswordModal(u)}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/15 hover:from-amber-500/25 hover:to-amber-600/25 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
                              >
                                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>Change Password</span>
                              </button>

                              {/* Edit User */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                title="Edit User Profile & Role"
                                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Remove User */}
                              <button
                                type="button"
                                onClick={() => setUserToRemove(u)}
                                title="Remove User from this Workspace"
                                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ENTITY & TAX OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Business Profile */}
                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>Corporate Identity & Trade Profile</span>
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Display Name:</span>
                      <span className="font-semibold text-white">{workspace.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Legal Business Name:</span>
                      <span className="font-semibold text-slate-200">{workspace.businessName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Trade / Brand Name:</span>
                      <span className="text-slate-300">{workspace.tradeName || 'Same as Legal Name'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Workspace Slug / ID:</span>
                      <span className="font-mono text-indigo-400">{workspace.id}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Registered Address:</span>
                      <span className="text-slate-300 text-right max-w-xs">{workspace.address || 'Address not configured'}</span>
                    </div>
                  </div>
                </div>

                {/* GST & Tax Jurisdiction */}
                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    <span>GSTIN & Tax Jurisdiction</span>
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">GSTIN Number:</span>
                      <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {workspace.gstin || 'Unregistered Entity'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">State & GST Code:</span>
                      <span className="text-slate-200">{workspace.stateName} (State Code: {workspace.stateCode})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Invoice Series Prefix:</span>
                      <span className="font-mono text-emerald-400">{workspace.invoicePrefix || 'INV/2026-27/'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Purchase Bill Prefix:</span>
                      <span className="font-mono text-emerald-400">{workspace.purchasePrefix || 'PUR/2026-27/'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Receipt Voucher Prefix:</span>
                      <span className="font-mono text-emerald-400">{workspace.receiptPrefix || 'REC/2026-27/'}</span>
                    </div>
                  </div>
                </div>

                {/* Banking & UPI */}
                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-3.5 md:col-span-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Banking Settlement Coordinates</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block uppercase font-bold">Bank Name</span>
                      <span className="text-white font-medium mt-1 block">{workspace.bankName || 'Not Set'}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block uppercase font-bold">Account Number</span>
                      <span className="text-white font-mono font-medium mt-1 block">{workspace.accountNumber || 'Not Set'}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block uppercase font-bold">IFSC Code</span>
                      <span className="text-white font-mono font-medium mt-1 block">{workspace.ifscCode || 'Not Set'}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block uppercase font-bold">Merchant UPI VPA</span>
                      <span className="text-emerald-400 font-mono font-medium mt-1 block">{workspace.upiId || 'Not Set'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTION & QUOTA CONTROLS */}
          {activeTab === 'subscription' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Assigned Plan</span>
                  <span className="text-lg font-black text-indigo-400 mt-1 block capitalize">{workspace.plan} Tier</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{workspace.billingCycle || 'annual'} billing cadence</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">User Seats Quota</span>
                  <span className="text-lg font-black text-white mt-1 block">
                    {workspaceUsers.length} / {isUnlimitedSeats ? 'Unlimited' : maxSeats}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {isUnlimitedSeats ? 'No seat restriction' : `${Math.max(0, maxSeats - workspaceUsers.length)} seats available`}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Period Validity</span>
                  <span className={`text-lg font-black mt-1 block ${expiryMeta.isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {expiryMeta.label}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Ends {workspace.currentPeriodEnd ? new Date(workspace.currentPeriodEnd).toLocaleDateString('en-IN') : 'Ongoing'}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>Module Entitlements for {planConfig.name} Tier</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                  {planConfig.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Workspace ID: <span className="font-mono text-slate-400">{workspace.id}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* ---------------- SUB-MODAL 1: RIGHT TO CHANGE PASSWORD ---------------- */}
      {passwordTargetUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset User Password</h3>
                  <p className="text-xs text-slate-400">Super Admin Credential Authority</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordTargetUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Info Banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                {(passwordTargetUser.displayName || passwordTargetUser.email || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{passwordTargetUser.displayName}</div>
                <div className="text-[11px] text-slate-400 font-mono truncate">{passwordTargetUser.email}</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {passwordTargetUser.role}
              </span>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">New Password *</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter or generate secure password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-20 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      title="Copy password to clipboard"
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                    >
                      {passwordCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  The user can immediately log in with this new password and their email ({passwordTargetUser.email}).
                </p>
              </div>

              {/* Password Quality Pill */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Password will be securely updated in Cloud Firestore with Super Admin audit trail.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPassword || !newPassword}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  {updatingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- SUB-MODAL 2: ADD / ENROLL USER ---------------- */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Enroll User in Workspace</h3>
                  <p className="text-xs text-slate-400">Provision credentials or attach an existing platform user</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAddMode('create_new')}
                className={`py-2 rounded-lg transition ${
                  addMode === 'create_new'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create New Member
              </button>
              <button
                type="button"
                onClick={() => setAddMode('assign_existing')}
                disabled={unassignedExistingUsers.length === 0}
                className={`py-2 rounded-lg transition ${
                  addMode === 'assign_existing'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                Assign Existing User ({unassignedExistingUsers.length})
              </button>
            </div>

            <form onSubmit={handleCreateOrAssignUser} className="space-y-4 text-xs">
              {addMode === 'create_new' ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Full Display Name *</label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Email Address (Login ID) *</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="priya@company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Security Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="admin">Administrator (Full Control)</option>
                      <option value="accountant">Senior Accountant (Ledgers & Vouchers)</option>
                      <option value="billing_operator">Billing Operator (Invoices & POS)</option>
                      <option value="auditor">Statutory Auditor (Read-Only Books)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-300">Initial Password *</label>
                      <button
                        type="button"
                        onClick={() => setNewUserPassword(generateRandomPassword())}
                        className="text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Generate</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewUserPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Set user password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Select Existing Platform User</label>
                  <select
                    value={selectedExistingUserId}
                    onChange={(e) => setSelectedExistingUserId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {unassignedExistingUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} ({u.email}) - {u.role}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-2">
                    This user will immediately be granted access to "{workspace.name}" without changing their existing password.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  {submittingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{addMode === 'create_new' ? 'Create & Enroll' : 'Assign to Workspace'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- SUB-MODAL 3: EDIT USER PROFILE ---------------- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit User Profile & Role</h3>
                  <p className="text-xs text-slate-400">Super Admin RBAC Authority</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Assigned Security Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="admin">Administrator (Full Control)</option>
                  <option value="accountant">Senior Accountant (Financial Vouchers)</option>
                  <option value="billing_operator">Billing Operator (Invoices Only)</option>
                  <option value="auditor">Statutory Auditor (Read-Only Books)</option>
                  <option value="super_admin">Super Admin (Platform Master)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Account Status</label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="active">Active (Access Allowed)</option>
                  <option value="suspended">Suspended (Access Revoked)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
                >
                  {submittingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- SUB-MODAL 4: CONFIRM REMOVE USER ---------------- */}
      {userToRemove && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove User from Workspace?</h3>
                <p className="text-xs text-slate-400">This will revoke user access to this workspace</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
              Are you sure you want to remove <strong className="text-white">{userToRemove.displayName}</strong> ({userToRemove.email}) from workspace <strong className="text-indigo-300">"{workspace.name}"</strong>?
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToRemove(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveUser}
                disabled={removingUser}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 transition cursor-pointer"
              >
                {removingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Remove User</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
