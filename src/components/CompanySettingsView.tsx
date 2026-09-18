import React, { useState, useEffect, useRef } from 'react';
import { CompanyProfile, Invoice, SettingsTab } from '../types';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Building2,
  CheckCircle,
  Save,
  ShieldCheck,
  CreditCard,
  QrCode,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Hash,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders,
  AlertTriangle,
  Search,
  Info,
  Check,
  HelpCircle,
  ShieldAlert,
  Palette,
  Eye,
  EyeOff,
  LayoutTemplate,
  Layers,
  Type,
  Trash2,
  Download,
  Upload,
  HardDrive,
  User,
  Shield,
  Lock,
  UserPlus,
  X,
  Pencil,
  UserX,
  UserCog,
  Server,
  Cpu,
  Globe,
  Activity,
  CheckCircle2,
  Zap,
  Radio,
  ExternalLink,
  Database,
} from 'lucide-react';
import { InvoiceTemplateRenderer, COLOR_THEMES } from './InvoiceTemplateRenderer.tsx';
import { LocalImageUploader } from './LocalImageUploader.tsx';
import { WorkspaceSubscriptionView } from './WorkspaceSubscriptionView.tsx';
import { TenantWhiteLabelSettings } from './TenantWhiteLabelSettings.tsx';
import { BulkDataMigrationModal } from './BulkDataMigrationModal.tsx';
import {
  hasPermission,
  isReadOnlyRole,
  ROLE_CONFIG,
  UserRole,
} from '../lib/permissions';
import {
  getAllUsers,
  createTeamMember,
  updateUserRole,
  updateUserProfile,
  deleteUser,
} from '../db/users';
import {
  getFullDataBackup,
  restoreDataFromBackup,
  checkInvoiceNumberDuplicate,
  logActivity,
} from '../db/dataService';

interface CompanySettingsViewProps {
  company: CompanyProfile | null;
  onSaveCompany: (data: any) => Promise<any>;
  onClearMasterLedger?: () => void;
  loading: boolean;
  initialSettingsTab?: SettingsTab;
  onSettingsTabChange?: (tab: SettingsTab) => void;
  workspace?: any;
}

export const ALL_INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman and Diu' },
  { code: '26', name: 'Dadra and Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  company,
  onSaveCompany,
  onClearMasterLedger,
  loading,
  initialSettingsTab,
  onSettingsTabChange,
  workspace,
}) => {
  const { getToken, profile, refreshProfile, signInAsUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialSettingsTab || 'general');
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (onSettingsTabChange) {
      onSettingsTabChange(tab);
    }
  };

  useEffect(() => {
    if (initialSettingsTab) {
      setActiveTab(initialSettingsTab);
    }
  }, [initialSettingsTab]);

  const currentUserRole: UserRole = (profile?.role as UserRole) || 'accountant';
  const canClearLedger = hasPermission(currentUserRole, 'settings:clear_ledger');
  const canRestore = hasPermission(currentUserRole, 'settings:restore');
  const canEditCompany = hasPermission(currentUserRole, 'settings:edit_company');
  const canManageRoles = hasPermission(currentUserRole, 'users:manage_roles');
  const canEditUsers = hasPermission(currentUserRole, 'users:edit');
  const canDeleteUsers = hasPermission(currentUserRole, 'users:delete');

  // Synchronization and persistence protection refs
  const hasInitializedRef = useRef(false);
  const lastCompanyIdRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);
  const [templateAutoSaved, setTemplateAutoSaved] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [userDisplayName, setUserDisplayName] = useState(profile?.displayName || '');
  const [userAvatarUrl, setUserAvatarUrl] = useState(profile?.avatarUrl || (profile as any)?.photoURL || '');
  const [userRole, setUserRole] = useState<'admin' | 'accountant' | 'auditor' | 'billing_operator'>(profile?.role || 'accountant');
  const [savingUser, setSavingUser] = useState(false);
  const [userSaveSuccess, setUserSaveSuccess] = useState(false);

  // RBAC Team Members State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteAvatar, setInviteAvatar] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('accountant');
  const [inviting, setInviting] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);

  // Edit Other User Profile State
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberEmail, setEditMemberEmail] = useState('');
  const [editMemberPassword, setEditMemberPassword] = useState('');
  const [showEditMemberPassword, setShowEditMemberPassword] = useState(false);
  const [editMemberRole, setEditMemberRole] = useState<UserRole>('accountant');
  const [editMemberAvatar, setEditMemberAvatar] = useState('');
  const [savingEditMember, setSavingEditMember] = useState(false);
  const [editMemberError, setEditMemberError] = useState<string | null>(null);

  // Delete Other User Profile State
  const [deletingMember, setDeletingMember] = useState<any | null>(null);
  const [deletingMemberLoading, setDeletingMemberLoading] = useState(false);
  const [deleteMemberError, setDeleteMemberError] = useState<string | null>(null);

  // Bulk Migration Modal State
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  const fetchTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      const list = await getAllUsers();
      setTeamMembers(list || []);
    } catch (e) {
      console.error('Fetch team members error:', e);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchTeamMembers();
    }
  }, [activeTab]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    try {
      setInviting(true);
      const member = await createTeamMember({
        email: inviteEmail.trim(),
        displayName: inviteName.trim(),
        role: inviteRole,
        password: invitePassword.trim() || undefined,
        avatarUrl: inviteAvatar.trim() || undefined,
      });
      await logActivity(
        profile?.id || 1,
        profile?.email || 'user',
        'INVITE_TEAM_MEMBER',
        'user',
        String(member.id),
        `Added team member ${member.displayName} (${member.email}) with role ${member.role.toUpperCase()}`
      );
      setInviteEmail('');
      setInviteName('');
      setInviteAvatar('');
      setInvitePassword('');
      setShowInviteModal(false);
      await fetchTeamMembers();
    } catch (e: any) {
      console.error('Invite member error:', e);
      alert(e.message || 'Failed to add team member');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateMemberRole = async (targetUserId: number, newRole: UserRole) => {
    try {
      setUpdatingMemberId(targetUserId);
      const updated = await updateUserRole(targetUserId, newRole);
      if (updated) {
        await logActivity(
          profile?.id || 1,
          profile?.email || 'user',
          'UPDATE_USER_ROLE',
          'user',
          String(targetUserId),
          `Updated role for ${updated.displayName || updated.email} to ${newRole.toUpperCase()}`
        );
        await fetchTeamMembers();
        if (targetUserId === profile?.id) {
          await refreshProfile();
        }
      }
    } catch (e: any) {
      console.error('Update user role error:', e);
      alert(e.message || 'Failed to update user role');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const openEditMemberModal = (member: any) => {
    setEditingMember(member);
    setEditMemberName(member.displayName || '');
    setEditMemberEmail(member.email || '');
    setEditMemberPassword(member.password || '');
    setEditMemberRole((member.role as UserRole) || 'accountant');
    setEditMemberAvatar(member.avatarUrl || '');
    setEditMemberError(null);
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editMemberName.trim()) {
      setEditMemberError('Full display name is required');
      return;
    }
    if (!editMemberEmail.trim()) {
      setEditMemberError('Email address is required');
      return;
    }

    try {
      setSavingEditMember(true);
      setEditMemberError(null);

      const updateData: any = {
        displayName: editMemberName.trim(),
        email: editMemberEmail.trim(),
        role: editMemberRole,
        avatarUrl: editMemberAvatar.trim(),
      };
      if (editMemberPassword.trim()) {
        updateData.password = editMemberPassword.trim();
      }

      const updated = await updateUserProfile(editingMember.id, updateData);

      if (updated) {
        await logActivity(
          profile?.id || 1,
          profile?.email || 'user',
          'EDIT_USER_PROFILE',
          'user',
          String(editingMember.id),
          `Admin edited profile for ${updated.displayName || updated.email} (Role: ${updated.role})`
        );
        setEditingMember(null);
        await fetchTeamMembers();
        if (editingMember.id === profile?.id) {
          await refreshProfile();
        }
      }
    } catch (e: any) {
      setEditMemberError(e.message || 'Error updating user profile');
    } finally {
      setSavingEditMember(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deletingMember) return;

    try {
      setDeletingMemberLoading(true);
      setDeleteMemberError(null);

      const deleted = await deleteUser(deletingMember.id, profile?.id || 1);
      if (deleted) {
        await logActivity(
          profile?.id || 1,
          profile?.email || 'user',
          'DELETE_USER_PROFILE',
          'user',
          String(deletingMember.id),
          `Admin deleted user profile ${deletingMember.displayName || deletingMember.email}`
        );
        setDeletingMember(null);
        await fetchTeamMembers();
      }
    } catch (e: any) {
      setDeleteMemberError(e.message || 'Error deleting user profile');
    } finally {
      setDeletingMemberLoading(false);
    }
  };

  const handleQuickSwitchRole = async (targetRole: UserRole) => {
    if (targetRole === currentUserRole || !profile?.id) return;
    try {
      await updateUserRole(profile.id, targetRole);
      await logActivity(
        profile.id,
        profile.email,
        'SWITCH_ACTIVE_ROLE',
        'user',
        String(profile.id),
        `User switched active role to ${targetRole.toUpperCase()}`
      );
      await refreshProfile();
      setUserSaveSuccess(true);
      setTimeout(() => setUserSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to switch role:', err);
      alert(err?.message || 'Failed to switch role');
    }
  };

  useEffect(() => {
    if (profile) {
      setUserDisplayName(profile.displayName || '');
      setUserRole(profile.role || 'accountant');
      setUserAvatarUrl(profile.avatarUrl || (profile as any)?.photoURL || '');
    }
  }, [profile]);

  const handleSaveUserProfile = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    if (!profile?.id) return;
    setSavingUser(true);
    setUserSaveSuccess(false);
    try {
      await updateUserProfile(profile.id, {
        displayName: userDisplayName,
        avatarUrl: userAvatarUrl.trim(),
      });
      await logActivity(
        profile.id,
        profile.email,
        'UPDATE_PROFILE',
        'user',
        String(profile.id),
        `User updated display name / avatar`
      );
      await refreshProfile();
      setUserSaveSuccess(true);
      setTimeout(() => setUserSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Update profile error:', err);
      alert('Failed to update user profile');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const backupData = await getFullDataBackup(profile?.id);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `accounting_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      await logActivity(
        profile?.id || 1,
        profile?.email || 'user',
        'BACKUP_DATA',
        'system',
        'backup',
        'Downloaded JSON data backup snapshot'
      );
    } catch (err) {
      console.error('Download backup error:', err);
      alert('Error downloading backup file');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring data will overwrite all current master ledgers, inventory, parties, and transactions with the backup file data. Are you sure you want to proceed?')) {
      if (restoreFileRef.current) restoreFileRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const parsedData = JSON.parse(jsonContent);

        setBackupLoading(true);
        await restoreDataFromBackup(parsedData, profile?.id || 1);
        await logActivity(
          profile?.id || 1,
          profile?.email || 'user',
          'RESTORE_DATA',
          'system',
          'backup',
          'Restored data from uploaded JSON snapshot'
        );

        alert('Data backup restored successfully!');
        window.location.reload();
      } catch (err: any) {
        console.error('Restore error:', err);
        alert('Invalid JSON backup file or restore failed.');
      } finally {
        setBackupLoading(false);
        if (restoreFileRef.current) restoreFileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Tab 1: General & GST
  const [businessName, setBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [compositeScheme, setCompositeScheme] = useState(false);
  const [msmeNumber, setMsmeNumber] = useState('');
  const [cinNumber, setCinNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [financialYear, setFinancialYear] = useState('2026-27');

  // Tab 2: Invoice Serial Numbering & Duplicity Control
  const [invoiceNumberingMode, setInvoiceNumberingMode] = useState<'automatic' | 'manual'>('automatic');
  const [invoicePrefix, setInvoicePrefix] = useState('INV/2026-27/');
  const [invoiceSuffix, setInvoiceSuffix] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<number>(1);
  const [invoicePadding, setInvoicePadding] = useState<number>(3);
  const [preventDuplicateInvoiceNo, setPreventDuplicateInvoiceNo] = useState<boolean>(true);

  const [purchaseNumberingMode, setPurchaseNumberingMode] = useState<'automatic' | 'manual'>('automatic');
  const [purchasePrefix, setPurchasePrefix] = useState('PUR/2026-27/');
  const [nextPurchaseNumber, setNextPurchaseNumber] = useState<number>(1);

  const [receiptPrefix, setReceiptPrefix] = useState('RCT/2026-27/');
  const [nextReceiptNumber, setNextReceiptNumber] = useState<number>(1);

  const [paymentPrefix, setPaymentPrefix] = useState('PAY/2026-27/');
  const [nextPaymentNumber, setNextPaymentNumber] = useState<number>(1);

  // Tab: Sale Invoice Design & Styling
  const [invoiceDesignTemplate, setInvoiceDesignTemplate] = useState<NonNullable<CompanyProfile['invoiceDesignTemplate']>>('modern');
  const [invoiceColorTheme, setInvoiceColorTheme] = useState<NonNullable<CompanyProfile['invoiceColorTheme']>>('emerald');
  const [invoiceHeaderTitle, setInvoiceHeaderTitle] = useState('TAX INVOICE');
  const [invoiceSubtitle, setInvoiceSubtitle] = useState('ORIGINAL FOR RECIPIENT');
  const [invoiceShowLogo, setInvoiceShowLogo] = useState(true);
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState('');
  const [invoiceShowBankDetails, setInvoiceShowBankDetails] = useState(true);
  const [invoiceShowUpiQr, setInvoiceShowUpiQr] = useState(true);
  const [invoiceShowAuthorizedSignatory, setInvoiceShowAuthorizedSignatory] = useState(true);
  const [invoiceSignatoryLabel, setInvoiceSignatoryLabel] = useState('Authorized Signatory');
  const [invoiceSignatureUrl, setInvoiceSignatureUrl] = useState('');
  const [invoiceShowHsnSummary, setInvoiceShowHsnSummary] = useState(true);
  const [invoiceShowTerms, setInvoiceShowTerms] = useState(true);
  const [previewSupplyType, setPreviewSupplyType] = useState<'intra' | 'inter'>('intra');

  // Tab 3: Banking & UPI
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Tab 4: Terms & Notes
  const [defaultTerms, setDefaultTerms] = useState('');
  const [defaultNotes, setDefaultNotes] = useState('');

  // Sandbox duplicate test
  const [testNumber, setTestNumber] = useState('');
  const [testResult, setTestResult] = useState<{ checked: boolean; isDuplicate: boolean; details?: any } | null>(null);
  const [testingDuplicate, setTestingDuplicate] = useState(false);

  // Status feedback
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedEntityName, setSavedEntityName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate form fields from a company profile
  const populateFromCompany = (target: CompanyProfile) => {
    setBusinessName(target.businessName || '');
    setTradeName(target.tradeName || '');
    setGstin(target.gstin || '');
    setStateCode(target.stateCode || '27');
    setAddress(target.address || '');
    setPhone(target.phone || '');
    setEmail(target.email || '');
    setPanNumber(target.panNumber || (target.gstin && target.gstin.length >= 12 ? target.gstin.slice(2, 12) : ''));
    setCompositeScheme(Boolean(target.compositeScheme));
    setMsmeNumber(target.msmeNumber || '');
    setCinNumber(target.cinNumber || '');
    setWebsite(target.website || '');
    setFinancialYear(target.financialYear || '2026-27');

    setInvoiceNumberingMode(target.invoiceNumberingMode || 'automatic');
    setInvoicePrefix(target.invoicePrefix !== undefined ? target.invoicePrefix : 'INV/2026-27/');
    setInvoiceSuffix(target.invoiceSuffix || '');
    setNextInvoiceNumber(target.nextInvoiceNumber || 1);
    setInvoicePadding(target.invoicePadding !== undefined ? target.invoicePadding : 3);
    setPreventDuplicateInvoiceNo(target.preventDuplicateInvoiceNo !== false);

    setPurchaseNumberingMode(target.purchaseNumberingMode || 'automatic');
    setPurchasePrefix(target.purchasePrefix !== undefined ? target.purchasePrefix : 'PUR/2026-27/');
    setNextPurchaseNumber(target.nextPurchaseNumber || 1);

    setReceiptPrefix(target.receiptPrefix !== undefined ? target.receiptPrefix : 'RCT/2026-27/');
    setNextReceiptNumber(target.nextReceiptNumber || 1);

    setPaymentPrefix(target.paymentPrefix !== undefined ? target.paymentPrefix : 'PAY/2026-27/');
    setNextPaymentNumber(target.nextPaymentNumber || 1);

    setInvoiceDesignTemplate(target.invoiceDesignTemplate || 'modern');
    setInvoiceColorTheme(target.invoiceColorTheme || 'emerald');
    setInvoiceHeaderTitle(target.invoiceHeaderTitle || 'TAX INVOICE');
    setInvoiceSubtitle(target.invoiceSubtitle || 'ORIGINAL FOR RECIPIENT');
    setInvoiceShowLogo(target.invoiceShowLogo !== false);
    setInvoiceLogoUrl(target.invoiceLogoUrl || '');
    setInvoiceShowBankDetails(target.invoiceShowBankDetails !== false);
    setInvoiceShowUpiQr(target.invoiceShowUpiQr !== false);
    setInvoiceShowAuthorizedSignatory(target.invoiceShowAuthorizedSignatory !== false);
    setInvoiceSignatoryLabel(target.invoiceSignatoryLabel || 'Authorized Signatory');
    setInvoiceSignatureUrl(target.invoiceSignatureUrl || '');
    setInvoiceShowHsnSummary(target.invoiceShowHsnSummary !== false);
    setInvoiceShowTerms(target.invoiceShowTerms !== false);

    setBankName(target.bankName || '');
    setAccountNumber(target.accountNumber || '');
    setIfscCode(target.ifscCode || '');
    setUpiId(target.upiId || '');

    setDefaultTerms(
      target.defaultTerms ||
        '1. Goods once sold will not be accepted back.\n2. Interest @ 18% p.a. will be levied if payment not made within due date.\n3. Subject to local state jurisdiction.'
    );
    setDefaultNotes(target.defaultNotes || 'Thank you for your business!');
  };

  // Sync state only when company profile loads initially or if company identity changes.
  // This prevents periodic background polling in App.tsx from wiping out the user's selected template.
  useEffect(() => {
    if (!company) return;

    if (!hasInitializedRef.current || (company.id && company.id !== lastCompanyIdRef.current)) {
      hasInitializedRef.current = true;
      lastCompanyIdRef.current = company.id || null;
      isDirtyRef.current = false;
      populateFromCompany(company);
    }
  }, [company]);

  // Instantly apply & auto-save layout template selection so it persists immediately across refreshes
  const handleSelectTemplate = async (templateId: NonNullable<CompanyProfile['invoiceDesignTemplate']>) => {
    setInvoiceDesignTemplate(templateId);
    isDirtyRef.current = true;

    try {
      const stateObj = ALL_INDIAN_STATES.find((s) => s.code === stateCode);
      const payload: any = {
        businessName: businessName.trim() || company?.businessName || 'Business Name',
        tradeName: tradeName.trim() || company?.tradeName || businessName.trim(),
        gstin: gstin.trim().toUpperCase() || company?.gstin || '27AABCU9603R1ZM',
        stateCode: stateCode || company?.stateCode || '27',
        stateName: stateObj?.name || company?.stateName || 'Maharashtra',
        address: address.trim() || company?.address || '',
        phone: phone.trim() || company?.phone || '',
        email: email.trim() || company?.email || '',
        invoiceNumberingMode,
        invoicePrefix: invoicePrefix.trim(),
        invoiceSuffix: invoiceSuffix.trim(),
        nextInvoiceNumber: Math.max(1, Number(nextInvoiceNumber) || 1),
        invoicePadding: Math.max(1, Number(invoicePadding) || 3),
        preventDuplicateInvoiceNo,
        purchaseNumberingMode,
        purchasePrefix: purchasePrefix.trim(),
        nextPurchaseNumber: Math.max(1, Number(nextPurchaseNumber) || 1),
        receiptPrefix: receiptPrefix.trim(),
        nextReceiptNumber: Math.max(1, Number(nextReceiptNumber) || 1),
        paymentPrefix: paymentPrefix.trim(),
        nextPaymentNumber: Math.max(1, Number(nextPaymentNumber) || 1),
        invoiceDesignTemplate: templateId,
        invoiceColorTheme,
        invoiceHeaderTitle: invoiceHeaderTitle.trim() || 'TAX INVOICE',
        invoiceSubtitle: invoiceSubtitle.trim() || 'ORIGINAL FOR RECIPIENT',
        invoiceShowLogo,
        invoiceLogoUrl: invoiceLogoUrl.trim(),
        invoiceShowBankDetails,
        invoiceShowUpiQr,
        invoiceShowAuthorizedSignatory,
        invoiceSignatoryLabel: invoiceSignatoryLabel.trim() || 'Authorized Signatory',
        invoiceSignatureUrl: invoiceSignatureUrl.trim(),
        invoiceShowHsnSummary,
        invoiceShowTerms,
        bankName: bankName.trim() || company?.bankName || '',
        accountNumber: accountNumber.trim() || company?.accountNumber || '',
        ifscCode: ifscCode.trim().toUpperCase() || company?.ifscCode || '',
        upiId: upiId.trim() || company?.upiId || '',
        defaultTerms: defaultTerms.trim() || company?.defaultTerms || '',
        defaultNotes: defaultNotes.trim() || company?.defaultNotes || '',
        panNumber: panNumber.trim().toUpperCase() || company?.panNumber || '',
        compositeScheme: compositeScheme ?? company?.compositeScheme ?? false,
        msmeNumber: msmeNumber.trim() || company?.msmeNumber || '',
        cinNumber: cinNumber.trim().toUpperCase() || company?.cinNumber || '',
        website: website.trim() || company?.website || '',
        financialYear: financialYear.trim() || company?.financialYear || '2026-27',
      };

      await onSaveCompany(payload);
      setTemplateAutoSaved(`Layout template "${templateId}" active and saved!`);
      setTimeout(() => setTemplateAutoSaved(null), 3500);
    } catch (err) {
      console.warn('Auto-save template warning:', err);
    }
  };

  // Instantly apply & auto-save color theme selection
  const handleSelectColorTheme = async (themeKey: NonNullable<CompanyProfile['invoiceColorTheme']>) => {
    setInvoiceColorTheme(themeKey);
    isDirtyRef.current = true;

    try {
      const stateObj = ALL_INDIAN_STATES.find((s) => s.code === stateCode);
      const payload: any = {
        businessName: businessName.trim() || company?.businessName || 'Business Name',
        tradeName: tradeName.trim() || company?.tradeName || businessName.trim(),
        gstin: gstin.trim().toUpperCase() || company?.gstin || '27AABCU9603R1ZM',
        stateCode: stateCode || company?.stateCode || '27',
        stateName: stateObj?.name || company?.stateName || 'Maharashtra',
        address: address.trim() || company?.address || '',
        phone: phone.trim() || company?.phone || '',
        email: email.trim() || company?.email || '',
        invoiceNumberingMode,
        invoicePrefix: invoicePrefix.trim(),
        invoiceSuffix: invoiceSuffix.trim(),
        nextInvoiceNumber: Math.max(1, Number(nextInvoiceNumber) || 1),
        invoicePadding: Math.max(1, Number(invoicePadding) || 3),
        preventDuplicateInvoiceNo,
        purchaseNumberingMode,
        purchasePrefix: purchasePrefix.trim(),
        nextPurchaseNumber: Math.max(1, Number(nextPurchaseNumber) || 1),
        receiptPrefix: receiptPrefix.trim(),
        nextReceiptNumber: Math.max(1, Number(nextReceiptNumber) || 1),
        paymentPrefix: paymentPrefix.trim(),
        nextPaymentNumber: Math.max(1, Number(nextPaymentNumber) || 1),
        invoiceDesignTemplate,
        invoiceColorTheme: themeKey,
        invoiceHeaderTitle: invoiceHeaderTitle.trim() || 'TAX INVOICE',
        invoiceSubtitle: invoiceSubtitle.trim() || 'ORIGINAL FOR RECIPIENT',
        invoiceShowLogo,
        invoiceLogoUrl: invoiceLogoUrl.trim(),
        invoiceShowBankDetails,
        invoiceShowUpiQr,
        invoiceShowAuthorizedSignatory,
        invoiceSignatoryLabel: invoiceSignatoryLabel.trim() || 'Authorized Signatory',
        invoiceSignatureUrl: invoiceSignatureUrl.trim(),
        invoiceShowHsnSummary,
        invoiceShowTerms,
        bankName: bankName.trim() || company?.bankName || '',
        accountNumber: accountNumber.trim() || company?.accountNumber || '',
        ifscCode: ifscCode.trim().toUpperCase() || company?.ifscCode || '',
        upiId: upiId.trim() || company?.upiId || '',
        defaultTerms: defaultTerms.trim() || company?.defaultTerms || '',
        defaultNotes: defaultNotes.trim() || company?.defaultNotes || '',
        panNumber: panNumber.trim().toUpperCase() || company?.panNumber || '',
        compositeScheme: compositeScheme ?? company?.compositeScheme ?? false,
        msmeNumber: msmeNumber.trim() || company?.msmeNumber || '',
        cinNumber: cinNumber.trim().toUpperCase() || company?.cinNumber || '',
        website: website.trim() || company?.website || '',
        financialYear: financialYear.trim() || company?.financialYear || '2026-27',
      };

      await onSaveCompany(payload);
    } catch (err) {
      console.warn('Auto-save color theme warning:', err);
    }
  };

  // Derive state code and name
  const selectedStateObj = ALL_INDIAN_STATES.find((s) => s.code === stateCode);

  // Horizontal scroller navigation for tabs
  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      const scrollAmount = 240;
      tabsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Format sample invoice number
  const formatSampleNumber = (counter: number) => {
    const padded = String(Math.max(1, counter)).padStart(Math.max(1, invoicePadding), '0');
    return `${invoicePrefix || ''}${padded}${invoiceSuffix || ''}`;
  };

  const formatSamplePurchaseNumber = (counter: number) => {
    const padded = String(Math.max(1, counter)).padStart(3, '0');
    return `${purchasePrefix || ''}${padded}`;
  };

  const formatSampleReceiptNumber = (counter: number) => {
    const padded = String(Math.max(1, counter)).padStart(3, '0');
    return `${receiptPrefix || ''}${padded}`;
  };

  const formatSamplePaymentNumber = (counter: number) => {
    const padded = String(Math.max(1, counter)).padStart(3, '0');
    return `${paymentPrefix || ''}${padded}`;
  };

  // Handle GSTIN change with automatic State Code recognition
  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase().trim();
    setGstin(upper);

    if (upper.length >= 2) {
      const detectedCode = upper.slice(0, 2);
      const match = ALL_INDIAN_STATES.find((s) => s.code === detectedCode);
      if (match) {
        setStateCode(detectedCode);
      }
    }

    if (upper.length >= 12 && (!panNumber || panNumber === gstin.slice(2, 12))) {
      setPanNumber(upper.slice(2, 12));
    }
  };

  // Check duplicate sandbox in real time
  const handleTestDuplicateCheck = async () => {
    if (!testNumber.trim()) return;
    setTestingDuplicate(true);
    setTestResult(null);
    try {
      const data = await checkInvoiceNumberDuplicate(profile?.id || 1, testNumber.trim());
      setTestResult({
        checked: true,
        isDuplicate: data.isDuplicate,
        details: data.existing,
      });
    } catch (err) {
      console.error('Test duplicate error:', err);
    } finally {
      setTestingDuplicate(false);
    }
  };

  // Reset form to latest saved profile
  const handleReset = () => {
    if (company) {
      populateFromCompany(company);
      isDirtyRef.current = false;
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedBusinessName = businessName.trim();
    const trimmedGstin = gstin.trim().toUpperCase();
    const trimmedAddress = address.trim();

    if (!trimmedBusinessName) {
      setActiveTab('general');
      setErrorMessage('Legal Business Name is required.');
      return;
    }

    if (!trimmedGstin) {
      setActiveTab('general');
      setErrorMessage('GSTIN is required.');
      return;
    }

    if (!trimmedAddress) {
      setActiveTab('general');
      setErrorMessage('Principal Place of Business address is required.');
      return;
    }

    const stateObj = ALL_INDIAN_STATES.find((s) => s.code === stateCode);
    const resolvedStateName = stateObj?.name || company?.stateName || 'Maharashtra';

    try {
      await onSaveCompany({
        businessName: trimmedBusinessName,
        tradeName: tradeName.trim() || trimmedBusinessName,
        gstin: trimmedGstin,
        stateCode,
        stateName: resolvedStateName,
        address: trimmedAddress,
        phone: phone.trim(),
        email: email.trim(),

        // Invoice Series & Duplicity Settings
        invoiceNumberingMode,
        invoicePrefix: invoicePrefix.trim(),
        invoiceSuffix: invoiceSuffix.trim(),
        nextInvoiceNumber: Math.max(1, Number(nextInvoiceNumber) || 1),
        invoicePadding: Math.max(1, Number(invoicePadding) || 3),
        preventDuplicateInvoiceNo,

        purchaseNumberingMode,
        purchasePrefix: purchasePrefix.trim(),
        nextPurchaseNumber: Math.max(1, Number(nextPurchaseNumber) || 1),

        receiptPrefix: receiptPrefix.trim(),
        nextReceiptNumber: Math.max(1, Number(nextReceiptNumber) || 1),

        paymentPrefix: paymentPrefix.trim(),
        nextPaymentNumber: Math.max(1, Number(nextPaymentNumber) || 1),

        // Sale Invoice Design Preferences
        invoiceDesignTemplate,
        invoiceColorTheme,
        invoiceHeaderTitle: invoiceHeaderTitle.trim() || 'TAX INVOICE',
        invoiceSubtitle: invoiceSubtitle.trim() || 'ORIGINAL FOR RECIPIENT',
        invoiceShowLogo,
        invoiceLogoUrl: invoiceLogoUrl.trim(),
        invoiceShowBankDetails,
        invoiceShowUpiQr,
        invoiceShowAuthorizedSignatory,
        invoiceSignatoryLabel: invoiceSignatoryLabel.trim() || 'Authorized Signatory',
        invoiceSignatureUrl: invoiceSignatureUrl.trim(),
        invoiceShowHsnSummary,
        invoiceShowTerms,

        // Banking & Notes
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        upiId: upiId.trim(),
        defaultTerms: defaultTerms.trim(),
        defaultNotes: defaultNotes.trim(),

        // Additional Statutory & Profile details
        panNumber: panNumber.trim().toUpperCase(),
        compositeScheme,
        msmeNumber: msmeNumber.trim(),
        cinNumber: cinNumber.trim().toUpperCase(),
        website: website.trim(),
        financialYear: financialYear.trim(),
      });

      isDirtyRef.current = false;
      setSavedEntityName(trimmedBusinessName);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err: any) {
      console.error('Save company error:', err);
      setErrorMessage(err?.message || 'Failed to update company settings. Please try again.');
    }
  };

  // Tabs metadata for Chip Navigation
  const TABS_CONFIG: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    {
      id: 'general',
      label: 'Company Profile & Details',
      icon: Building2,
    },
    {
      id: 'whitelabel',
      label: 'White-Label & Branding',
      icon: Globe,
      badge: 'BRAND',
    },
    {
      id: 'numbering',
      label: 'Invoice Series & Serial No.',
      icon: Hash,
    },
    {
      id: 'design',
      label: 'Sale Invoice Design',
      icon: Palette,
      badge: 'NEW',
    },
    {
      id: 'banking',
      label: 'Bank & UPI Settlement',
      icon: CreditCard,
    },
    {
      id: 'terms',
      label: 'Terms & Invoice Footers',
      icon: FileText,
    },
    {
      id: 'migration',
      label: 'Tally XML Migration',
      icon: Database,
      badge: 'IMPORT',
    },
    {
      id: 'roles',
      label: 'Team & Security Roles',
      icon: Shield,
      badge: 'RBAC',
    },
    {
      id: 'subscription',
      label: 'Subscription & Plan',
      icon: Sparkles,
      badge: 'PRO',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Success Notification */}
      {savedSuccess && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-medium animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="font-semibold">{savedEntityName || 'Company'}</span> settings updated successfully!
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Unable to Save Changes</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* CHIP NAVIGATION SCROLLER */}
      <div className="relative flex items-center">
        {/* Left Scroll Button */}
        <button
          type="button"
          onClick={() => handleScrollTabs('left')}
          className="absolute -left-2.5 sm:-left-3 z-10 p-2 rounded-full bg-slate-900/95 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md backdrop-blur transition hidden sm:flex items-center justify-center cursor-pointer"
          title="Scroll Left"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable Chips Track */}
        <div
          ref={tabsScrollRef}
          className="w-full flex items-center gap-2 overflow-x-auto p-1.5 bg-slate-950/90 border border-slate-800 rounded-full no-scrollbar scroll-smooth snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TABS_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`snap-start flex-shrink-0 px-4 py-2 rounded-full transition flex items-center gap-2 text-xs font-semibold cursor-pointer select-none whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 border border-emerald-400'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-850 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isActive ? 'text-slate-950' : 'text-slate-400'
                  }`}
                />
                <span className="leading-none">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase leading-none ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950 border border-slate-950/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          type="button"
          onClick={() => handleScrollTabs('right')}
          className="absolute -right-2.5 sm:-right-3 z-10 p-2 rounded-full bg-slate-900/95 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md backdrop-blur transition hidden sm:flex items-center justify-center cursor-pointer"
          title="Scroll Right"
          aria-label="Scroll Right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {activeTab === 'whitelabel' ? (
        <div className="animate-fade-in">
          <TenantWhiteLabelSettings
            workspace={workspace}
            companyProfile={company}
          />
        </div>
      ) : activeTab === 'migration' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 animate-fade-in text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <span>Bulk Data Migration &amp; Tally XML Importer</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Seamlessly import your existing Chart of Accounts, Customers, Vendors, and Opening Balances into this workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMigrationModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Upload className="w-4 h-4" />
              <span>Launch Tally XML Import Wizard</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-semibold text-white">1. Master Groups Supported</span>
              <p className="text-slate-400">
                Sundry Debtors, Sundry Creditors, Bank Accounts, Sales, Purchases, and Capital ledgers.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-semibold text-white">2. Automatic GST Parsing</span>
              <p className="text-slate-400">
                Extracts 15-character GSTINs, state codes, and opening debit/credit balances automatically.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-semibold text-white">3. Direct Stock Units</span>
              <p className="text-slate-400">
                Preserves HSN codes, measuring units (PCS, KGS, MTR), and opening valuations.
              </p>
            </div>
          </div>
        </div>
      ) : activeTab === 'subscription' ? (
        <div className="animate-fade-in">
          <WorkspaceSubscriptionView
            workspace={workspace}
            onSelectPlan={() => {}}
          />
        </div>
      ) : activeTab !== 'roles' ? (
        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* TAB 1: Company Profile & Legal Registration */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-fade-in">
              {/* Entity Overview Banner */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400 shadow-inner">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {businessName || 'Business Name'}
                      </h3>
                      {tradeName && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          Trade: {tradeName}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                        {compositeScheme ? 'Composition Scheme' : 'Regular Taxpayer'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap font-mono">
                      <span>GSTIN: {gstin || 'Unregistered'}</span>
                      <span>•</span>
                      <span>PAN: {panNumber || (gstin.length >= 12 ? gstin.slice(2, 12) : 'N/A')}</span>
                      <span>•</span>
                      <span>State: {selectedStateObj ? `${selectedStateObj.code} - ${selectedStateObj.name}` : 'Maharashtra (27)'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Details</span>
                  </button>
                </div>
              </div>

              {/* Main Legal Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Legal Business Registration & Statutory Identity</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    These legal entity details will be printed on all Tax Invoices, Delivery Challans, and GSTR statutory filings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">
                      Legal Business Name <span className="text-rose-400">*</span> (As per GST Certificate)
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Apex Industrial Solutions Ltd"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Trade Name / Brand (Optional)</label>
                    <input
                      type="text"
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      placeholder="e.g. Apex Tech"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-medium text-slate-400">
                        15-Digit GSTIN <span className="text-rose-400">*</span>
                      </label>
                      {selectedStateObj && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          State Code: {selectedStateObj.code} ({selectedStateObj.name})
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      placeholder="08IRRPZ8566K1ZD or 27AAECB9382M1ZR"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      First 2 digits determine Place of Supply state jurisdiction. Digits 3-12 form your PAN.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-medium text-slate-400">
                        10-Character Permanent Account Number (PAN)
                      </label>
                      {gstin.length >= 12 && (
                        <button
                          type="button"
                          onClick={() => setPanNumber(gstin.slice(2, 12))}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-mono"
                        >
                          Auto-fill from GSTIN
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={10}
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase().trim())}
                      placeholder="AAECB9382M"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Printed on TDS / TCS certificates and corporate billing headers.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">
                      Registered State Jurisdiction (Place of Supply) <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {ALL_INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1">
                      Current Financial Year (FY)
                    </label>
                    <select
                      value={financialYear}
                      onChange={(e) => setFinancialYear(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="2024-25">FY 2024-25 (1 Apr 2024 - 31 Mar 2025)</option>
                      <option value="2025-26">FY 2025-26 (1 Apr 2025 - 31 Mar 2026)</option>
                      <option value="2026-27">FY 2026-27 (1 Apr 2026 - 31 Mar 2027) [Current]</option>
                      <option value="2027-28">FY 2027-28 (1 Apr 2027 - 31 Mar 2028)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Principal Place of Business (Full Address) <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Unit / Plot No, Road, Industrial Area, City, Pin Code"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Official Contact Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Official Billing Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="accounts@company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      Company Website
                    </label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">
                      MSME / Udyam Reg. No.
                    </label>
                    <input
                      type="text"
                      value={msmeNumber}
                      onChange={(e) => setMsmeNumber(e.target.value)}
                      placeholder="UDYAM-MH-01-0012345"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1">
                      Corporate Identity (CIN)
                    </label>
                    <input
                      type="text"
                      value={cinNumber}
                      onChange={(e) => setCinNumber(e.target.value.toUpperCase())}
                      placeholder="U72900MH2020PTC123456"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1">
                      GST Taxation Model
                    </label>
                    <div className="flex items-center gap-4 pt-2">
                      <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="scheme"
                          checked={!compositeScheme}
                          onChange={() => setCompositeScheme(false)}
                          className="text-emerald-500 focus:ring-emerald-500"
                        />
                        <span>Regular (ITC Active)</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="scheme"
                          checked={compositeScheme}
                          onChange={() => setCompositeScheme(true)}
                          className="text-emerald-500 focus:ring-emerald-500"
                        />
                        <span>Composition</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Invoice Series & Numbering + Duplicity Control */}
        {activeTab === 'numbering' && (
          <div className="space-y-6 animate-fade-in">
            {/* Sales Invoicing Series Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Hash className="w-4 h-4 text-emerald-400" />
                    <span>Tax Invoice Serial Numbering System</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    GST Rule 46 compliance requires consecutive, non-duplicate serial numbers for each Financial Year.
                  </p>
                </div>

                {/* Mode Segmented Chip Switch */}
                <div className="flex items-center p-1 bg-slate-950 rounded-full border border-slate-800 self-start sm:self-auto shadow-inner">
                  <button
                    type="button"
                    onClick={() => setInvoiceNumberingMode('automatic')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                      invoiceNumberingMode === 'automatic'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Automatic Series</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceNumberingMode('manual')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                      invoiceNumberingMode === 'manual'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Manual Entry</span>
                  </button>
                </div>
              </div>

              {invoiceNumberingMode === 'automatic' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-medium text-slate-400 mb-1">
                        Series Prefix <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={invoicePrefix}
                        onChange={(e) => setInvoicePrefix(e.target.value)}
                        placeholder="e.g. INV/2026-27/ or TME/"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Included at beginning of every invoice.
                      </span>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-400 mb-1">
                        Next Serial Counter <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={nextInvoiceNumber}
                        onChange={(e) => setNextInvoiceNumber(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="1"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Increments automatically with each issued invoice.
                      </span>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-400 mb-1">Number Padding (Digits)</label>
                      <select
                        value={invoicePadding}
                        onChange={(e) => setInvoicePadding(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={1}>1 Digit (e.g. 1, 2, 10)</option>
                        <option value={2}>2 Digits (e.g. 01, 02)</option>
                        <option value={3}>3 Digits (e.g. 001, 002)</option>
                        <option value={4}>4 Digits (e.g. 0001, 0002)</option>
                        <option value={5}>5 Digits (e.g. 00001, 00002)</option>
                      </select>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Controls leading zeros for formatting.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-slate-400 mb-1">Suffix (Optional)</label>
                      <input
                        type="text"
                        value={invoiceSuffix}
                        onChange={(e) => setInvoiceSuffix(e.target.value)}
                        placeholder="e.g. /GST or /MH"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Appended to end of serial (e.g. INV/2026-27/001/GST).
                      </span>
                    </div>

                    {/* Quick Prefix Chip Presets */}
                    <div>
                      <label className="block font-medium text-slate-400 mb-1">Quick Prefix Presets</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setInvoicePrefix('INV/2026-27/');
                            setInvoiceSuffix('');
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-750 text-[11px] font-mono text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition cursor-pointer"
                        >
                          INV/2026-27/
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInvoicePrefix('INV-');
                            setInvoiceSuffix('');
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-750 text-[11px] font-mono text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition cursor-pointer"
                        >
                          INV-
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cleanBrand = (tradeName || businessName || 'BILL')
                              .replace(/[^a-zA-Z0-9]/g, '')
                              .slice(0, 4)
                              .toUpperCase();
                            setInvoicePrefix(`${cleanBrand}/26-27/`);
                            setInvoiceSuffix('');
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-750 text-[11px] font-mono text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition cursor-pointer"
                        >
                          {tradeName ? tradeName.slice(0, 4).toUpperCase() : 'CO'}/26-27/
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Sequence Preview Card */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-2">
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Live Preview of Next 3 Generated Invoices:
                    </span>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 font-mono font-bold text-emerald-300 text-xs shadow-sm">
                        {formatSampleNumber(nextInvoiceNumber)}
                        <span className="ml-2 text-[10px] text-emerald-400/70 font-normal">(Next Invoice)</span>
                      </span>
                      <span className="text-slate-600">→</span>
                      <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-slate-300 text-xs">
                        {formatSampleNumber(nextInvoiceNumber + 1)}
                      </span>
                      <span className="text-slate-600">→</span>
                      <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-slate-300 text-xs">
                        {formatSampleNumber(nextInvoiceNumber + 2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/20 text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Manual Invoice Numbering Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    You will be prompted to manually specify the Invoice Number for each new voucher created. Duplicate
                    number prevention will still apply to safeguard against accidental re-use.
                  </p>
                </div>
              )}
            </div>

            {/* DUPLICITY CONTROL & GST AUDIT RULES */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>Invoice Number Duplicity Prevention</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Protect your business from GST portal rejection due to duplicate invoice numbers.
                </p>
              </div>

              {/* Strict Prevention Toggle */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span>Block Duplicate Invoice Numbers Strictly</span>
                    {preventDuplicateInvoiceNo && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                        Active & Enforced
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                    When enabled, the system verifies your existing vouchers in Cloud Firestore. If an invoice or bill with the
                    exact same number already exists, saving is blocked with a clear warning and collision details.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={preventDuplicateInvoiceNo}
                    onChange={(e) => setPreventDuplicateInvoiceNo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Duplicate Number Checker Sandbox */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    Verify Invoice Number Availability
                  </span>
                  <span className="text-[10px] text-slate-500">Check any serial number in your database</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testNumber}
                    onChange={(e) => {
                      setTestNumber(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="e.g. INV-001 or INV/2026-27/001"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleTestDuplicateCheck}
                    disabled={testingDuplicate || !testNumber.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 font-semibold rounded-full border border-slate-700 transition flex items-center gap-1.5 cursor-pointer text-xs flex-shrink-0"
                  >
                    {testingDuplicate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Check Availability</span>
                  </button>
                </div>

                {testResult && testResult.checked && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                      testResult.isDuplicate
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {testResult.isDuplicate ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-rose-200">
                            Duplicate Found: &quot;{testNumber}&quot; is already in use!
                          </p>
                          {testResult.details && (
                            <p className="text-[11px] text-rose-300/80 mt-0.5">
                              Issued to <strong>{testResult.details.partyName}</strong> on{' '}
                              <strong>{testResult.details.invoiceDate}</strong> (Grand Total: ₹
                              {testResult.details.grandTotal})
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-emerald-200">
                            Available: &quot;{testNumber}&quot; has not been used.
                          </p>
                          <p className="text-[11px] text-emerald-300/80 mt-0.5">
                            You can safely assign this serial number to your next voucher.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Vouchers Series Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>Purchase Bill Series Configuration</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Prefix and counter for inward purchase records & supplier inward bills.
                  </p>
                </div>

                <div className="flex items-center p-1 bg-slate-950 rounded-full border border-slate-800 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setPurchaseNumberingMode('automatic')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      purchaseNumberingMode === 'automatic'
                        ? 'bg-teal-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Automatic
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchaseNumberingMode('manual')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      purchaseNumberingMode === 'manual'
                        ? 'bg-teal-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {purchaseNumberingMode === 'automatic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Purchase Bill Prefix</label>
                    <input
                      type="text"
                      value={purchasePrefix}
                      onChange={(e) => setPurchasePrefix(e.target.value)}
                      placeholder="PUR/2026-27/"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Next Purchase Serial No.</label>
                    <input
                      type="number"
                      min={1}
                      value={nextPurchaseNumber}
                      onChange={(e) => setNextPurchaseNumber(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Preview: {formatSamplePurchaseNumber(nextPurchaseNumber)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Vouchers Series Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Receipt Voucher Series Configuration</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Prefix and counter for payment receipts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Receipt Voucher Prefix</label>
                  <input
                    type="text"
                    value={receiptPrefix}
                    onChange={(e) => setReceiptPrefix(e.target.value)}
                    placeholder="RCT/2026-27/"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Next Receipt Serial No.</label>
                  <input
                    type="number"
                    min={1}
                    value={nextReceiptNumber}
                    onChange={(e) => setNextReceiptNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Preview: {formatSampleReceiptNumber(nextReceiptNumber)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Vouchers Series Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>Payment Voucher Series Configuration</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Prefix and counter for outgoing payment records.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Payment Voucher Prefix</label>
                  <input
                    type="text"
                    value={paymentPrefix}
                    onChange={(e) => setPaymentPrefix(e.target.value)}
                    placeholder="PAY/2026-27/"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Next Payment Serial No.</label>
                  <input
                    type="number"
                    min={1}
                    value={nextPaymentNumber}
                    onChange={(e) => setNextPaymentNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Preview: {formatSamplePaymentNumber(nextPaymentNumber)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Sale Invoice Design & Styling */}
        {activeTab === 'design' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Description */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <span>Sale Invoice Design & Layout Customization</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Customize your invoice styling, brand colors, header taxonomy, and statutory sections. Live updates preview instantly below.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">Sample Supply:</span>
                  <div className="inline-flex bg-slate-950 p-1 rounded-full border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewSupplyType('intra')}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                        previewSupplyType === 'intra'
                          ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Intra-State (CGST+SGST)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewSupplyType('inter')}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                        previewSupplyType === 'inter'
                          ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Interstate (IGST)
                    </button>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Controls (Left) & Live Preview (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
                {/* Controls Column */}
                <div className="lg:col-span-5 space-y-5">
                  {/* 1. Template Layout Archetype */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <LayoutTemplate className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Invoice Layout Template</span>
                      </label>
                      {templateAutoSaved && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono font-medium animate-pulse">
                          <CheckCircle className="w-3 h-3" />
                          <span>Saved</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          id: 'modern',
                          name: 'Modern Pro',
                          desc: 'Color accent strip, rounded badges & clear hierarchy',
                          badge: 'Popular',
                        },
                        {
                          id: 'classic',
                          name: 'Classic GST',
                          desc: 'Formal Rule 46 boxed grid with solid borders',
                          badge: 'Tax Audit',
                        },
                        {
                          id: 'corporate',
                          name: 'Corporate',
                          desc: 'Bold brand banner, executive cards & dual signatory',
                          badge: 'Executive',
                        },
                        {
                          id: 'stylish',
                          name: 'Sidebar Prestige',
                          desc: 'Dark sidebar, bank cards & modern fintech look',
                          badge: 'Modern',
                        },
                        {
                          id: 'compact',
                          name: 'Compact Ledger',
                          desc: 'Dense Tally/ERP table format for 1-page printing',
                          badge: 'Condensed',
                        },
                        {
                          id: 'thermal',
                          name: 'POS Retail Slip',
                          desc: '80mm cash counter receipt with barcode & item count',
                          badge: 'Retail POS',
                        },
                        {
                          id: 'industrial',
                          name: 'Heavy Industry',
                          desc: 'Double-line matrix with transport, LR & E-Way strip',
                          badge: 'Industrial',
                        },
                        {
                          id: 'export',
                          name: 'Export / LUT',
                          desc: 'Statutory format with LUT ARN, port & customs details',
                          badge: 'Global Trade',
                        },
                        {
                          id: 'minimal',
                          name: 'Minimalist',
                          desc: 'Refined hairline borders & high-contrast typography',
                          badge: 'Clean',
                        },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTemplate(t.id as any)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                            invoiceDesignTemplate === t.id
                              ? 'bg-emerald-500/10 border-emerald-500 text-white ring-1 ring-emerald-500/30'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-950 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-xs font-bold text-slate-200">{t.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                invoiceDesignTemplate === t.id
                                  ? 'bg-emerald-400 text-slate-950 font-bold'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {invoiceDesignTemplate === t.id ? 'Active' : t.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                            {t.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Color Accent Palette */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Brand Accent Color Theme</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(COLOR_THEMES).map(([key, theme]) => {
                        const isSelected = invoiceColorTheme === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleSelectColorTheme(key as any)}
                            className={`p-2 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                              isSelected
                                ? 'bg-slate-800 border-slate-600 ring-2 ' + theme.ringColor
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: theme.hex }}
                            />
                            <span className="text-[11px] font-medium text-slate-200 truncate">
                              {theme.name.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Header Title & Copy Designation */}
                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Main Document Title
                      </label>
                      <input
                        type="text"
                        value={invoiceHeaderTitle}
                        onChange={(e) => setInvoiceHeaderTitle(e.target.value)}
                        placeholder="TAX INVOICE"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {['TAX INVOICE', 'TAX INVOICE CUM BILL OF SUPPLY', 'RETAIL INVOICE', 'COMMERCIAL INVOICE'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setInvoiceHeaderTitle(preset)}
                            className={`text-[9px] px-2 py-0.5 rounded-full transition cursor-pointer ${
                              invoiceHeaderTitle === preset
                                ? 'bg-emerald-400 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Document Subtitle / Copy Note
                      </label>
                      <input
                        type="text"
                        value={invoiceSubtitle}
                        onChange={(e) => setInvoiceSubtitle(e.target.value)}
                        placeholder="ORIGINAL FOR RECIPIENT"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {['ORIGINAL FOR RECIPIENT', 'DUPLICATE FOR TRANSPORTER', 'TRIPLICATE FOR SUPPLIER'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setInvoiceSubtitle(preset)}
                            className={`text-[9px] px-2 py-0.5 rounded-full transition cursor-pointer ${
                              invoiceSubtitle === preset
                                ? 'bg-emerald-400 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Company Logo Settings */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-200">Show Company Logo</span>
                        <p className="text-[10px] text-slate-400">Display logo in invoice header</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoiceShowLogo(!invoiceShowLogo)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                          invoiceShowLogo ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            invoiceShowLogo ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {invoiceShowLogo && (
                      <div className="pt-2 border-t border-slate-800">
                        <LocalImageUploader
                          id="company-logo-upload"
                          label="Invoice Company Logo"
                          description="Upload your official company or brand logo for invoice headers"
                          value={invoiceLogoUrl}
                          onChange={(val) => {
                            setInvoiceLogoUrl(val);
                            isDirtyRef.current = true;
                          }}
                          recommendedDimensions="Recommended: 400x160px or square, PNG/JPG/SVG"
                          type="logo"
                        />
                      </div>
                    )}
                  </div>

                  {/* 5. Statutory & Content Sections Toggles */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <span className="text-xs font-semibold text-slate-200 block">
                      Section Visibility Toggles
                    </span>

                    {/* Bank Details Toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <div>
                        <span className="text-[11px] font-medium text-slate-300">Bank Settlement Details</span>
                        <p className="text-[10px] text-slate-500">Show A/C number, IFSC, and Bank name</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoiceShowBankDetails(!invoiceShowBankDetails)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                          invoiceShowBankDetails ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            invoiceShowBankDetails ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* UPI QR Toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <div>
                        <span className="text-[11px] font-medium text-slate-300">Instant UPI Payment QR Code</span>
                        <p className="text-[10px] text-slate-500">Scan & pay with GPay, PhonePe, Paytm</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoiceShowUpiQr(!invoiceShowUpiQr)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                          invoiceShowUpiQr ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            invoiceShowUpiQr ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* HSN Summary Toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <div>
                        <span className="text-[11px] font-medium text-slate-300">HSN/SAC Statutory Breakup Table</span>
                        <p className="text-[10px] text-slate-500">Detailed tax matrix by HSN code</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoiceShowHsnSummary(!invoiceShowHsnSummary)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                          invoiceShowHsnSummary ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            invoiceShowHsnSummary ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Signatory Toggle */}
                    <div className="pt-1 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-medium text-slate-300">Authorized Signatory Box</span>
                          <p className="text-[10px] text-slate-500">Signature area in footer</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInvoiceShowAuthorizedSignatory(!invoiceShowAuthorizedSignatory)}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                            invoiceShowAuthorizedSignatory ? 'bg-emerald-500' : 'bg-slate-800'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              invoiceShowAuthorizedSignatory ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      {invoiceShowAuthorizedSignatory && (
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Signatory Title / Designation
                            </label>
                            <input
                              type="text"
                              value={invoiceSignatoryLabel}
                              onChange={(e) => {
                                setInvoiceSignatoryLabel(e.target.value);
                                isDirtyRef.current = true;
                              }}
                              placeholder="Authorized Signatory"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="pt-2 border-t border-slate-800">
                            <LocalImageUploader
                              id="signatory-signature-upload"
                              label="Authorised Signatory Signature"
                              description="Upload authorized signatory digital signature (transparent PNG recommended)"
                              value={invoiceSignatureUrl}
                              onChange={(val) => {
                                setInvoiceSignatureUrl(val);
                                isDirtyRef.current = true;
                              }}
                              recommendedDimensions="Recommended: 300x120px with transparent background"
                              type="signature"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Terms & Notes Toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <div>
                        <span className="text-[11px] font-medium text-slate-300">Terms & Conditions Section</span>
                        <p className="text-[10px] text-slate-500">Jurisdiction & interest clauses</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInvoiceShowTerms(!invoiceShowTerms)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                          invoiceShowTerms ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            invoiceShowTerms ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Preview Column */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Live Invoice Paper Preview</span>
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                      Scale: 100% (A4 Ratio)
                    </span>
                  </div>

                  {/* Render Live Sample Invoice */}
                  <div className="rounded-2xl border border-slate-700 bg-slate-950 p-2 sm:p-4 overflow-x-auto shadow-2xl">
                    <div className="min-w-[550px] shadow-lg rounded-xl overflow-hidden">
                      <InvoiceTemplateRenderer
                        company={company}
                        designOverrides={{
                          businessName,
                          tradeName,
                          gstin,
                          stateCode,
                          stateName: selectedStateObj?.name || 'Maharashtra',
                          address,
                          phone,
                          email,
                          bankName,
                          accountNumber,
                          ifscCode,
                          upiId,
                          defaultTerms,
                          defaultNotes,
                          invoiceDesignTemplate,
                          invoiceColorTheme,
                          invoiceHeaderTitle,
                          invoiceSubtitle,
                          invoiceShowLogo,
                          invoiceLogoUrl,
                          invoiceShowBankDetails,
                          invoiceShowUpiQr,
                          invoiceShowAuthorizedSignatory,
                          invoiceSignatoryLabel,
                          invoiceSignatureUrl,
                          invoiceShowHsnSummary,
                          invoiceShowTerms,
                        }}
                        invoice={{
                          id: 9999,
                          userId: 1,
                          partyId: 1,
                          invoiceNumber: formatSampleNumber(nextInvoiceNumber || 1),
                          invoiceDate: new Date().toISOString().split('T')[0],
                          dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
                          voucherType: 'sales',
                          saleType: 'b2b',
                          partyName: 'Reliance Retail & Telecom Infra Ltd',
                          partyGstin: previewSupplyType === 'intra' ? `${stateCode}AAACR1234F1Z1` : '07AAACT9876E1Z5',
                          placeOfSupply: previewSupplyType === 'intra' ? stateCode : '07',
                          isInterstate: previewSupplyType === 'inter',
                          subtotal: '28600.00',
                          taxTotal: '5148.00',
                          cgstTotal: previewSupplyType === 'intra' ? '2574.00' : '0.00',
                          sgstTotal: previewSupplyType === 'intra' ? '2574.00' : '0.00',
                          igstTotal: previewSupplyType === 'inter' ? '5148.00' : '0.00',
                          grandTotal: '33748.00',
                          paidAmount: '33748.00',
                          paymentStatus: 'paid',
                          paymentMode: 'bank_transfer',
                          notes: defaultNotes,
                          items: [
                            {
                              id: 1,
                              itemName: 'Enterprise Cloud ERP & GST Software Subscription',
                              hsnCode: '998314',
                              quantity: '1',
                              unit: 'YR',
                              rate: '25000.00',
                              taxableValue: '25000.00',
                              gstRate: '18',
                              cgstRate: previewSupplyType === 'intra' ? '9' : '0',
                              sgstRate: previewSupplyType === 'intra' ? '9' : '0',
                              igstRate: previewSupplyType === 'inter' ? '18' : '0',
                              cgstAmount: previewSupplyType === 'intra' ? '2250.00' : '0.00',
                              sgstAmount: previewSupplyType === 'intra' ? '2250.00' : '0.00',
                              igstAmount: previewSupplyType === 'inter' ? '4500.00' : '0.00',
                              total: '29500.00',
                            },
                            {
                              id: 2,
                              itemName: 'FIDO2 Hardware Security Token & Crypto Key',
                              hsnCode: '8471',
                              quantity: '2',
                              unit: 'NOS',
                              rate: '1800.00',
                              taxableValue: '3600.00',
                              gstRate: '18',
                              cgstRate: previewSupplyType === 'intra' ? '9' : '0',
                              sgstRate: previewSupplyType === 'intra' ? '9' : '0',
                              igstRate: previewSupplyType === 'inter' ? '18' : '0',
                              cgstAmount: previewSupplyType === 'intra' ? '324.00' : '0.00',
                              sgstAmount: previewSupplyType === 'intra' ? '324.00' : '0.00',
                              igstAmount: previewSupplyType === 'inter' ? '648.00' : '0.00',
                              total: '4248.00',
                            },
                          ],
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Banking & UPI Settlement */}
        {activeTab === 'banking' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 animate-fade-in">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Bank Settlement & Instant UPI Payment</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                These banking coordinates will appear at the bottom of all generated invoices and payment receipts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="State Bank of India / HDFC Bank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Current / CC Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="50200000000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-400 mb-1">IFSC Code (11-character)</label>
                <input
                  type="text"
                  maxLength={11}
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="SBIN0001234 or HDFC0000123"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Merchant UPI VPA ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="company@bank or merchant@upi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {upiId && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>UPI Payment QR will be automatically rendered on all customer invoices with VPA:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{upiId}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Terms & Conditions & Invoice Footers */}
        {activeTab === 'terms' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 animate-fade-in">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Invoice Terms, Conditions & Footers</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Standard terms, interest clauses, and greetings automatically populated on every new invoice.
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">Default Terms & Conditions</label>
              <textarea
                rows={4}
                value={defaultTerms}
                onChange={(e) => setDefaultTerms(e.target.value)}
                placeholder="1. Goods once sold will not be taken back.&#10;2. Interest @ 18% p.a. charged if payment delayed.&#10;3. Subject to local state jurisdiction."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
              ></textarea>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Printed in the Terms & Conditions section of all invoices.
              </span>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">Default Customer Footnote / Greeting</label>
              <input
                type="text"
                value={defaultNotes}
                onChange={(e) => setDefaultNotes(e.target.value)}
                placeholder="Thank you for your business!"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Bottom Action Buttons Bar */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Current Tab</span>
            </button>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Changes apply across all tabs simultaneously
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !canEditCompany}
            title={canEditCompany ? 'Save All Settings' : 'Your role does not have permission to modify company profile settings'}
            className={`w-full sm:w-auto px-7 py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition ${
              canEditCompany
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : canEditCompany ? (
              <Save className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4 text-slate-500" />
            )}
            <span>{loading ? 'Saving to Cloud Firestore...' : canEditCompany ? 'Save All Settings' : 'Settings Locked (Read-Only)'}</span>
          </button>
        </div>
      </form>
      ) : (
        <div className="space-y-6 text-xs animate-fade-in">
          {/* Role-Based Access Control (RBAC) Architecture Overview */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Role-Based Access Control (RBAC) &amp; Security Profiles
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fine-grained corporate security privileges. Administrators can assign and switch roles without insecure PIN codes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${ROLE_CONFIG[currentUserRole]?.bgBadge} ${ROLE_CONFIG[currentUserRole]?.textBadge} ${ROLE_CONFIG[currentUserRole]?.borderBadge}`}>
                  Active: {ROLE_CONFIG[currentUserRole]?.title}
                </span>
                {userSaveSuccess && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" /> Role Updated!
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {(['admin', 'accountant', 'billing_operator', 'auditor'] as UserRole[]).map((roleKey) => {
                const conf = ROLE_CONFIG[roleKey];
                const isCurrent = currentUserRole === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleQuickSwitchRole(roleKey)}
                    className={`p-3.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold ${conf.textBadge}`}>
                          {conf.title}
                        </span>
                        {isCurrent ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Switch Role
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {conf.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{conf.allowedTabs.length} Tabs Allowed</span>
                      <span className={`font-semibold flex items-center gap-1 ${isCurrent ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isCurrent ? 'Current Session' : 'Click to Activate'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team Members List (With Admin Role Assignment) */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Workspace Team Members ({teamMembers.length})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {canManageRoles
                    ? 'As an Administrator, you can assign roles and manage access privileges.'
                    : 'View collaborators registered on this workspace (Role assignment is Admin-only).'}
                </p>
              </div>

              {canManageRoles && (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/20 self-start sm:self-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Team Member</span>
                </button>
              )}
            </div>

            {loadingTeam ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Loading team members...</span>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No other team members found. Click "Invite Team Member" to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-2.5">User</th>
                      <th className="pb-2.5">Email</th>
                      <th className="pb-2.5">Current Role</th>
                      <th className="pb-2.5">Role Change</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {teamMembers.map((member) => {
                      const mRole = (member.role as UserRole) || 'accountant';
                      const mConfig = ROLE_CONFIG[mRole] || ROLE_CONFIG.accountant;
                      const isSelf = member.id === profile?.id;
                      return (
                        <tr key={member.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 font-medium text-slate-200 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-emerald-400 shrink-0">
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                member.displayName?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || 'U'
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{member.displayName || 'User'}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">ID #{member.id}</div>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-slate-400 text-[11px]">{member.email}</td>
                          <td className="py-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${mConfig.bgBadge} ${mConfig.textBadge} ${mConfig.borderBadge}`}>
                              {mConfig.title}
                            </span>
                          </td>
                          <td className="py-3">
                            {canManageRoles ? (
                              <select
                                value={mRole}
                                disabled={updatingMemberId === member.id}
                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as UserRole)}
                                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                              >
                                <option value="admin">Admin</option>
                                <option value="accountant">Senior Accountant</option>
                                <option value="billing_operator">Billing Operator</option>
                                <option value="auditor">Statutory Auditor</option>
                              </select>
                            ) : (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Admin Managed
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canEditUsers ? (
                                <button
                                  type="button"
                                  onClick={() => openEditMemberModal(member)}
                                  title="Edit User Profile & Role"
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition cursor-pointer border border-slate-700/60"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-blue-400" />
                                </button>
                              ) : null}

                              {canDeleteUsers ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isSelf) {
                                      setDeletingMember(member);
                                      setDeleteMemberError(null);
                                    }
                                  }}
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot delete your own active session' : `Delete ${member.displayName || member.email}`}
                                  className={`p-1.5 rounded-lg transition border ${
                                    isSelf
                                      ? 'bg-slate-900 text-slate-600 border-slate-800/80 cursor-not-allowed'
                                      : 'bg-rose-950/30 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border-rose-900/40 cursor-pointer'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : null}

                              {!canEditUsers && !canDeleteUsers && (
                                <span className="text-[10px] text-slate-500 font-mono">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

            {/* User Profile Form */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    Personal Profile & Avatar
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Update your profile photo and display name visible across company audit trails and document remarks.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">User Display Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={userDisplayName}
                      onChange={(e) => setUserDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Assigned Security Role</label>
                  <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2.5 text-slate-300 text-xs flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      {ROLE_CONFIG[currentUserRole]?.title || currentUserRole}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${ROLE_CONFIG[currentUserRole]?.bgBadge} ${ROLE_CONFIG[currentUserRole]?.textBadge} ${ROLE_CONFIG[currentUserRole]?.borderBadge}`}>
                      {ROLE_CONFIG[currentUserRole]?.badge}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                  <LocalImageUploader
                    id="personal-profile-avatar"
                    label="Personal Profile Picture"
                    description="Upload a photo from your device or paste an image URL for your profile"
                    value={userAvatarUrl}
                    onChange={setUserAvatarUrl}
                    type="avatar"
                    fallbackName={userDisplayName}
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveUserProfile}
                    disabled={savingUser}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingUser ? 'Updating Profile...' : 'Save Profile & Photo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Data Backup & Restore Center */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Data Backup & Restore (JSON)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Download a complete JSON backup of all company profiles, parties, inventory, invoices, and vouchers, or restore from a previous backup.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={backupLoading}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Data Backup</span>
                </button>

                <input
                  type="file"
                  ref={restoreFileRef}
                  accept=".json"
                  onChange={handleRestoreFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (canRestore) {
                      restoreFileRef.current?.click();
                    }
                  }}
                  disabled={backupLoading || !canRestore}
                  title={canRestore ? 'Restore from JSON backup' : 'Administrator role required to restore backups'}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md ${
                    canRestore
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/20'
                      : 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  {canRestore ? <Upload className="w-4 h-4" /> : <Lock className="w-4 h-4 text-slate-500" />}
                  <span>{canRestore ? 'Restore from Backup' : 'Restore (Admin Only)'}</span>
                </button>
              </div>
            </div>

            {/* Danger Zone: Clear All Master Ledgers */}
            {onClearMasterLedger && (
              <div className={`p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border ${
                canClearLedger
                  ? 'bg-rose-950/20 border-rose-900/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}>
                <div>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${
                    canClearLedger ? 'text-rose-300' : 'text-slate-300'
                  }`}>
                    {canClearLedger ? (
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-400" />
                    )}
                    Data Management / Clear All Master Ledgers
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {canClearLedger
                      ? 'Permanently clear all parties, inventory items, sales invoices, purchase bills, expenses, and journal entries.'
                      : `Restricted Operation: Only Administrators can purge company master ledgers. Your active role is ${ROLE_CONFIG[currentUserRole]?.title}.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={canClearLedger ? onClearMasterLedger : undefined}
                  disabled={loading || !canClearLedger}
                  title={canClearLedger ? 'Clear All Master Ledgers' : 'Only Administrator role can purge ledgers'}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md shrink-0 ${
                    canClearLedger
                      ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-rose-600/30'
                      : 'bg-slate-800/60 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                  }`}
                >
                  {canClearLedger ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>{canClearLedger ? 'Clear All Master Ledgers' : 'Locked (Admin Only)'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 7: Subscription & Billing */}
        {activeTab === 'subscription' && (
          <WorkspaceSubscriptionView />
        )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Add Team Member
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. priya@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4 text-emerald-400" />
                  </span>
                  <input
                    type={showInvitePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Set member password (min 6 characters)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowInvitePassword(!showInvitePassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showInvitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">New team member will use this password and email to sign in.</p>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setInviteRole(newRole);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="admin">Administrator (Full Control)</option>
                  <option value="accountant">Senior Accountant (Books & Ledgers)</option>
                  <option value="billing_operator">Billing Operator (Invoices & Receipts)</option>
                  <option value="auditor">Statutory Auditor (Read-Only Books)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <LocalImageUploader
                  id="invite-member-avatar"
                  label="Profile Photo / Avatar (Optional)"
                  description="Upload member photo from device or generate initials"
                  value={inviteAvatar}
                  onChange={setInviteAvatar}
                  type="avatar"
                  fallbackName={inviteName}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{inviting ? 'Adding...' : 'Add Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Profile Modal (Admin Only) */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit User Profile & Role</h3>
                  <p className="text-[11px] text-slate-400">Modify credentials and RBAC permission assignment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editMemberError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editMemberError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditMember} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Full Display Name *</label>
                <input
                  type="text"
                  required
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editMemberEmail}
                  onChange={(e) => setEditMemberEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Security Role</label>
                <select
                  value={editMemberRole}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setEditMemberRole(newRole);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="admin">Administrator (Full Master Control & User Management)</option>
                  <option value="accountant">Senior Accountant (Financial Vouchers & GST Reports)</option>
                  <option value="billing_operator">Billing Operator (Invoices, POS & Receipts Only)</option>
                  <option value="auditor">Statutory Auditor (Read-Only Books & Audit Logs)</option>
                </select>
                <div className="mt-1.5 p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{ROLE_CONFIG[editMemberRole]?.description}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Update Login Password (Optional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4 text-blue-400" />
                  </span>
                  <input
                    type={showEditMemberPassword ? 'text' : 'password'}
                    minLength={6}
                    value={editMemberPassword}
                    onChange={(e) => setEditMemberPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditMemberPassword(!showEditMemberPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showEditMemberPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Set a new password (min 6 characters) to update user login access.</p>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <LocalImageUploader
                  id="edit-member-avatar"
                  label="Profile Photo / Avatar"
                  description="Upload a photo from local device or paste an image link"
                  value={editMemberAvatar}
                  onChange={setEditMemberAvatar}
                  type="avatar"
                  fallbackName={editMemberName}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditMember}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition disabled:opacity-50"
                >
                  {savingEditMember ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{savingEditMember ? 'Saving Changes...' : 'Save Profile & Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Profile Modal (Admin Only) */}
      {deletingMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-rose-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Delete User Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteMemberError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{deleteMemberError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 rounded-xl flex items-start gap-2.5 text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-rose-300">Permanent Action Warning</div>
                  <div className="text-[11px] text-rose-200/80 mt-0.5 leading-relaxed">
                    Are you sure you want to delete this profile? The user will immediately lose all access to this company workspace.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">User:</span>
                  <span className="font-semibold text-white">{deletingMember.displayName || 'Unnamed User'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-slate-300">{deletingMember.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-semibold text-emerald-400">
                    {ROLE_CONFIG[deletingMember.role as UserRole]?.title || deletingMember.role}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Historical vouchers and transactions created by this user will be safely retained and reassigned to the workspace administrator.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                disabled={deletingMemberLoading}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={deletingMemberLoading}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer transition disabled:opacity-50"
              >
                {deletingMemberLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{deletingMemberLoading ? 'Deleting User...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Data Migration & Tally XML Modal */}
      <BulkDataMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        workspace={workspace}
      />
    </div>
  );
};
