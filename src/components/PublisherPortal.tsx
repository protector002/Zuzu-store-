import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Sparkles,
  Layers,
  Trash2,
  ExternalLink,
  Smartphone,
  AlertCircle,
  Plus,
  RefreshCw,
  FolderArchive,
  Download,
  Lock,
  ShieldCheck,
  KeyRound,
  Link2,
  Image as ImageIcon,
  Globe,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Eye,
  X,
  Tv,
  Clock,
  Check,
  XCircle,
  User,
  ShieldAlert,
  Crown,
  Ban,
  Snowflake,
  Megaphone,
  Search,
  Sliders,
  Edit3,
  Radio,
  EyeOff,
  UserCheck,
  UserX,
  ArrowUp,
  ArrowDown,
  Wallet,
  DollarSign,
  ArrowDownToLine,
  Receipt,
  CreditCard,
  Percent,
  ArrowLeftRight,
  History
} from 'lucide-react';
import {
  StoreApp,
  Platform,
  AppCategory,
  AdminUser,
  DeveloperAccountAdminView,
  AdminBroadcast,
  DeveloperStatus,
  AdminFinancialSummary,
  AppSaleTransaction,
  WithdrawalRequest,
  AppPricingType
} from '../types';
import { saveApkBlob } from '../utils/fileStorage';
import {
  verifyDirectUrl,
  approveAppSubmission,
  rejectAppSubmission,
  fetchPendingSubmissions,
  fetchAdminDevelopers,
  updateDeveloperStatus,
  deleteDeveloperAccount,
  fetchDeveloperAppsAdmin,
  takedownApp,
  restoreApp,
  overrideAppMetadata,
  fetchBroadcast,
  saveAdminBroadcast,
  adminReorderApps,
  fetchAdminFinancials,
  approveWithdrawalAdmin,
  rejectWithdrawalAdmin,
  disburseWithdrawalLivePay,
  pingLivePay,
  updateAdminCommission,
  transferAppOwnership
} from '../services/api';
import { isTvApp, isPhoneApp, filterPhoneApps, filterTvApps } from '../utils/editionHelper';

interface PublisherPortalProps {
  apps: StoreApp[];
  admin: AdminUser | null;
  onOpenLoginModal: () => void;
  onUploadApp: (payload: FormData | Record<string, any>) => Promise<StoreApp>;
  onUpdateApp?: (appId: string, updates: Partial<StoreApp>) => Promise<StoreApp>;
  onAddRelease: (appId: string, payload: FormData | Record<string, any>) => Promise<StoreApp>;
  onDeleteRelease?: (appId: string, releaseId: string) => Promise<StoreApp>;
  onDeleteApp: (appId: string) => Promise<void>;
  onResetCatalog: () => Promise<void>;
  onViewAppInStore: (app: StoreApp) => void;
  onDownloadTest: (appId: string, releaseId?: string, appObj?: StoreApp) => Promise<void>;
  onAppApproved?: (app: StoreApp) => void;
  onRefreshCatalog?: () => void;
  requestedTab?: 'upload-new' | 'update-existing' | 'manage' | 'submissions' | 'god-mode';
  requestedTabKey?: number;
  onTabChange?: (tab: 'upload-new' | 'update-existing' | 'manage' | 'submissions' | 'god-mode') => void;
}

// Sample mobile screenshots for testing/previewing
const SAMPLE_SCREENSHOTS = [
  'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=800&auto=format&fit=crop&q=80'
];

// Convert screenshot to optimized Data URL so it is permanently preserved in Firestore and loads fast
function convertScreenshotToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch (_) {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// Convert chosen image to compressed Base64 Data URL so it is permanently stored in app data
// and never fails with 404 on Vercel or ephemeral serverless filesystems
function convertImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxSize = 256;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png', 0.95));
        } catch (_) {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => resolve('/zuzustore-logo.png');
    reader.readAsDataURL(file);
  });
}

// Auto-transform Google Drive, Dropbox, and cloud storage URLs into direct 1-click download links
// Uses the modern direct usercontent endpoint with confirm=t to prevent Google 403 access errors
function formatCloudUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  const gdMatch1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdMatch1 && gdMatch1[1]) {
    return `https://drive.usercontent.google.com/download?id=${gdMatch1[1]}&export=download&confirm=t`;
  }
  const gdMatch2 = trimmed.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (gdMatch2 && gdMatch2[1]) {
    return `https://drive.usercontent.google.com/download?id=${gdMatch2[1]}&export=download&confirm=t`;
  }
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'dl=1');
  }
  return trimmed;
}

export const PublisherPortal: React.FC<PublisherPortalProps> = ({
  apps,
  admin,
  onOpenLoginModal,
  onUploadApp,
  onUpdateApp,
  onAddRelease,
  onDeleteRelease,
  onDeleteApp,
  onResetCatalog,
  onViewAppInStore,
  onDownloadTest,
  onAppApproved,
  onRefreshCatalog,
  requestedTab,
  requestedTabKey,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<'upload-new' | 'update-existing' | 'manage' | 'submissions' | 'god-mode'>(
    requestedTab || 'upload-new'
  );

  // Sync tab when triggered from Header ("👑 God Mode" or "Publisher Portal") or floating banner
  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
      if (requestedTab === 'god-mode') {
        loadDevelopers();
        loadBroadcastData();
        loadFinancials();
      } else if (requestedTab === 'submissions') {
        loadPending();
      }
    }
  }, [requestedTab, requestedTabKey]);

  // Keep parent view state in sync when internal tabs change
  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Developer Submissions Review State
  const [pendingSubmissions, setPendingSubmissions] = useState<StoreApp[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [rejectModalApp, setRejectModalApp] = useState<StoreApp | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);

  // ==========================================
  // SUPER ADMIN GOD MODE STATE
  // ==========================================
  const [developers, setDevelopers] = useState<DeveloperAccountAdminView[]>([]);
  const [isLoadingDevelopers, setIsLoadingDevelopers] = useState(false);
  const [devSearchTerm, setDevSearchTerm] = useState('');
  const [devFilterStatus, setDevFilterStatus] = useState<'all' | 'active' | 'frozen' | 'banned'>('all');

  // Inspect developer apps modal
  const [inspectDev, setInspectDev] = useState<DeveloperAccountAdminView | null>(null);
  const [inspectDevApps, setInspectDevApps] = useState<StoreApp[]>([]);
  const [isLoadingDevApps, setIsLoadingDevApps] = useState(false);

  // Status change modal (freeze / ban / unfreeze)
  const [statusModalDev, setStatusModalDev] = useState<DeveloperAccountAdminView | null>(null);
  const [newStatusChoice, setNewStatusChoice] = useState<DeveloperStatus>('frozen');
  const [statusReasonInput, setStatusReasonInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Delete developer modal
  const [deleteDevModal, setDeleteDevModal] = useState<DeveloperAccountAdminView | null>(null);
  const [isDeletingDev, setIsDeletingDev] = useState(false);

  // Soft Takedown Modal
  const [takedownAppModal, setTakedownAppModal] = useState<StoreApp | null>(null);
  const [takedownReasonInput, setTakedownReasonInput] = useState('');
  const [isTakedownSaving, setIsTakedownSaving] = useState(false);

  // Super Admin Direct Metadata Override Modal
  const [overrideAppModal, setOverrideAppModal] = useState<StoreApp | null>(null);
  const [overrideFormData, setOverrideFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    category: 'Utilities',
    directDownloadUrl: '',
    iconUrl: ''
  });
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Super Admin App Ownership Transfer State
  const [ownershipSearchTerm, setOwnershipSearchTerm] = useState('');
  const [transferAppModal, setTransferAppModal] = useState<StoreApp | null>(null);
  const [transferTargetMode, setTransferTargetMode] = useState<'developer' | 'email' | 'admin'>('developer');
  const [selectedTargetDevId, setSelectedTargetDevId] = useState('');
  const [manualTargetEmail, setManualTargetEmail] = useState('');
  const [transferDevSearch, setTransferDevSearch] = useState('');
  const [updateDisplayDeveloper, setUpdateDisplayDeveloper] = useState(true);
  const [transferReason, setTransferReason] = useState('');
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);

  // Live System Broadcast Banner State
  const [broadcast, setBroadcast] = useState<AdminBroadcast>({
    message: '',
    level: 'info',
    active: false,
    link: '',
    linkText: ''
  });
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);

  // ==========================================
  // SUPER ADMIN FINANCIAL OPERATIONS STATE
  // ==========================================
  const [financials, setFinancials] = useState<AdminFinancialSummary | null>(null);
  const [adminSales, setAdminSales] = useState<AppSaleTransaction[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(false);
  const [actioningWithdrawalId, setActioningWithdrawalId] = useState<string | null>(null);
  const [rejectWithdrawalModal, setRejectWithdrawalModal] = useState<WithdrawalRequest | null>(null);
  const [rejectWithdrawalReason, setRejectWithdrawalReason] = useState('');
  const [approveTxRefInput, setApproveTxRefInput] = useState<{ id: string; ref: string } | null>(null);
  const [isPingingLivePay, setIsPingingLivePay] = useState(false);
  const [livepayPingResult, setLivepayPingResult] = useState<string | null>(null);
  const [actioningLivePayWithdrawalId, setActioningLivePayWithdrawalId] = useState<string | null>(null);
  const [livepayCopyToast, setLivepayCopyToast] = useState(false);

  // Commission Percentage State (Editable 0-100%)
  const [commissionPercentInput, setCommissionPercentInput] = useState<string>('6');
  const [transferFeePer1000Input, setTransferFeePer1000Input] = useState<string>('100');
  const [isSavingCommission, setIsSavingCommission] = useState(false);
  const [commissionToast, setCommissionToast] = useState<string | null>(null);

  // ==========================================
  // STOREFRONT & "FOR YOU" VISUAL CURATION STATE
  // ==========================================
  const [curatedApps, setCuratedApps] = useState<StoreApp[]>([]);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderToast, setOrderToast] = useState<string | null>(null);

  // Synchronize curatedApps whenever apps change, sorted by current displayOrder
  useEffect(() => {
    const phoneList = filterPhoneApps(apps).sort((a, b) => {
      const orderA = a.displayOrder !== undefined ? a.displayOrder : (a.isFeatured ? 1 : 9999);
      const orderB = b.displayOrder !== undefined ? b.displayOrder : (b.isFeatured ? 1 : 9999);
      if (orderA !== orderB) return orderA - orderB;
      return (b.downloadsTotal || 0) - (a.downloadsTotal || 0);
    });
    setCuratedApps(phoneList);
    setHasOrderChanges(false);
  }, [apps]);

  const handleMoveAppUp = (index: number) => {
    if (index <= 0) return;
    setCuratedApps((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
    setHasOrderChanges(true);
  };

  const handleMoveAppDown = (index: number) => {
    setCuratedApps((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
    setHasOrderChanges(true);
  };

  const handleMakeHeroSpotlight = (index: number) => {
    if (index === 0) return;
    setCuratedApps((prev) => {
      const target = prev[index];
      const filtered = prev.filter((_, i) => i !== index);
      return [target, ...filtered];
    });
    setHasOrderChanges(true);
  };

  const handleSaveStorefrontOrder = async () => {
    if (curatedApps.length === 0) return;
    setIsSavingOrder(true);
    try {
      const orderPayload = curatedApps.map((app, idx) => ({
        id: app.id,
        displayOrder: idx + 1,
        isFeatured: idx === 0 // Rank #1 is both Hero spotlight and #1 in For You as the user specified!
      }));
      await adminReorderApps(orderPayload);
      setHasOrderChanges(false);
      const topApp = curatedApps[0];
      setOrderToast(`Saved! "${topApp?.name || 'Top App'}" is now #1 Hero Spotlight and Top of For You.`);
      setTimeout(() => setOrderToast(null), 4500);
      onRefreshCatalog?.();
    } catch (err: any) {
      alert(err.message || 'Failed to save storefront order.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const loadDevelopers = async () => {
    setIsLoadingDevelopers(true);
    try {
      const list = await fetchAdminDevelopers();
      setDevelopers(list);
    } catch (e) {
      console.warn('Failed to load developers:', e);
    } finally {
      setIsLoadingDevelopers(false);
    }
  };

  const loadBroadcastData = async () => {
    try {
      const b = await fetchBroadcast();
      if (b) {
        setBroadcast(b);
      }
    } catch (e) {
      console.warn('Failed to load broadcast:', e);
    }
  };

  const loadPending = async () => {
    setIsLoadingSubmissions(true);
    try {
      const list = await fetchPendingSubmissions();
      setPendingSubmissions(list);
    } catch (e) {
      console.warn('Failed to load pending submissions:', e);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const loadFinancials = async () => {
    setIsLoadingFinancials(true);
    try {
      const data = await fetchAdminFinancials();
      setFinancials(data.financials);
      setAdminSales(data.recentSales || []);
      setAdminWithdrawals(data.withdrawals || []);
      if (data.financials?.adminCommissionPercent !== undefined) {
        setCommissionPercentInput(String(data.financials.adminCommissionPercent));
      }
      if (data.financials?.withdrawalTransferFeePer1000 !== undefined) {
        setTransferFeePer1000Input(String(data.financials.withdrawalTransferFeePer1000));
      }
    } catch (e) {
      console.warn('Failed to load platform financials:', e);
    } finally {
      setIsLoadingFinancials(false);
    }
  };

  const handleSaveCommissionRate = async (newPercent?: number) => {
    const targetPercent = newPercent !== undefined ? newPercent : Number(commissionPercentInput);
    if (isNaN(targetPercent) || targetPercent < 0 || targetPercent > 100) {
      setErrorMessage('Super Admin commission rate must be between 0% and 100%.');
      return;
    }
    const targetFee = Number(transferFeePer1000Input) || 100;

    setIsSavingCommission(true);
    try {
      const res = await updateAdminCommission(targetPercent, targetFee);
      setCommissionPercentInput(String(targetPercent));
      setCommissionToast(res.message || `Commission rate successfully set to ${targetPercent}%!`);
      setTimeout(() => setCommissionToast(null), 4000);
      await loadFinancials();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update commission rate.');
    } finally {
      setIsSavingCommission(false);
    }
  };

  const handleApprovePayout = async (withdrawalId: string, customRef?: string) => {
    setActioningWithdrawalId(withdrawalId);
    try {
      const res = await approveWithdrawalAdmin(
        withdrawalId,
        customRef || `PAYOUT-${Date.now().toString().slice(-6)}`
      );
      setSuccessMessage(res.message || 'Developer payout approved and marked as Paid!');
      setApproveTxRefInput(null);
      await loadFinancials();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve withdrawal.');
    } finally {
      setActioningWithdrawalId(null);
    }
  };

  const handleRejectPayout = async () => {
    if (!rejectWithdrawalModal) return;
    setActioningWithdrawalId(rejectWithdrawalModal.id);
    try {
      const res = await rejectWithdrawalAdmin(
        rejectWithdrawalModal.id,
        rejectWithdrawalReason.trim() || 'Payout request rejected by administrator. Funds restored to your balance.'
      );
      setSuccessMessage(
        res.message || 'Withdrawal rejected. Funds have been refunded back to developer available balance.'
      );
      setRejectWithdrawalModal(null);
      setRejectWithdrawalReason('');
      await loadFinancials();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reject withdrawal.');
    } finally {
      setActioningWithdrawalId(null);
    }
  };

  const handlePingLivePay = async () => {
    setIsPingingLivePay(true);
    setLivepayPingResult(null);
    try {
      const res = await pingLivePay();
      setLivepayPingResult(
        res.message || 'LivePay API Connected: Ready for real-time mobile money collections & payouts (Account: LP260805074398)'
      );
      setTimeout(() => setLivepayPingResult(null), 6000);
    } catch (err: any) {
      setLivepayPingResult(`LivePay Ping Notice: ${err.message}`);
    } finally {
      setIsPingingLivePay(false);
    }
  };

  const handleDisburseViaLivePay = async (withdrawal: WithdrawalRequest) => {
    setActioningLivePayWithdrawalId(withdrawal.id);
    try {
      const res = await disburseWithdrawalLivePay(withdrawal.id);
      setSuccessMessage(
        res.message ||
          `Success! Sent ${withdrawal.amount.toLocaleString()} ${withdrawal.currency} directly to ${withdrawal.payoutDetails.accountNumber} via LivePay Mobile Money!`
      );
      await loadFinancials();
    } catch (err: any) {
      setErrorMessage(err.message || 'LivePay payout failed. Check account balance or network.');
    } finally {
      setActioningLivePayWithdrawalId(null);
    }
  };

  useEffect(() => {
    if (admin) {
      loadPending();
      loadDevelopers();
      loadBroadcastData();
      loadFinancials();
    }
  }, [admin]);

  const handleUpdateDevStatus = async () => {
    if (!statusModalDev) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateDeveloperStatus(statusModalDev.id, newStatusChoice, statusReasonInput.trim());
      setSuccessMessage(res.message);
      setStatusModalDev(null);
      setStatusReasonInput('');
      await loadDevelopers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update developer status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteDeveloper = async () => {
    if (!deleteDevModal) return;
    setIsDeletingDev(true);
    try {
      const res = await deleteDeveloperAccount(deleteDevModal.id);
      setSuccessMessage(res.message);
      setDeleteDevModal(null);
      await loadDevelopers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete developer account.');
    } finally {
      setIsDeletingDev(false);
    }
  };

  const handleOpenInspectDev = async (dev: DeveloperAccountAdminView) => {
    setInspectDev(dev);
    setIsLoadingDevApps(true);
    try {
      const devApps = await fetchDeveloperAppsAdmin(dev.id);
      setInspectDevApps(devApps);
    } catch (e) {
      console.warn('Failed to load dev apps:', e);
    } finally {
      setIsLoadingDevApps(false);
    }
  };

  const handleTakedownApp = async () => {
    if (!takedownAppModal) return;
    setIsTakedownSaving(true);
    try {
      const res = await takedownApp(takedownAppModal.id, takedownReasonInput.trim());
      setSuccessMessage(res.message);
      setTakedownAppModal(null);
      setTakedownReasonInput('');
      if (onRefreshCatalog) onRefreshCatalog();
      await loadDevelopers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to take down application.');
    } finally {
      setIsTakedownSaving(false);
    }
  };

  const handleRestoreApp = async (appId: string) => {
    try {
      const res = await restoreApp(appId);
      setSuccessMessage(res.message);
      if (onRefreshCatalog) onRefreshCatalog();
      await loadDevelopers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore application.');
    }
  };

  const handleSaveOverride = async () => {
    if (!overrideAppModal) return;
    setIsSavingOverride(true);
    try {
      const res = await overrideAppMetadata(overrideAppModal.id, {
        name: overrideFormData.name.trim(),
        tagline: overrideFormData.tagline.trim(),
        description: overrideFormData.description.trim(),
        category: overrideFormData.category,
        iconUrl: overrideFormData.iconUrl.trim() || undefined
      });
      setSuccessMessage(res.message);
      setOverrideAppModal(null);
      if (onRefreshCatalog) onRefreshCatalog();
      await loadDevelopers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to override application metadata.');
    } finally {
      setIsSavingOverride(false);
    }
  };

  const openTransferOwnershipModal = (app: StoreApp) => {
    setTransferAppModal(app);
    setTransferTargetMode('developer');
    setSelectedTargetDevId('');
    setManualTargetEmail('');
    setTransferDevSearch('');
    setUpdateDisplayDeveloper(true);
    setTransferReason('');
    if (developers.length === 0) {
      loadDevelopers();
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferAppModal) return;
    setIsTransferringOwnership(true);
    setErrorMessage(null);
    try {
      const payload =
        transferTargetMode === 'admin'
          ? {
              targetType: 'admin' as const,
              updateDisplayDeveloper,
              reason: transferReason.trim() || undefined
            }
          : transferTargetMode === 'email'
          ? {
              targetType: 'developer' as const,
              targetEmail: manualTargetEmail.trim(),
              updateDisplayDeveloper,
              reason: transferReason.trim() || undefined
            }
          : {
              targetType: 'developer' as const,
              targetDeveloperId: selectedTargetDevId,
              updateDisplayDeveloper,
              reason: transferReason.trim() || undefined
            };

      const res = await transferAppOwnership(transferAppModal.id, payload);
      setSuccessMessage(res.message);
      setTransferAppModal(null);
      if (onRefreshCatalog) onRefreshCatalog();
      await loadDevelopers();
      if (inspectDev) {
        const refreshedApps = await fetchDeveloperAppsAdmin(inspectDev.id);
        setInspectDevApps(refreshedApps);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to transfer app ownership.');
    } finally {
      setIsTransferringOwnership(false);
    }
  };

  const handleSaveBroadcast = async () => {
    setIsSavingBroadcast(true);
    try {
      const res = await saveAdminBroadcast(broadcast);
      setBroadcast(res.broadcast);
      setBroadcastToast('Broadcast banner published successfully across the platform!');
      setTimeout(() => setBroadcastToast(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save broadcast.');
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  const handleApprove = async (appId: string) => {
    setReviewingAppId(appId);
    try {
      const res = await approveAppSubmission(appId);
      setSuccessMessage(`Application "${res.app.name}" approved and published to live store!`);
      setPendingSubmissions((prev) => prev.filter((a) => a.id !== appId));
      if (onAppApproved) {
        onAppApproved(res.app);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve application.');
    } finally {
      setReviewingAppId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalApp) return;
    setReviewingAppId(rejectModalApp.id);
    try {
      await rejectAppSubmission(rejectModalApp.id, rejectReasonText.trim());
      setSuccessMessage(`Application "${rejectModalApp.name}" rejected. Feedback sent to developer.`);
      setPendingSubmissions((prev) => prev.filter((a) => a.id !== rejectModalApp.id));
      setRejectModalApp(null);
      setRejectReasonText('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reject application.');
    } finally {
      setReviewingAppId(null);
    }
  };

  // Target edition selector: Phone vs Smart TV
  const [targetEdition, setTargetEdition] = useState<'phone' | 'tv'>('phone');
  // Catalog filter tab: all, phone, tv
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'phone' | 'tv'>('all');

  // Form state for New App
  const [appName, setAppName] = useState('');
  const [appTagline, setAppTagline] = useState('');
  const [appCategory, setAppCategory] = useState<AppCategory | string>('Productivity');
  const [appDescription, setAppDescription] = useState('');
  const [appPackageId, setAppPackageId] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [appPlatform, setAppPlatform] = useState<Platform>('Android');
  const [appMinOS, setAppMinOS] = useState('Android 8.0+');
  const [appChangelog, setAppChangelog] = useState('Initial public APK release.');
  const [uploadedBinaryFile, setUploadedBinaryFile] = useState<File | null>(null);
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string>('');
  
  // Pricing state for New App (Free vs Paid)
  const [appPricingType, setAppPricingType] = useState<AppPricingType>('free');
  const [appPrice, setAppPrice] = useState<number>(5000);
  const [appCurrency, setAppCurrency] = useState<string>('UGX');
  
  // Icon state - defaults to the official ZuzuStore brand logo
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string>('/zuzustore-logo.png');
  const [customIconUrlInput, setCustomIconUrlInput] = useState<string>('');

  // Screenshots state for New App (Supports adding more than three screenshots)
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [customScreenshotUrl, setCustomScreenshotUrl] = useState<string>('');
  const [isProcessingScreenshots, setIsProcessingScreenshots] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Modal for editing screenshots of existing apps in Live Catalog
  const [editingScreenshotsApp, setEditingScreenshotsApp] = useState<StoreApp | null>(null);
  const [editingScreenshotsList, setEditingScreenshotsList] = useState<string[]>([]);
  const [isSavingScreenshots, setIsSavingScreenshots] = useState(false);
  const [customEditScreenshotUrl, setCustomEditScreenshotUrl] = useState<string>('');
  const editScreenshotInputRef = useRef<HTMLInputElement>(null);

  // In-portal screenshot preview lightbox
  const [publisherLightboxUrl, setPublisherLightboxUrl] = useState<string | null>(null);

  // Update existing app state
  const [selectedExistingAppId, setSelectedExistingAppId] = useState<string>(apps[0]?.id || '');
  const [updateVersion, setUpdateVersion] = useState('1.1.0');
  const [updatePlatform, setUpdatePlatform] = useState<Platform>('Android');
  const [updateMinOS, setUpdateMinOS] = useState('Android 9.0+');
  const [updateChangelog, setUpdateChangelog] = useState('Critical stability fixes, updated APK signature, and performance improvements.');

  // In-app Delete App Confirmation Modal state
  const [appToDelete, setAppToDelete] = useState<StoreApp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-app Delete Release/Version Confirmation Modal state
  const [expandedReleasesAppId, setExpandedReleasesAppId] = useState<string | null>(null);
  const [releaseToDelete, setReleaseToDelete] = useState<{ app: StoreApp; releaseId: string; version: string; fileName: string } | null>(null);
  const [isDeletingRelease, setIsDeletingRelease] = useState(false);

  const handleConfirmDelete = async () => {
    if (!appToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteApp(appToDelete.id);
      setSuccessMessage(`"${appToDelete.name}" was permanently removed from the website and cloud database.`);
      setAppToDelete(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete application.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteRelease = async () => {
    if (!releaseToDelete || !onDeleteRelease) return;
    setIsDeletingRelease(true);
    try {
      await onDeleteRelease(releaseToDelete.app.id, releaseToDelete.releaseId);
      setSuccessMessage(`Version "${releaseToDelete.version}" was permanently removed from the website.`);
      setReleaseToDelete(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete version release.');
    } finally {
      setIsDeletingRelease(false);
    }
  };
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateDirectUrl, setUpdateDirectUrl] = useState<string>('');

  // Link verification states (prevents Google Drive 403 Access Denied errors)
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [linkVerifyResult, setLinkVerifyResult] = useState<{
    accessible: boolean;
    message: string;
    isGoogleDrive: boolean;
    viewUrl?: string;
  } | null>(null);

  const [isVerifyingUpdateLink, setIsVerifyingUpdateLink] = useState(false);
  const [updateLinkVerifyResult, setUpdateLinkVerifyResult] = useState<{
    accessible: boolean;
    message: string;
    isGoogleDrive: boolean;
    viewUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // If not authenticated as Admin, show authentication gate
  if (!admin) {
    return (
      <div className="py-16 max-w-2xl mx-auto px-4 text-center">
        <div className="p-8 sm:p-10 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/80 text-cyan-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Publisher Account Required</h2>
            <p className="text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
              Users can download any APK freely without an account. However, publishing and managing applications is restricted to the administrator account.
            </p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs text-neutral-300 text-left space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Protected Administrator Portal</span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Only the store administrator can publish and manage APK packages. Sign in using your private administrator credentials.
            </p>
          </div>

          <div>
            <button
              onClick={onOpenLoginModal}
              className="w-full sm:w-auto px-6 py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              <KeyRound className="w-4 h-4" />
              <span>Log In as Admin to Publish Apps</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleBinaryFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedBinary(e.dataTransfer.files[0]);
    }
  };

  const processSelectedBinary = (file: File) => {
    setUploadedBinaryFile(file);
    if (file.name.endsWith('.apk') || file.name.endsWith('.aab')) {
      setAppPlatform('Android');
    } else if (file.name.endsWith('.exe')) {
      setAppPlatform('Windows');
    }

    // Auto-suggest app name and package ID if empty
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (!appName.trim()) {
      const cleanName = baseName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setAppName(cleanName);
    }
    if (!appPackageId.trim()) {
      const cleanSlug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
      setAppPackageId(`com.zuzu.${cleanSlug}`);
    }
  };

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const dataUrl = await convertImageToDataUrl(file);
      setIconPreviewUrl(dataUrl);
      setCustomIconUrlInput('');
    }
  };

  const handleCustomIconUrlChange = (url: string) => {
    setCustomIconUrlInput(url);
    if (url.trim()) {
      setIconPreviewUrl(url.trim());
    } else {
      setIconPreviewUrl('/zuzustore-logo.png');
    }
  };

  const isGoogleDrive = (url: string) => url.includes('drive.google.com');

  const handleTestLinkAccess = async (url: string, isUpdate = false) => {
    if (!url.trim()) return;
    if (isUpdate) {
      setIsVerifyingUpdateLink(true);
      setUpdateLinkVerifyResult(null);
    } else {
      setIsVerifyingLink(true);
      setLinkVerifyResult(null);
    }

    try {
      const res = await verifyDirectUrl(url.trim());
      if (isUpdate) {
        setUpdateLinkVerifyResult(res);
      } else {
        setLinkVerifyResult(res);
      }
    } catch (err: any) {
      const fallback = {
        accessible: false,
        message: err.message || 'Could not verify link. Please ensure URL is valid and publicly shared.',
        isGoogleDrive: url.includes('drive.google.com')
      };
      if (isUpdate) {
        setUpdateLinkVerifyResult(fallback);
      } else {
        setLinkVerifyResult(fallback);
      }
    } finally {
      if (isUpdate) {
        setIsVerifyingUpdateLink(false);
      } else {
        setIsVerifyingLink(false);
      }
    }
  };

  // Screenshot handlers for New App (Supports adding more than 3 screenshots)
  const handleSelectScreenshotFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessingScreenshots(true);
    try {
      const files = Array.from(e.target.files);
      const convertedUrls: string[] = [];
      for (const file of files) {
        const url = await convertScreenshotToDataUrl(file);
        if (url) convertedUrls.push(url);
      }
      setScreenshots((prev) => [...prev, ...convertedUrls]);
      setScreenshotFiles((prev) => [...prev, ...files]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing selected screenshot files.');
    } finally {
      setIsProcessingScreenshots(false);
      if (screenshotInputRef.current) {
        screenshotInputRef.current.value = '';
      }
    }
  };

  const handleScreenshotDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    setIsProcessingScreenshots(true);
    try {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      const convertedUrls: string[] = [];
      for (const file of files) {
        const url = await convertScreenshotToDataUrl(file);
        if (url) convertedUrls.push(url);
      }
      setScreenshots((prev) => [...prev, ...convertedUrls]);
      setScreenshotFiles((prev) => [...prev, ...files]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing dropped screenshot files.');
    } finally {
      setIsProcessingScreenshots(false);
    }
  };

  const handleAddCustomScreenshotUrl = () => {
    const trimmed = customScreenshotUrl.trim();
    if (!trimmed) return;
    setScreenshots((prev) => [...prev, trimmed]);
    setCustomScreenshotUrl('');
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveScreenshot = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= screenshots.length) return;
    setScreenshots((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
    setScreenshotFiles((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const handleLoadSampleScreenshots = () => {
    setScreenshots(SAMPLE_SCREENSHOTS);
    setSuccessMessage('Added 4 sample showcase screenshots! You can reorder, delete, or upload more.');
  };

  // Handlers for updating screenshots on existing apps
  const handleSelectEditScreenshotFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsSavingScreenshots(true);
    try {
      const files = Array.from(e.target.files);
      const converted: string[] = [];
      for (const file of files) {
        const url = await convertScreenshotToDataUrl(file);
        if (url) converted.push(url);
      }
      setEditingScreenshotsList((prev) => [...prev, ...converted]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing screenshot files.');
    } finally {
      setIsSavingScreenshots(false);
      if (editScreenshotInputRef.current) {
        editScreenshotInputRef.current.value = '';
      }
    }
  };

  const handleSaveAppScreenshots = async () => {
    if (!editingScreenshotsApp || !onUpdateApp) return;
    setIsSavingScreenshots(true);
    try {
      const updatedScreenshots =
        editingScreenshotsList.length > 0
          ? editingScreenshotsList
          : [editingScreenshotsApp.iconUrl || '/zuzustore-logo.png'];

      await onUpdateApp(editingScreenshotsApp.id, {
        screenshots: updatedScreenshots
      });

      setSuccessMessage(
        `Screenshots for "${editingScreenshotsApp.name}" (${updatedScreenshots.length} images) updated and saved live to Firestore!`
      );
      setEditingScreenshotsApp(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update screenshots.');
    } finally {
      setIsSavingScreenshots(false);
    }
  };

  const handleSubmitNewApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      setErrorMessage('Application name is required.');
      return;
    }

    // Support at least 1GB (up to 2GB) for APK binary uploads
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (at least 1GB guaranteed)
    if (uploadedBinaryFile && uploadedBinaryFile.size > MAX_FILE_SIZE) {
      setErrorMessage(
        `File size (${(uploadedBinaryFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 2GB limit (packages of at least 1GB are supported).`
      );
      return;
    }

    const hasDirectLink = Boolean(directDownloadUrl.trim());

    setIsSubmitting(true);
    setUploadProgress(15);
    setErrorMessage(null);

    try {
      const formattedLink = hasDirectLink ? formatCloudUrl(directDownloadUrl) : '';
      const finalFileName = uploadedBinaryFile
        ? uploadedBinaryFile.name
        : `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v${appVersion || '1.0.0'}.apk`;
      const finalFileSize = uploadedBinaryFile
        ? `${(uploadedBinaryFile.size / (1024 * 1024)).toFixed(2)} MB`
        : '29.3 MB';
      const finalIcon = iconPreviewUrl || '/zuzustore-logo.png';
      const finalScreenshots = screenshots.length > 0 ? screenshots : [finalIcon];

      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 25));
      }, 100);

      let payload: FormData | Record<string, any>;
      if (uploadedBinaryFile) {
        const fd = new FormData();
        fd.append('name', appName.trim());
        fd.append('tagline', appTagline.trim() || `${appName} for Android`);
        fd.append('category', appCategory);
        fd.append('description', appDescription.trim() || `${appName} official APK build.`);
        fd.append('packageId', appPackageId.trim() || `com.zuzu.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        fd.append('version', appVersion.trim() || '1.0.0');
        fd.append('platform', appPlatform);
        fd.append('minOS', appMinOS.trim() || 'Android 8.0+');
        fd.append('changelog', appChangelog);
        fd.append('directDownloadUrl', formattedLink);
        fd.append('fileName', finalFileName);
        fd.append('fileSize', finalFileSize);
        fd.append('iconUrl', finalIcon);
        fd.append('apkFile', uploadedBinaryFile);
        fd.append('appEdition', targetEdition === 'tv' ? 'tv' : 'phone');
        fd.append('isTvCompatible', (targetEdition === 'tv' || appPlatform === 'Android TV' || appPlatform === 'Fire TV' || appPlatform === 'Smart TV') ? 'true' : 'false');
        // Include pricing settings
        fd.append('pricingType', appPricingType);
        fd.append('price', String(appPricingType === 'paid' ? appPrice : 0));
        fd.append('currency', appCurrency);
        // Include screenshots in FormData
        fd.append('screenshots', JSON.stringify(finalScreenshots));
        screenshotFiles.forEach((f) => {
          fd.append('screenshotFiles', f);
        });
        payload = fd;
      } else {
        payload = {
          name: appName.trim(),
          tagline: appTagline.trim() || `${appName} for ${appPlatform}`,
          category: appCategory,
          description: appDescription.trim() || `${appName} official ${appPlatform} installation package.`,
          packageId: appPackageId.trim() || `com.zuzu.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          version: appVersion.trim() || '1.0.0',
          platform: appPlatform,
          appEdition: targetEdition === 'tv' ? 'tv' : 'phone',
          isTvCompatible: targetEdition === 'tv' || appPlatform === 'Android TV' || appPlatform === 'Fire TV' || appPlatform === 'Smart TV',
          minOS: appMinOS.trim() || (targetEdition === 'tv' || appPlatform === 'Android TV' ? 'Android TV 8.0+' : 'Android 8.0+'),
          changelog: appChangelog,
          directDownloadUrl: formattedLink,
          fileName: finalFileName,
          fileSize: finalFileSize,
          iconUrl: finalIcon,
          screenshots: finalScreenshots,
          pricing: {
            type: appPricingType,
            price: appPricingType === 'paid' ? appPrice : 0,
            currency: appCurrency
          }
        };
      }

      const created = await onUploadApp(payload);

      // Save the full APK file into client-side storage so it can be downloaded directly
      if (uploadedBinaryFile) {
        await saveApkBlob(created.id, uploadedBinaryFile);
      }

      clearInterval(interval);
      setUploadProgress(100);
      setSuccessMessage(`"${created.name}" (${finalFileSize}) published successfully with ${finalScreenshots.length} screenshots!`);

      // Reset form
      setAppName('');
      setAppTagline('');
      setAppDescription('');
      setUploadedBinaryFile(null);
      setDirectDownloadUrl('');
      setIconPreviewUrl('/zuzustore-logo.png');
      setScreenshots([]);
      setScreenshotFiles([]);
      setCustomScreenshotUrl('');
      setAppPricingType('free');
      setAppPrice(5000);

      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
        setActiveTab('manage');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while publishing your APK.');
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleSubmitUpdateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingAppId) return;

    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (at least 1GB supported)
    if (updateFile && updateFile.size > MAX_FILE_SIZE) {
      setErrorMessage(
        `Update file size (${(updateFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 2GB limit (packages of at least 1GB supported).`
      );
      return;
    }

    const hasDirectLink = Boolean(updateDirectUrl.trim());

    setIsSubmitting(true);
    setUploadProgress(20);
    setErrorMessage(null);

    try {
      const formattedLink = hasDirectLink ? formatCloudUrl(updateDirectUrl) : '';
      const finalFileName = updateFile ? updateFile.name : `release-v${updateVersion.trim()}.apk`;
      const finalFileSize = updateFile ? `${(updateFile.size / (1024 * 1024)).toFixed(2)} MB` : '32.0 MB';

      const interval = setInterval(() => {
        setUploadProgress((p) => (p >= 90 ? 90 : p + 20));
      }, 100);

      let payload: FormData | Record<string, any>;
      if (updateFile) {
        const fd = new FormData();
        fd.append('version', updateVersion.trim());
        fd.append('platform', updatePlatform);
        fd.append('minOS', updateMinOS.trim());
        fd.append('changelog', updateChangelog);
        fd.append('directDownloadUrl', formattedLink);
        fd.append('fileName', finalFileName);
        fd.append('fileSize', finalFileSize);
        fd.append('apkFile', updateFile);
        payload = fd;
      } else {
        payload = {
          version: updateVersion.trim(),
          platform: updatePlatform,
          minOS: updateMinOS.trim(),
          changelog: updateChangelog,
          directDownloadUrl: formattedLink,
          fileName: finalFileName,
          fileSize: finalFileSize
        };
      }

      await onAddRelease(selectedExistingAppId, payload);

      if (updateFile) {
        await saveApkBlob(selectedExistingAppId, updateFile);
      }

      clearInterval(interval);
      setUploadProgress(100);
      setSuccessMessage(`New APK release v${updateVersion} published successfully!`);
      setUpdateFile(null);
      setUpdateDirectUrl('');

      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
        setActiveTab('manage');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to publish release update.');
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="py-10 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header section with admin badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
            <span>Publisher Portal</span>
            <span>•</span>
            <span className="text-emerald-400">Authenticated Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            APK Distribution Console
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Publish applications, release new APK updates, and manage public store downloads.
          </p>
        </div>

        {/* Tab switcher: Wraps cleanly on all mobile, tablet, and desktop screens so God Mode is never hidden off-screen */}
        <div className="w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('upload-new')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'upload-new'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload New APK</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('update-existing')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'update-existing'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Add Version Release</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>Live Catalog ({apps.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('submissions');
                loadPending();
              }}
              className={`px-3 sm:px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Review Queue</span>
              {pendingSubmissions.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-red-600 text-white font-black text-[10px] rounded-full animate-pulse shadow">
                  {pendingSubmissions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('god-mode');
                loadDevelopers();
                loadBroadcastData();
                loadFinancials();
              }}
              className={`px-3.5 sm:px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'god-mode'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-neutral-950 shadow-lg shadow-amber-500/30 ring-1 ring-amber-300'
                  : 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40'
              }`}
            >
              <Crown className={`w-3.5 h-3.5 shrink-0 fill-current ${activeTab === 'god-mode' ? 'text-neutral-950' : 'text-amber-400'}`} />
              <span>👑 God Mode &amp; Developers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: UPLOAD NEW APP */}
      {activeTab === 'upload-new' && (
        <form onSubmit={handleSubmitNewApp} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Binary File Drop & Metadata */}
            <div className="lg:col-span-7 space-y-6">
              {/* Target Edition Selector: Android Phone vs Smart TV App */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-cyan-950/40 border border-neutral-800 space-y-3.5">
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Select Target Product Edition</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Choose whether you are publishing an <strong className="text-white font-medium">Android Phone App</strong> or a <strong className="text-white font-medium">Smart TV App</strong> so it appears on the correct storefront page.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetEdition('phone');
                      setAppPlatform('Android');
                      if (appCategory === 'Smart TV' || appCategory === 'TV & Movies') {
                        setAppCategory('Productivity');
                      }
                      setAppMinOS('Android 8.0+');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      targetEdition === 'phone'
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      targetEdition === 'phone' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${targetEdition === 'phone' ? 'text-white' : 'text-neutral-300'}`}>
                        Android App (Phones & Tablets)
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                        Appears on main Android App storefront page. Touch UI optimized.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetEdition('tv');
                      setAppPlatform('Android TV');
                      setAppCategory('Smart TV');
                      setAppMinOS('Android TV 9.0+ / Fire OS 7+');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      targetEdition === 'tv'
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      targetEdition === 'tv' ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      <Tv className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${targetEdition === 'tv' ? 'text-cyan-200' : 'text-neutral-300'}`}>
                        Smart TV App (Smart TV & Fire TV)
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                        Appears on dedicated Smart TV page. 10-foot remote D-pad ready.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Package Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Select {targetEdition === 'tv' ? 'Smart TV' : 'Android'} APK File (Supports at least 1GB - up to 2GB)
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleBinaryFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-colors ${
                    uploadedBinaryFile
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : 'border-neutral-800 hover:border-cyan-500 bg-neutral-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".apk,.aab,.exe,.zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processSelectedBinary(e.target.files[0]);
                      }
                    }}
                  />
                  {uploadedBinaryFile ? (
                    <div className="flex flex-col items-center">
                      <FolderArchive className="w-10 h-10 text-emerald-400 mb-2" />
                      <p className="text-sm font-bold text-white">{uploadedBinaryFile.name}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {(uploadedBinaryFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for publication (Supports at least 1GB - up to 2GB)
                      </p>
                      <span className="text-[11px] text-cyan-400 hover:underline mt-2">
                        Click to choose a different file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadCloud className="w-10 h-10 text-neutral-400 mb-2.5" />
                      <p className="text-sm font-semibold text-white">
                        Drag and drop your Android .APK here (Supports at least 1GB - up to 2GB)
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Or click to select an APK file (at least 1GB supported) from your phone or computer
                      </p>
                      <span className="mt-3 px-3 py-1.5 text-xs font-medium bg-neutral-800 text-neutral-200 rounded-lg">
                        Browse APK Files
                      </span>
                    </div>
                  )}
                </div>

                {/* File readiness indicator (supports at least 1GB) */}
                {uploadedBinaryFile && (
                  <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 space-y-1 mt-3">
                    <div className="flex items-center gap-2 font-bold text-cyan-300">
                      <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{uploadedBinaryFile.name} ({(uploadedBinaryFile.size / (1024 * 1024)).toFixed(2)} MB) — Ready to Publish</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Packages of at least 1GB (up to 2GB) are supported. The APK will be saved and published directly to your store catalog.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 my-4 text-xs text-neutral-500">
                  <div className="flex-1 h-px bg-neutral-800" />
                  <span>DIRECT DOWNLOAD LINK (RECOMMENDED FOR CLOUD HOSTING)</span>
                  <div className="flex-1 h-px bg-neutral-800" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Direct APK Download Link (Google Drive, GitHub, Dropbox, S3)</span>
                    </label>
                    {directDownloadUrl.trim() && isGoogleDrive(directDownloadUrl) && (
                      <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        Google Drive Link Detected
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={directDownloadUrl}
                      onChange={(e) => {
                        setDirectDownloadUrl(e.target.value);
                        setLinkVerifyResult(null);
                      }}
                      placeholder="https://drive.google.com/file/d/... or https://github.com/user/repo/releases/download/.../app.apk"
                      className="flex-1 px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    {directDownloadUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => handleTestLinkAccess(directDownloadUrl, false)}
                        disabled={isVerifyingLink}
                        className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-300 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 border border-neutral-700"
                        title="Verify this link allows public downloads without 403 errors"
                      >
                        {isVerifyingLink ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5" />
                            <span>Test Public Access</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Google Drive Public Access Requirement Banner */}
                  {directDownloadUrl.trim() && isGoogleDrive(directDownloadUrl) && (
                    <div className="mt-2.5 p-3.5 bg-amber-950/30 border border-amber-900/60 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Crucial: Give Access to Everyone (Avoid Google 403 Error)</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        To let all visitors download without a <strong className="text-white">"403 That's an error - You do not have access"</strong> page:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-300 font-mono">
                        <li>In Google Drive, right-click the APK ➔ <strong className="text-white">Share</strong></li>
                        <li>Under <strong className="text-white">General access</strong>, change from <em>Restricted</em> to <strong className="text-cyan-300">"Anyone with the link"</strong></li>
                        <li>Ensure role is <strong className="text-white">Viewer</strong>, then click Done</li>
                      </ol>

                      {linkVerifyResult && (
                        <div
                          className={`p-2.5 rounded-lg text-[11px] flex items-start gap-2 mt-2 ${
                            linkVerifyResult.accessible
                              ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                              : 'bg-rose-950/80 border border-rose-700 text-rose-300'
                          }`}
                        >
                          {linkVerifyResult.accessible ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-semibold">{linkVerifyResult.message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-neutral-400 mt-1.5">
                    Supports Google Drive, GitHub Releases, Dropbox, and cloud hosts. When you upload a file above, direct platform hosting is active.
                  </p>
                </div>
              </div>

              {/* App Basic Details */}
              <div className="space-y-4 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Application Information</h3>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Application Name *</label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g., Zuzu Mobile, Anime Streamer, NoteVault"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Tagline / Pitch</label>
                  <input
                    type="text"
                    value={appTagline}
                    onChange={(e) => setAppTagline(e.target.value)}
                    placeholder="e.g., Fast, native offline companion with end-to-end sync."
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Category</label>
                    <select
                      value={appCategory}
                      onChange={(e) => setAppCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Productivity">Productivity</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="TV & Movies">TV & Movies</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Tools">Tools</option>
                      <option value="Social">Social</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Finance">Finance</option>
                      <option value="Games">Games</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1 flex items-center justify-between">
                      <span>Target Platform</span>
                      {(appPlatform === 'Android TV' || appPlatform === 'Fire TV') && (
                        <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                          TV 10-ft Leanback
                        </span>
                      )}
                    </label>
                    <select
                      value={appPlatform}
                      onChange={(e) => {
                        const val = e.target.value as Platform;
                        setAppPlatform(val);
                        if (val === 'Android TV') {
                          if (appMinOS === 'Android 8.0+' || !appMinOS) setAppMinOS('Android TV 8.0+ / Google TV');
                        } else if (val === 'Fire TV') {
                          if (appMinOS === 'Android 8.0+' || !appMinOS) setAppMinOS('Fire OS 7.0+ (Android 9+)');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Android">Android Phone & Tablet (.apk)</option>
                      <option value="Android TV">Android TV / Google TV (.apk)</option>
                      <option value="Fire TV">Amazon Fire TV / Fire Stick (.apk)</option>
                      <option value="Windows">Windows (.exe)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Version String *</label>
                    <input
                      type="text"
                      required
                      value={appVersion}
                      onChange={(e) => setAppVersion(e.target.value)}
                      placeholder="e.g., 1.0.0"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Minimum OS Requirement</label>
                    <input
                      type="text"
                      value={appMinOS}
                      onChange={(e) => setAppMinOS(e.target.value)}
                      placeholder="e.g., Android 8.0 (Oreo) or later"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Android Package ID</label>
                  <input
                    type="text"
                    value={appPackageId}
                    onChange={(e) => setAppPackageId(e.target.value)}
                    placeholder="e.g., com.zuzu.mobileapp"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Full Description</label>
                  <textarea
                    rows={4}
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="Describe how the app works, features, and functionality..."
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Release Notes / What&apos;s New</label>
                  <textarea
                    rows={3}
                    value={appChangelog}
                    onChange={(e) => setAppChangelog(e.target.value)}
                    placeholder="Enter changelog (one line per item)&#10;- Initial public release&#10;- Fixed memory footprint"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Monetization: Free vs Paid App */}
                <div className="pt-2 border-t border-neutral-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      <span>Monetization &amp; Pricing</span>
                    </label>
                    <span className="text-[11px] text-neutral-400">6% Super Admin Fee</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAppPricingType('free')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        appPricingType === 'free'
                          ? 'bg-amber-950/40 border-amber-500 text-amber-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">Free APK</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">Direct 1-click free download</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAppPricingType('paid')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        appPricingType === 'paid'
                          ? 'bg-amber-950/40 border-amber-500 text-amber-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">Paid Premium APK</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">Paid download checkout</div>
                    </button>
                  </div>

                  {appPricingType === 'paid' && (
                    <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 animate-fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Price Amount</label>
                          <input
                            type="number"
                            min="500"
                            step="100"
                            value={appPrice}
                            onChange={(e) => setAppPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white font-mono outline-none"
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Currency</label>
                          <select
                            value={appCurrency}
                            onChange={(e) => setAppCurrency(e.target.value)}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white outline-none"
                          >
                            <option value="UGX">UGX (Uganda)</option>
                            <option value="USD">USD ($)</option>
                          </select>
                        </div>
                      </div>
                      <div className="text-[10px] text-neutral-400 pt-1">
                        Gross: <strong className="text-white font-mono">{appPrice.toLocaleString()} {appCurrency}</strong> • 6% Admin Fee: <strong className="text-amber-400 font-mono">{Math.round(appPrice * 0.06).toLocaleString()} {appCurrency}</strong> • Net: <strong className="text-emerald-400 font-mono">{(appPrice - Math.round(appPrice * 0.06)).toLocaleString()} {appCurrency}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Visual Assets & Publish Action */}
            <div className="lg:col-span-5 space-y-6">
              {/* App Icon Upload / Preview */}
              <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Application Icon</span>
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-medium">1:1 Square</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img
                      src={iconPreviewUrl}
                      alt="App Icon Preview"
                      className="w-20 h-20 rounded-2xl object-contain border border-neutral-700 shadow-md shrink-0 bg-neutral-950 p-1"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <input
                      ref={iconInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleIconChange}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => iconInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Icon</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIconPreviewUrl('/zuzustore-logo.png');
                          setCustomIconUrlInput('');
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          iconPreviewUrl === '/zuzustore-logo.png'
                            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                            : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                        }`}
                      >
                        Official Zuzu Logo
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Auto-compressed and saved directly in app data so it displays 100% reliably.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Or Enter Image / Logo URL
                  </label>
                  <input
                    type="url"
                    value={customIconUrlInput}
                    onChange={(e) => handleCustomIconUrlChange(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Publisher info card */}
              <div className="p-5 bg-neutral-900/40 border border-neutral-800 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticated Publisher</span>
                </div>
                <div className="text-neutral-300">
                  Published by: <span className="text-white font-medium">{admin.name || 'Store Administrator'}</span>
                </div>
                <div className="text-neutral-400 text-[11px] leading-relaxed">
                  The application will be live on the storefront immediately. Users can download it freely without requiring an account.
                </div>
              </div>

              {/* Publishing Summary & Submit */}
              <div className="p-6 bg-gradient-to-br from-neutral-900 to-indigo-950/40 border border-neutral-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Publish APK to Public Store</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Upon publishing, your app is indexed with 1-click downloads, QR code scanner support, and verified checksums.
                </p>

                {/* Live Publishing Checklist */}
                <div className="p-3 bg-neutral-950/80 border border-neutral-800/80 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>Package:</span>
                    <span className="font-semibold text-white truncate max-w-[170px]">
                      {uploadedBinaryFile ? uploadedBinaryFile.name : (directDownloadUrl.trim() ? 'Direct Cloud Link' : 'Standard Build')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>Screenshots:</span>
                    {screenshots.length >= 3 ? (
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{screenshots.length} Added (3+ Ready!)</span>
                      </span>
                    ) : screenshots.length > 0 ? (
                      <span className="font-semibold text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{screenshots.length} Added (Add 3+ recommended)</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400">0 Added (Add 3+ recommended)</span>
                    )}
                  </div>
                </div>

                {isSubmitting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-300">
                      <span>Publishing to store...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish APK to Store</span>
                </button>
              </div>
            </div>

            {/* FULL-WIDTH SECTION: APPLICATION SCREENSHOTS & SHOWCASE GALLERY */}
            <div className="lg:col-span-12 space-y-4">
              <div className="p-6 sm:p-7 bg-neutral-900/60 border border-neutral-800 rounded-3xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Application Screenshots & Showcase Gallery
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                      Showcase your app interface. You can add more than 3 screenshots (4, 5, 6, 8+) of the application before you publish so visitors can explore all screens.
                    </p>
                  </div>

                  {/* Screenshots count & requirement indicator badge */}
                  <div className="self-start sm:self-auto shrink-0">
                    {screenshots.length >= 3 ? (
                      <div className="px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{screenshots.length} Screenshots Ready (Meets 3+ Showcase Target!)</span>
                      </div>
                    ) : screenshots.length > 0 ? (
                      <div className="px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>{screenshots.length} Added • Add {3 - screenshots.length} more (recommended: 3+ screenshots)</span>
                      </div>
                    ) : (
                      <div className="px-3.5 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>0 Screenshots • Add 3+ screenshots recommended</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload action controls toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleSelectScreenshotFiles}
                  />

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => screenshotInputRef.current?.click()}
                      disabled={isProcessingScreenshots}
                      className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {isProcessingScreenshots ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing Images...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Upload Screenshots (Select Multiple)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadSampleScreenshots}
                      className="px-3.5 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
                      title="Load 4 sample mobile screenshots instantly"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Load 4 Sample Screenshots</span>
                    </button>
                  </div>

                  {screenshots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshots([]);
                        setScreenshotFiles([]);
                      }}
                      className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-900/40 cursor-pointer"
                    >
                      Clear All ({screenshots.length})
                    </button>
                  )}
                </div>

                {/* Direct Screenshot Image URL input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-neutral-400">
                    Or Add Screenshot by Image URL (CDN, Imgur, Cloudinary, Web link)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customScreenshotUrl}
                      onChange={(e) => setCustomScreenshotUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomScreenshotUrl();
                        }
                      }}
                      placeholder="https://example.com/app-screenshot-preview.png"
                      className="flex-1 px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomScreenshotUrl}
                      disabled={!customScreenshotUrl.trim()}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-300 disabled:opacity-40 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add URL</span>
                    </button>
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleScreenshotDrop}
                  onClick={() => screenshotInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                    screenshots.length > 0
                      ? 'border-neutral-800 hover:border-cyan-500/80 bg-neutral-950/40'
                      : 'border-cyan-800/60 hover:border-cyan-500 bg-neutral-950/70'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <UploadCloud className="w-8 h-8 text-cyan-400" />
                    <p className="text-xs font-bold text-white">
                      Drag & drop multiple screenshot images here
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Supports JPG, PNG, WEBP. Add 3, 4, 5, 6, or more screenshots. Images are auto-compressed for lightning-fast loading!
                    </p>
                  </div>
                </div>

                {/* Visual Screenshots Gallery Grid */}
                {screenshots.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>Showcase Gallery ({screenshots.length} Screenshots Added)</span>
                      <span className="text-[11px] text-neutral-500">Reorder with arrows • Click Enlarge to inspect</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {screenshots.map((shot, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-2xl overflow-hidden border border-neutral-800 hover:border-cyan-500/60 bg-neutral-950 aspect-[16/10] transition-all shadow-md flex flex-col justify-between"
                        >
                          <img
                            src={shot}
                            alt={`App Screenshot ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/zuzustore-logo.png';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/50 opacity-90 group-hover:opacity-100 transition-opacity" />

                          {/* Top Badges & Remove */}
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${
                                idx === 0
                                  ? 'bg-cyan-500/90 text-neutral-950 shadow-sm'
                                  : 'bg-black/75 text-neutral-200 border border-neutral-700/60'
                              }`}
                            >
                              {idx === 0 ? '★ Primary Cover' : `#${idx + 1}`}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveScreenshot(idx);
                              }}
                              className="p-1 rounded-full bg-black/70 hover:bg-rose-600 text-neutral-300 hover:text-white transition-colors"
                              title="Delete screenshot"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Bottom Action Controls (Reorder & Preview) */}
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveScreenshot(idx, idx - 1);
                                }}
                                className="p-1 rounded-lg bg-black/70 hover:bg-neutral-800 disabled:opacity-30 text-white transition-colors border border-neutral-700/60"
                                title="Move Left"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === screenshots.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveScreenshot(idx, idx + 1);
                                }}
                                className="p-1 rounded-lg bg-black/70 hover:bg-neutral-800 disabled:opacity-30 text-white transition-colors border border-neutral-700/60"
                                title="Move Right"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPublisherLightboxUrl(shot);
                              }}
                              className="p-1 px-1.5 rounded-lg bg-black/70 hover:bg-cyan-950 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 border border-cyan-800/60 transition-colors"
                              title="View full image"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Enlarge</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-neutral-950/40 border border-neutral-800/80 rounded-2xl text-center text-xs text-neutral-400 space-y-1">
                    <p className="font-medium text-neutral-300">No screenshots added yet.</p>
                    <p className="text-[11px] text-neutral-400">
                      Click <strong className="text-cyan-400">"Upload Screenshots"</strong> or <strong className="text-amber-400">"Load 4 Sample Screenshots"</strong> above to showcase your application before publishing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: UPDATE EXISTING APP */}
      {activeTab === 'update-existing' && (
        apps.length === 0 ? (
          <div className="p-10 text-center bg-neutral-900/50 border border-neutral-800 rounded-3xl space-y-3">
            <Layers className="w-10 h-10 text-neutral-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Published Applications Yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t published any apps yet. Please use the &quot;Upload New APK&quot; tab to publish your first application before adding new versions.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload-new')}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New APK</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitUpdateRelease} className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-5">
              <h3 className="text-base font-bold text-white">Publish New Version / APK Update</h3>
              <p className="text-xs text-neutral-400">
                Upload an updated APK binary package with release notes for an existing application.
              </p>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Select App to Update</label>
                <select
                  value={selectedExistingAppId || apps[0]?.id}
                  onChange={(e) => setSelectedExistingAppId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name} (Current: v{app.currentVersion})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">New Version *</label>
                  <input
                    type="text"
                    required
                    value={updateVersion}
                    onChange={(e) => setUpdateVersion(e.target.value)}
                    placeholder="e.g., 1.1.0"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1 flex items-center justify-between">
                    <span>Target Platform</span>
                    {(updatePlatform === 'Android TV' || updatePlatform === 'Fire TV') && (
                      <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                        TV 10-ft Leanback
                      </span>
                    )}
                  </label>
                  <select
                    value={updatePlatform}
                    onChange={(e) => {
                      const val = e.target.value as Platform;
                      setUpdatePlatform(val);
                      if (val === 'Android TV') {
                        if (updateMinOS === 'Android 9.0+' || !updateMinOS) setUpdateMinOS('Android TV 8.0+ / Google TV');
                      } else if (val === 'Fire TV') {
                        if (updateMinOS === 'Android 9.0+' || !updateMinOS) setUpdateMinOS('Fire OS 7.0+ (Android 9+)');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Android">Android Phone & Tablet (.apk)</option>
                    <option value="Android TV">Android TV / Google TV (.apk)</option>
                    <option value="Fire TV">Amazon Fire TV / Fire Stick (.apk)</option>
                    <option value="Windows">Windows (.exe)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  New APK Binary (Supports at least 1GB - up to 2GB)
                </label>
                <input
                  ref={updateFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".apk,.aab,.exe,.zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUpdateFile(e.target.files[0]);
                    }
                  }}
                />
                <div
                  onClick={() => updateFileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-neutral-800 hover:border-cyan-500 rounded-xl text-center cursor-pointer bg-neutral-950"
                >
                  {updateFile ? (
                    <div className="text-xs text-emerald-400">
                      <span className="font-semibold">{updateFile.name}</span> ({(updateFile.size / (1024 * 1024)).toFixed(2)} MB • Ready)
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400">
                      Click to select new APK file for this update (Supports at least 1GB - up to 2GB)
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 my-2.5 text-xs text-neutral-500">
                  <div className="flex-1 h-px bg-neutral-800" />
                  <span>OR DIRECT DOWNLOAD LINK</span>
                  <div className="flex-1 h-px bg-neutral-800" />
                </div>

                <div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={updateDirectUrl}
                      onChange={(e) => {
                        setUpdateDirectUrl(e.target.value);
                        setUpdateLinkVerifyResult(null);
                      }}
                      placeholder="https://drive.google.com/file/d/... or GitHub Releases direct link"
                      className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-cyan-500"
                    />
                    {updateDirectUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => handleTestLinkAccess(updateDirectUrl, true)}
                        disabled={isVerifyingUpdateLink}
                        className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-300 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 border border-neutral-700"
                        title="Verify this link allows public downloads without 403 errors"
                      >
                        {isVerifyingUpdateLink ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3" />
                            <span>Test Access</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {updateDirectUrl.trim() && isGoogleDrive(updateDirectUrl) && (
                    <div className="mt-2.5 p-3 bg-amber-950/30 border border-amber-900/60 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Avoid 403 Error: Ensure Google Drive File is Public</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        In Google Drive, ensure General Access is set to <strong className="text-white">"Anyone with the link"</strong> (Viewer). If left Restricted, users will receive a 403 permission error.
                      </p>

                      {updateLinkVerifyResult && (
                        <div
                          className={`p-2 rounded-lg text-[11px] flex items-start gap-2 mt-1.5 ${
                            updateLinkVerifyResult.accessible
                              ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                              : 'bg-rose-950/80 border border-rose-700 text-rose-300'
                          }`}
                        >
                          {updateLinkVerifyResult.accessible ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <p className="font-semibold">{updateLinkVerifyResult.message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Changelog / Release Notes</label>
                <textarea
                  rows={3}
                  required
                  value={updateChangelog}
                  onChange={(e) => setUpdateChangelog(e.target.value)}
                  placeholder="Describe bug fixes and new additions..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-75 cursor-pointer"
              >
                {isSubmitting ? 'Deploying...' : 'Deploy Update'}
              </button>
            </div>
          </form>
        )
      )}

      {/* TAB 3: MANAGE LIVE CATALOG */}
      {activeTab === 'manage' && (() => {
        const phoneApps = filterPhoneApps(apps);
        const smartTvApps = filterTvApps(apps);
        const displayedApps = catalogFilter === 'phone' ? phoneApps : catalogFilter === 'tv' ? smartTvApps : apps;

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Live Store Catalog ({apps.length} {apps.length === 1 ? 'App' : 'Apps'})</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Manage live packages published to the Android App store and the Smart TV page.</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('god-mode');
                    setTimeout(() => {
                      const el = document.getElementById('curation-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="Rank which apps appear on top of one another in For You"
                >
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span>Curate &amp; Reorder &quot;For You&quot;</span>
                </button>
                {apps.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all store apps from catalog?')) {
                        onResetCatalog();
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-rose-400 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Clear all apps from catalog"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Clear Catalog</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs: All | Android App | Smart TV */}
            {apps.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-900/80 border border-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCatalogFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    catalogFilter === 'all'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  All Applications ({apps.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('phone')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    catalogFilter === 'phone'
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/60 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Android Apps ({phoneApps.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter('tv')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    catalogFilter === 'tv'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Smart TV Apps ({smartTvApps.length})</span>
                </button>
              </div>
            )}

            {displayedApps.length === 0 ? (
              <div className="p-12 text-center bg-neutral-900/40 border border-dashed border-neutral-800 rounded-3xl space-y-3">
                <FolderArchive className="w-10 h-10 text-neutral-500 mx-auto" />
                <h4 className="text-base font-bold text-white">No Applications Found in this Filter</h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                  {catalogFilter === 'tv'
                    ? 'No Smart TV apps published yet. Switch to "Upload New APK" and choose "Smart TV App" to post your TV build.'
                    : 'Your store catalog has no applications matching this criteria.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (catalogFilter === 'tv') {
                        setTargetEdition('tv');
                        setAppPlatform('Android TV');
                        setAppCategory('Smart TV');
                      }
                      setActiveTab('upload-new');
                    }}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload {catalogFilter === 'tv' ? 'Smart TV' : 'New'} APK</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {displayedApps.map((app) => {
                  const isTv = isTvApp(app);
                  const isPhone = isPhoneApp(app);

                  return (
                    <React.Fragment key={app.id}>
                      <div
                        className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                      <div className="flex items-center gap-4">
                        <img
                          src={app.iconUrl}
                          alt={app.name}
                          className="w-14 h-14 rounded-xl object-contain border border-neutral-800 shrink-0 bg-neutral-950 p-1"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/zuzustore-logo.png';
                          }}
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold text-white">{app.name}</h4>
                            {isTv && isPhone ? (
                              <span className="text-[10px] text-amber-300 font-semibold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60 flex items-center gap-1.5">
                                <Smartphone className="w-3 h-3 text-indigo-400" />
                                <span className="text-neutral-500">•</span>
                                <Tv className="w-3 h-3 text-cyan-400" />
                                <span>Phone &amp; Smart TV Pages</span>
                              </span>
                            ) : isTv ? (
                              <span className="text-[10px] text-cyan-300 font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/60 flex items-center gap-1">
                                <Tv className="w-3 h-3 text-cyan-400" />
                                <span>Smart TV Page Only</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/60 flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-indigo-400" />
                                <span>Android Phone Store Only</span>
                              </span>
                            )}
                            {app.isOfficial && (
                              <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                                Verified
                              </span>
                            )}
                            {app.isTakenDown && (
                              <span className="text-[10px] text-red-400 font-bold bg-red-950/90 px-2 py-0.5 rounded border border-red-800/80 flex items-center gap-1 animate-pulse">
                                <EyeOff className="w-3 h-3 text-red-400" />
                                <span>Taken Down from Store</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 line-clamp-1">{app.tagline}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mt-1">
                        <span>v{app.currentVersion}</span>
                        <span>•</span>
                        <span>{app.releases.length} releases</span>
                        <span>•</span>
                        <span className="tabular-nums font-mono text-cyan-400 font-medium">
                          {app.downloadsTotal.toLocaleString()} downloads
                        </span>
                        <span>•</span>
                        <span className="text-[11px] text-amber-300/90 font-medium">
                          Owner: {app.submittedBy?.name || app.developer?.name || 'ZuzuStore Official'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setExpandedReleasesAppId(expandedReleasesAppId === app.id ? null : app.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                        expandedReleasesAppId === app.id
                          ? 'bg-neutral-700 text-white border border-neutral-600'
                          : 'text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80'
                      }`}
                      title="View and manage individual version releases"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Versions ({app.releases?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingScreenshotsApp(app);
                        setEditingScreenshotsList(app.screenshots && app.screenshots.length > 0 ? app.screenshots : []);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Add or update screenshots for this app"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Screenshots ({app.screenshots?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => onDownloadTest(app.id, app.releases[0]?.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Download the latest package as a tester"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Test Download</span>
                    </button>

                    {/* God Mode: Soft Takedown vs Restore */}
                    {app.isTakenDown ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreApp(app.id)}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Restore app back to the public storefront"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Restore Live</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTakedownAppModal(app);
                          setTakedownReasonInput('');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Soft unpublish: remove from public store without deleting file"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                        <span>Take Down</span>
                      </button>
                    )}

                    {/* God Mode: Super Admin Ownership Transfer */}
                    <button
                      type="button"
                      onClick={() => openTransferOwnershipModal(app)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/50 hover:bg-indigo-900/70 border border-indigo-800/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Transfer app ownership to any registered user or Store Admin"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Transfer Owner</span>
                    </button>

                    {/* God Mode: Super Admin Metadata Override */}
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideAppModal(app);
                        setOverrideFormData({
                          name: app.name,
                          tagline: app.tagline || '',
                          description: app.description || '',
                          category: app.category || 'Utilities',
                          directDownloadUrl: app.releases?.[0]?.directDownloadUrl || '',
                          iconUrl: app.iconUrl || ''
                        });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Direct Super Admin metadata override"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Override</span>
                    </button>

                    <button
                      onClick={() => onViewAppInStore(app)}
                      className="px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View in Store</span>
                    </button>

                    <button
                      onClick={() => setAppToDelete(app)}
                      className="p-2 text-neutral-400 hover:text-rose-400 bg-neutral-800/50 hover:bg-rose-950/40 rounded-lg transition-colors border border-neutral-700/50 cursor-pointer"
                      title="Delete app permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expandable Version / Releases Management Drawer */}
                {expandedReleasesAppId === app.id && (
                  <div className="-mt-2 mb-2 p-4 bg-neutral-950/90 border-x border-b border-neutral-800/80 rounded-b-2xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800/70">
                      <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Published Versions for {app.name}</span>
                      </span>
                      <span className="text-neutral-500 text-[11px]">
                        {app.releases?.length || 0} active {app.releases?.length === 1 ? 'version' : 'versions'}
                      </span>
                    </div>

                    {!app.releases || app.releases.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic py-2">No version releases found for this application.</p>
                    ) : (
                      <div className="space-y-2">
                        {app.releases.map((rel) => (
                          <div
                            key={rel.id}
                            className="p-3 bg-neutral-900/80 border border-neutral-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                                  v{rel.version}
                                </span>
                                <span className="text-neutral-500">•</span>
                                <span className="text-cyan-400 font-medium">{rel.platform}</span>
                                <span className="text-neutral-500">•</span>
                                <span className="text-neutral-400">{rel.fileSize}</span>
                                <span className="text-neutral-500">•</span>
                                <span className="text-neutral-400 font-mono">{(rel.downloadCount || 0).toLocaleString()} dl</span>
                              </div>
                              <p className="text-[11px] text-neutral-400 font-mono truncate max-w-md">
                                {rel.fileName} {rel.releaseDate ? `(${rel.releaseDate})` : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => onDownloadTest(app.id, rel.id)}
                                className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Download and verify this version package"
                              >
                                <Download className="w-3 h-3 text-cyan-400" />
                                <span>Download</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setReleaseToDelete({ app, releaseId: rel.id, version: rel.version, fileName: rel.fileName })}
                                className="px-2.5 py-1 text-xs text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title={`Delete version ${rel.version} permanently`}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete Version</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
        </div>
      );
    })()}

      {/* TAB 4: DEVELOPER SUBMISSIONS REVIEW QUEUE */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Developer Submissions Review Queue</h3>
                {pendingSubmissions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-black animate-pulse">
                    {pendingSubmissions.length} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Review APK packages submitted by developers. Test APKs, verify details, and approve to publish them live on the public storefront.
              </p>
            </div>
            <button
              onClick={loadPending}
              disabled={isLoadingSubmissions}
              className="px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubmissions ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {isLoadingSubmissions ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 mt-3">Loading developer submissions...</p>
            </div>
          ) : pendingSubmissions.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto text-emerald-400">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Review Queue is Clear!</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                There are no pending developer submissions awaiting review. When third-party developers submit apps, they will appear here for your approval.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingSubmissions.map((subApp) => {
                const release = subApp.releases?.[0];
                const isReviewingThis = reviewingAppId === subApp.id;

                return (
                  <div
                    key={subApp.id}
                    className="bg-neutral-900 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 relative overflow-hidden"
                  >
                    {/* Top Accent Ribbon */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

                    {/* Developer Info Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                          DEV
                        </div>
                        <span className="text-neutral-400">Submitted by:</span>
                        <strong className="text-white">
                          {subApp.submittedBy?.name || subApp.developer.name}
                        </strong>
                        <span className="text-neutral-500 font-mono text-[11px]">
                          ({subApp.submittedBy?.email || subApp.developer.email})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {subApp.submittedAt
                            ? new Date(subApp.submittedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* App Overview */}
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <img
                        src={subApp.iconUrl || '/zuzustore-logo.png'}
                        alt={subApp.name}
                        className="w-16 h-16 rounded-2xl object-cover bg-neutral-950 border border-neutral-800 p-1 shrink-0 shadow-md"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/zuzustore-logo.png';
                        }}
                      />
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-black text-white">{subApp.name}</h4>
                          <span className="px-2 py-0.5 rounded-md bg-neutral-950 text-neutral-300 border border-neutral-800 font-mono text-xs">
                            v{subApp.currentVersion}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                            {subApp.appEdition === 'tv' ? 'Smart TV Edition' : 'Phone Edition'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-xs">
                            {subApp.category}
                          </span>
                        </div>

                        {/* Brief Info */}
                        <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/60 text-xs">
                          <span className="text-amber-400 font-bold">Brief Info: </span>
                          <span className="text-neutral-200">{subApp.tagline}</span>
                        </div>

                        {subApp.description && subApp.description !== subApp.tagline && (
                          <p className="text-xs text-neutral-400 leading-relaxed pt-1">
                            {subApp.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 font-mono pt-1">
                          <span>Package: {subApp.packageId}</span>
                          <span>•</span>
                          <span>OS: {subApp.minRequirements?.Android || 'Android 8.0+'}</span>
                          {release?.fileSize && (
                            <>
                              <span>•</span>
                              <span>Size: {release.fileSize}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Screenshots Gallery */}
                    {subApp.screenshots && subApp.screenshots.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          Submitted Screenshots ({subApp.screenshots.length}):
                        </label>
                        <div className="flex gap-2.5 overflow-x-auto pb-2">
                          {subApp.screenshots.map((s, idx) => (
                            <img
                              key={idx}
                              src={s}
                              alt={`Screenshot ${idx + 1}`}
                              onClick={() => setPublisherLightboxUrl(s)}
                              className="h-28 w-auto rounded-xl border border-neutral-800 object-cover cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons: Test APK, Approve, Reject */}
                    <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onDownloadTest(subApp.id, release?.id, subApp)}
                          className="py-2 px-3.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Test Download APK</span>
                        </button>
                        {release?.directDownloadUrl && (
                          <a
                            href={release.directDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 text-neutral-400 hover:text-cyan-400 text-xs flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>External Link</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={isReviewingThis}
                          onClick={() => {
                            setRejectModalApp(subApp);
                            setRejectReasonText('');
                          }}
                          className="py-2.5 px-4 bg-neutral-950 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-rose-900/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject with Notes</span>
                        </button>

                        <button
                          type="button"
                          disabled={isReviewingThis}
                          onClick={() => handleApprove(subApp.id)}
                          className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isReviewingThis ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>Approve & Publish to Store</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SUPER ADMIN GOD MODE & DEVELOPER CONTROL */}
      {activeTab === 'god-mode' && (
        <div className="space-y-8 animate-fade-in">
          {/* God Mode Authority Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-neutral-900 via-amber-950/20 to-neutral-900 border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 shadow-lg shadow-amber-500/30 shrink-0">
                  <Crown className="w-6 h-6 fill-neutral-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Super Admin God Mode
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-neutral-950 rounded-full shadow">
                      Master Control
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Authority over developer accounts, soft takedowns, metadata overrides, and live broadcast banners.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    loadDevelopers();
                    loadBroadcastData();
                  }}
                  disabled={isLoadingDevelopers}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900/90 border border-neutral-700/80 rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevelopers ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Refresh Registry</span>
                </button>
              </div>
            </div>

            {/* Platform Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-neutral-800/80">
              <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                <div className="text-[11px] font-medium text-neutral-400">Total Developers</div>
                <div className="text-xl font-black text-white mt-1 tabular-nums">
                  {developers.length}
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-xl">
                <div className="text-[11px] font-medium text-emerald-400">Active Developers</div>
                <div className="text-xl font-black text-emerald-300 mt-1 tabular-nums">
                  {developers.filter((d) => d.status === 'active' || !d.status).length}
                </div>
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-900/40 rounded-xl">
                <div className="text-[11px] font-medium text-cyan-400">Frozen Accounts</div>
                <div className="text-xl font-black text-cyan-300 mt-1 tabular-nums">
                  {developers.filter((d) => d.status === 'frozen').length}
                </div>
              </div>

              <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl">
                <div className="text-[11px] font-medium text-rose-400">Banned Accounts</div>
                <div className="text-xl font-black text-rose-300 mt-1 tabular-nums">
                  {developers.filter((d) => d.status === 'banned').length}
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-900/40 rounded-xl col-span-2 sm:col-span-1">
                <div className="text-[11px] font-medium text-amber-400">Store Takedowns</div>
                <div className="text-xl font-black text-amber-300 mt-1 tabular-nums">
                  {apps.filter((a) => a.isTakenDown).length}
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast Banner Toast Notification */}
          {broadcastToast && (
            <div className="p-4 bg-amber-950/50 border border-amber-700/60 rounded-2xl text-xs text-amber-200 flex items-center justify-between shadow-lg animate-fade-in">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{broadcastToast}</span>
              </div>
              <button onClick={() => setBroadcastToast(null)} className="text-amber-400 hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {/* SUB-PANEL 1: SYSTEM BROADCAST CONSOLE */}
          <div className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live System Broadcast Banner</h3>
                  <p className="text-xs text-neutral-400">
                    Send platform-wide announcements to all developer consoles and storefront visitors in real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-300 cursor-pointer">
                  <span>Banner Active:</span>
                  <input
                    type="checkbox"
                    checked={broadcast.active}
                    onChange={(e) => setBroadcast((prev) => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Announcement Message
                  </label>
                  <textarea
                    rows={2}
                    value={broadcast.message}
                    onChange={(e) => setBroadcast((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="e.g. Scheduled store maintenance tonight at 02:00 UTC. APK publishing will be paused."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Optional Action URL
                    </label>
                    <input
                      type="text"
                      value={broadcast.link || ''}
                      onChange={(e) => setBroadcast((prev) => ({ ...prev, link: e.target.value }))}
                      placeholder="e.g. /#faq or https://..."
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Button / Link Label
                    </label>
                    <input
                      type="text"
                      value={broadcast.linkText || ''}
                      onChange={(e) => setBroadcast((prev) => ({ ...prev, linkText: e.target.value }))}
                      placeholder="e.g. Learn More"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Broadcast Severity Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBroadcast((prev) => ({ ...prev, level: 'info' }))}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        broadcast.level === 'info'
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      <span>Info (Cyan)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcast((prev) => ({ ...prev, level: 'warning' }))}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        broadcast.level === 'warning'
                          ? 'bg-amber-950 text-amber-300 border-amber-600'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      <span>Warning (Amber)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcast((prev) => ({ ...prev, level: 'alert' }))}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        broadcast.level === 'alert'
                          ? 'bg-rose-950 text-rose-300 border-rose-600'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      <span>Alert (Red)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="md:col-span-4 flex flex-col justify-between p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Live Banner Preview
                  </div>
                  {broadcast.active ? (
                    <div
                      className={`p-3 rounded-xl border text-xs flex flex-col gap-2 ${
                        broadcast.level === 'alert'
                          ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                          : broadcast.level === 'warning'
                          ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                          : 'bg-cyan-950/60 border-cyan-800 text-cyan-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Megaphone className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="leading-snug">{broadcast.message || 'No broadcast message written yet.'}</span>
                      </div>
                      {broadcast.linkText && (
                        <span className="font-bold underline text-[11px] self-end cursor-pointer">
                          {broadcast.linkText} →
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-neutral-800 text-neutral-500 text-xs text-center italic">
                      Banner is currently turned OFF.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSavingBroadcast}
                  onClick={handleSaveBroadcast}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isSavingBroadcast ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Save &amp; Broadcast Announcement</span>
                </button>
              </div>
            </div>
          </div>

          {/* SUB-PANEL 2: DEVELOPER MASTER ROSTER & CONTROLS */}
          <div className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Registered Developer Directory</h3>
                  <span className="text-xs text-neutral-500 font-mono">({developers.length} total)</span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Full authority to inspect apps, freeze publishing actions, ban accounts, or delete developers.
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                {(['all', 'active', 'frozen', 'banned'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setDevFilterStatus(st)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                      devFilterStatus === st
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={devSearchTerm}
                onChange={(e) => setDevSearchTerm(e.target.value)}
                placeholder="Search developers by name, email, or company name..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>

            {/* Developers Table / Cards */}
            {isLoadingDevelopers ? (
              <div className="py-12 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Loading developer accounts...</span>
              </div>
            ) : developers.length === 0 ? (
              <div className="p-10 text-center bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <User className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-400 font-medium">No developer accounts registered yet.</p>
                <p className="text-[11px] text-neutral-500">
                  When developers create accounts via the Developer Portal, they will appear here with full controls.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {developers
                  .filter((d) => {
                    if (devFilterStatus !== 'all' && (d.status || 'active') !== devFilterStatus) {
                      return false;
                    }
                    if (!devSearchTerm.trim()) return true;
                    const q = devSearchTerm.toLowerCase();
                    return (
                      d.name.toLowerCase().includes(q) ||
                      d.email.toLowerCase().includes(q) ||
                      (d.companyName && d.companyName.toLowerCase().includes(q))
                    );
                  })
                  .map((dev) => {
                    const status = dev.status || 'active';

                    return (
                      <div
                        key={dev.id}
                        className="p-4 bg-neutral-950/80 border border-neutral-800/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-700/80 transition-colors"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/60 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {dev.name.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{dev.name}</h4>
                              {dev.companyName && (
                                <span className="text-[11px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                  {dev.companyName}
                                </span>
                              )}

                              {/* Status Badge */}
                              {status === 'active' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>Active</span>
                                </span>
                              )}
                              {status === 'frozen' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 flex items-center gap-1">
                                  <Snowflake className="w-2.5 h-2.5" />
                                  <span>Frozen (Publish Disabled)</span>
                                </span>
                              )}
                              {status === 'banned' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-950/80 text-rose-400 border border-rose-800 flex items-center gap-1">
                                  <Ban className="w-2.5 h-2.5" />
                                  <span>Banned</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
                              <span>{dev.email}</span>
                              <span>•</span>
                              <span>Joined: {new Date(dev.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">{dev.appsCount || 0} Apps Submitted</span>
                              <span>•</span>
                              <span className="text-cyan-400 font-bold">{(dev.totalDownloads || 0).toLocaleString()} Downloads</span>
                            </div>

                            {/* Ban or Freeze reason display */}
                            {dev.banReason && (
                              <div className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-900/50 p-2 rounded-xl mt-1">
                                <strong>Admin Note:</strong> {dev.banReason}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Developer Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0">
                          {/* Inspect Apps */}
                          <button
                            type="button"
                            onClick={() => handleOpenInspectDev(dev)}
                            className="px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Inspect Apps ({dev.appsCount || 0})</span>
                          </button>

                          {/* Freeze / Unfreeze */}
                          {status === 'frozen' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setStatusModalDev(dev);
                                setNewStatusChoice('active');
                                setStatusReasonInput('');
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Unfreeze</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setStatusModalDev(dev);
                                setNewStatusChoice('frozen');
                                setStatusReasonInput('Publishing temporarily frozen for administrative review.');
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Snowflake className="w-3.5 h-3.5" />
                              <span>Freeze</span>
                            </button>
                          )}

                          {/* Ban / Unban */}
                          {status === 'banned' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setStatusModalDev(dev);
                                setNewStatusChoice('active');
                                setStatusReasonInput('');
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Unban</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setStatusModalDev(dev);
                                setNewStatusChoice('banned');
                                setStatusReasonInput('Account banned due to violation of platform policy.');
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Ban</span>
                            </button>
                          )}

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => setDeleteDevModal(dev)}
                            className="p-2 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-rose-950/40 border border-neutral-800 hover:border-rose-800 rounded-xl transition-colors cursor-pointer"
                            title="Delete Developer Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* SUB-PANEL 2.5: APP OWNERSHIP & TRANSFER CONTROL */}
          <div className="p-5 sm:p-6 bg-neutral-900/60 border border-neutral-800 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white">App Ownership &amp; Transfer Control</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                      {apps.length} Catalog Apps
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Reassign any app&apos;s console access, future earnings, and developer attribution to any registered user or Store Admin.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ownershipSearchTerm}
                onChange={(e) => setOwnershipSearchTerm(e.target.value)}
                placeholder="Search apps by app name, package ID, or current owner email..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {apps
                .filter((a) => {
                  if (!ownershipSearchTerm.trim()) return true;
                  const q = ownershipSearchTerm.toLowerCase();
                  const ownerName = (a.submittedBy?.name || a.developer?.name || '').toLowerCase();
                  const ownerEmail = (a.submittedBy?.email || a.developer?.email || '').toLowerCase();
                  return (
                    a.name.toLowerCase().includes(q) ||
                    a.packageId.toLowerCase().includes(q) ||
                    ownerName.includes(q) ||
                    ownerEmail.includes(q)
                  );
                })
                .map((app) => {
                  const ownerName = app.submittedBy?.name || app.developer?.name || 'ZuzuStore Official';
                  const ownerEmail = app.submittedBy?.email || app.developer?.email || 'sseruwagijohn452@gmail.com';
                  const isAdminOwned = !app.submittedBy?.id || app.submittedBy.id === 'admin';
                  const transferCount = app.ownershipHistory?.length || 0;

                  return (
                    <div
                      key={app.id}
                      className="p-3.5 bg-neutral-950/90 border border-neutral-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={app.iconUrl || '/zuzustore-logo.png'}
                          alt={app.name}
                          className="w-11 h-11 rounded-xl object-contain border border-neutral-800 bg-neutral-900 p-1 shrink-0"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/zuzustore-logo.png';
                          }}
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-white truncate">{app.name}</h4>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                isAdminOwned
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
                                  : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/70'
                              }`}
                            >
                              {isAdminOwned ? 'Store Admin' : 'Developer'}
                            </span>
                            {transferCount > 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-900 text-neutral-300 border border-neutral-700 flex items-center gap-1">
                                <History className="w-2.5 h-2.5 text-indigo-400" />
                                <span>{transferCount} {transferCount === 1 ? 'Transfer' : 'Transfers'}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-300 truncate">
                            Owner: <strong className="text-white">{ownerName}</strong>{' '}
                            <span className="text-neutral-500 font-mono">({ownerEmail})</span>
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono truncate">
                            {app.packageId} • v{app.currentVersion}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openTransferOwnershipModal(app)}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer shadow-md shadow-indigo-950/40"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Transfer Ownership</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* SUB-PANEL 3: STORE TAKEDOWNS & CENSORSHIP REGISTRY */}
          <div className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-3xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-4">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Store Takedown Registry</h3>
                <p className="text-xs text-neutral-400">
                  Applications currently unpublished from the public storefront by Super Admin.
                </p>
              </div>
            </div>

            {apps.filter((a) => a.isTakenDown).length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-950 rounded-2xl border border-neutral-800">
                No apps are currently taken down. All approved applications are live and downloadable.
              </div>
            ) : (
              <div className="space-y-3">
                {apps
                  .filter((a) => a.isTakenDown)
                  .map((takenApp) => (
                    <div
                      key={takenApp.id}
                      className="p-4 bg-neutral-950 border border-rose-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={takenApp.iconUrl}
                          alt={takenApp.name}
                          className="w-12 h-12 rounded-xl object-contain border border-neutral-800 bg-neutral-900 p-1"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{takenApp.name}</h4>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-950 text-rose-400 border border-rose-800">
                              Taken Down
                            </span>
                          </div>
                          <p className="text-xs text-rose-300">
                            <strong>Reason:</strong> {takenApp.takedownReason || 'Taken down by Super Admin'}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            Package: {takenApp.packageId} • Taken Down By: {takenApp.takenDownBy || 'Super Admin'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleRestoreApp(takenApp.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Restore to Live Store</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppToDelete(takenApp)}
                          className="p-2 text-rose-400 bg-neutral-900 hover:bg-rose-950/60 border border-rose-900/60 rounded-xl transition-colors cursor-pointer"
                          title="Permanently Delete App"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* SUB-PANEL 4: STOREFRONT & "FOR YOU" VISUAL CURATION & RANKING */}
          <div id="curation-section" className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Storefront &amp; &quot;For You&quot; App Ranking</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      Visual Curation
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Select which app appears on top of another in &quot;For You&quot;, and pick the #1 app to headline the homepage Hero banner.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSaveStorefrontOrder}
                  disabled={isSavingOrder || !hasOrderChanges}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                    hasOrderChanges
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 shadow-amber-500/30 animate-pulse'
                      : 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {isSavingOrder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Order...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{hasOrderChanges ? 'Quick Save & Publish Order' : 'Storefront Order Saved'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notification Toast */}
            {orderToast && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-700/60 rounded-2xl text-xs text-emerald-200 flex items-center justify-between shadow-lg animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{orderToast}</span>
                </div>
                <button onClick={() => setOrderToast(null)} className="text-emerald-400 hover:underline text-[11px] font-semibold">
                  Dismiss
                </button>
              </div>
            )}

            {/* Explanation Guide Bar */}
            <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-xs text-neutral-300 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  <strong className="text-white font-semibold">How For You Ranking Works:</strong> The app at <strong className="text-amber-400">Position #1</strong> is automatically featured in the homepage <strong className="text-white">Hero Spotlight Banner</strong> and placed first in the <strong className="text-white">Recommended For You</strong> shelf.
                </p>
                <p className="text-[11px] text-neutral-400">
                  Use the <strong className="text-neutral-200">Move Up (↑)</strong> and <strong className="text-neutral-200">Move Down (↓)</strong> buttons on any app to reorder apps above or below one another, or click <strong className="text-amber-300">&quot;Make #1 Spotlight&quot;</strong> to immediately jump an app to the top. Then click <strong className="text-white">&quot;Quick Save &amp; Publish Order&quot;</strong> to sync instantly across all visitors and cloud Firestore.
                </p>
              </div>
            </div>

            {/* Curated Apps List */}
            {curatedApps.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-950 rounded-2xl border border-neutral-800">
                No Android phone applications available to rank. Publish or approve applications first.
              </div>
            ) : (
              <div className="space-y-2.5">
                {curatedApps.map((app, index) => {
                  const isHero = index === 0;
                  const devName = app.submittedBy?.name || app.developer?.name || 'Publisher';

                  return (
                    <div
                      key={app.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 ${
                        isHero
                          ? 'bg-gradient-to-r from-amber-950/40 via-neutral-950 to-neutral-950 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                          : 'bg-neutral-950 hover:bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
                      }`}
                    >
                      {/* Left: Position Rank & App Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Position Number Badge */}
                        <div
                          className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black shrink-0 ${
                            isHero
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20'
                              : 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                          }`}
                        >
                          {isHero ? (
                            <>
                              <Crown className="w-3.5 h-3.5 fill-neutral-950" />
                              <span className="text-[11px] leading-none">#1</span>
                            </>
                          ) : (
                            <span className="text-xs">#{index + 1}</span>
                          )}
                        </div>

                        {/* App Icon */}
                        <img
                          src={app.iconUrl || '/zuzustore-logo.png'}
                          alt={app.name}
                          className="w-11 h-11 rounded-xl object-contain border border-neutral-800 bg-neutral-900 p-1 shrink-0"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/zuzustore-logo.png';
                          }}
                        />

                        {/* App Details */}
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">{app.name}</h4>
                            {isHero && (
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-neutral-950 rounded-full shadow">
                                ★ Hero Spotlight &amp; Top of For You
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
                              {app.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {app.tagline || app.description}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-mono">
                            Developer: {devName} • Package: {app.packageId} • Downloads: {(app.downloadsTotal || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Right: Reordering Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {/* Make #1 Spotlight Button */}
                        {!isHero && (
                          <button
                            type="button"
                            onClick={() => handleMakeHeroSpotlight(index)}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Make this app #1 Hero Spotlight and Top of For You"
                          >
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Make #1 Spotlight</span>
                          </button>
                        )}

                        {/* Move Up Button */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveAppUp(index)}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                            index === 0
                              ? 'opacity-30 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-600'
                              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-white hover:text-amber-300 active:scale-95'
                          }`}
                          title="Move app up one position (place on top)"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        {/* Move Down Button */}
                        <button
                          type="button"
                          disabled={index === curatedApps.length - 1}
                          onClick={() => handleMoveAppDown(index)}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                            index === curatedApps.length - 1
                              ? 'opacity-30 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-600'
                              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-white hover:text-amber-300 active:scale-95'
                          }`}
                          title="Move app down one position"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* View in Store */}
                        <button
                          type="button"
                          onClick={() => onViewAppInStore(app)}
                          className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors cursor-pointer"
                          title="Preview in Store"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SUB-PANEL 5: FINANCIAL OPERATIONS, 6% STORE COMMISSION & DEVELOPER PAYOUTS */}
          <div id="financials-section" className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Financial Operations &amp; 6% Super Admin Commission</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      John Sseruwagi (Admin Mode)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Real sales revenue, 6% platform commission earnings, and 1-click developer payout approvals.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={loadFinancials}
                  disabled={isLoadingFinancials}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700/80 rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFinancials ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Refresh Financials</span>
                </button>
              </div>
            </div>

            {/* LivePay Gateway Status Card */}
            <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900/90 to-neutral-950 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">LivePay Uganda Gateway</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        Connected &amp; Active
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Account: <strong className="font-mono text-amber-300">LP260805074398</strong> • Rails: MTN Mobile Money &amp; Airtel Money (UGX)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePingLivePay}
                    disabled={isPingingLivePay}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-amber-200 border border-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPingingLivePay ? 'animate-spin' : ''}`} />
                    <span>{isPingingLivePay ? 'Testing API...' : 'Test LivePay Connection'}</span>
                  </button>
                </div>
              </div>

              {livepayPingResult && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{livepayPingResult}</span>
                </div>
              )}

              {/* Webhook Endpoint Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                <div className="text-neutral-400 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Configured Webhook URL:</span>
                  <code className="text-amber-400 font-mono text-[10px] bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/livepay` : '/api/webhooks/livepay'}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/api/webhooks/livepay`;
                    navigator.clipboard.writeText(url);
                    setLivepayCopyToast(true);
                    setTimeout(() => setLivepayCopyToast(false), 3000);
                  }}
                  className="text-xs text-neutral-300 hover:text-white font-medium self-start sm:self-auto cursor-pointer"
                >
                  {livepayCopyToast ? '✓ Copied URL' : 'Copy Webhook URL'}
                </button>
              </div>
            </div>

            {/* COMMISSION RATE CONFIGURATION CARD (Configurable % and 100/1000 Sending Fee) */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-neutral-950 via-amber-950/20 to-neutral-950 border border-amber-500/40 rounded-2xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    <Percent className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">Super Admin Commission Percentage</h4>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                        Current Rate: {commissionPercentInput}%
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Set your exact cut on every app sold. Also configures the mobile money sending network charge (100 UGX per 1,000 UGX).
                    </p>
                  </div>
                </div>

                {commissionToast && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-fade-in self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{commissionToast}</span>
                  </div>
                )}
              </div>

              {/* Commission Editor Form & Quick Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-800/80">
                {/* Commission % Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                    <span>Admin Commission Percentage (0% - 100%)</span>
                    <span className="text-amber-400 font-mono font-bold text-xs">{commissionPercentInput}%</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={commissionPercentInput}
                        onChange={(e) => setCommissionPercentInput(e.target.value)}
                        placeholder="e.g. 6"
                        className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-amber-400 rounded-xl text-sm font-bold text-white outline-hidden pr-8 font-mono"
                      />
                      <span className="absolute right-3 top-2.5 text-neutral-400 font-bold text-sm">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveCommissionRate()}
                      disabled={isSavingCommission}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-neutral-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSavingCommission ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Save Rate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick percentage chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-neutral-400 font-medium mr-1">Quick Select:</span>
                    {[3, 5, 6, 8, 10, 12, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setCommissionPercentInput(String(pct));
                          handleSaveCommissionRate(pct);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          Number(commissionPercentInput) === pct
                            ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-xs'
                            : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-700 hover:border-amber-400'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Network Sending Charge Preview */}
                <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ArrowDownToLine className="w-3.5 h-3.5 text-amber-400" />
                    <span>Developer Withdrawal Sending Network Charge</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    A sending network charge of <strong className="text-amber-300 font-mono">100 UGX</strong> is automatically deducted on every <strong className="text-amber-300 font-mono">1,000 UGX</strong> withdrawn by a developer to pay mobile money handset routing fees.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-300 font-mono">
                    <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
                      1,000 UGX → -100 fee (900 net)
                    </span>
                    <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
                      5,000 UGX → -500 fee (4,500 net)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 bg-gradient-to-br from-amber-950/40 via-neutral-950 to-neutral-950 border border-amber-500/40 rounded-2xl shadow-lg">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
                  ★ Super Admin Total Profit
                </span>
                <div className="text-2xl font-black text-amber-300 mt-1 tabular-nums">
                  {(financials?.totalAdminCommissionEarned || 0).toLocaleString()}{' '}
                  <span className="text-xs font-mono text-amber-400/80">{financials?.currency || 'UGX'}</span>
                </div>
                <div className="text-[10px] text-amber-400/90 mt-1">
                  {commissionPercentInput}% app sales + 10% ownership transfers ({(financials?.totalTransferAdminFees || 0).toLocaleString()} {financials?.currency || 'UGX'} from {financials?.totalCompletedTransfersCount || 0} transfers)
                </div>
              </div>

              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                  Total Gross Volume
                </span>
                <div className="text-xl font-black text-white mt-1 tabular-nums">
                  {(financials?.totalGrossSales || 0).toLocaleString()}{' '}
                  <span className="text-xs font-mono text-neutral-400">{financials?.currency || 'UGX'}</span>
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">
                  App sales + {(financials?.totalTransferGross || 0).toLocaleString()} {financials?.currency || 'UGX'} in ownership transfers
                </div>
              </div>

              <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
                  Developer Net Earnings
                </span>
                <div className="text-xl font-black text-emerald-300 mt-1 tabular-nums">
                  {(financials?.totalDeveloperNetEarnings || 0).toLocaleString()}{' '}
                  <span className="text-xs font-mono text-emerald-400">{financials?.currency || 'UGX'}</span>
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-1">
                  Credited to developer wallets ({Math.max(0, 100 - Number(commissionPercentInput))}% sales / 90% transfers)
                </div>
              </div>

              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                  Disbursed Payouts
                </span>
                <div className="text-xl font-black text-white mt-1 tabular-nums">
                  {(financials?.totalDisbursedWithdrawals || 0).toLocaleString()}{' '}
                  <span className="text-xs font-mono text-neutral-400">{financials?.currency || 'UGX'}</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  Pending: <strong className="text-amber-400 font-mono">{(financials?.totalPendingWithdrawals || 0).toLocaleString()} {financials?.currency || 'UGX'}</strong>
                </div>
              </div>
            </div>

            {/* WITHDRAWAL PAYOUT REQUESTS LIST */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-amber-400" />
                    <span>Developer Withdrawal Payout Requests</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Review and approve developer payout disbursements (minimum withdrawal 1,000 UGX).
                  </p>
                </div>

                <span className="text-xs text-neutral-400 font-mono bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                  {adminWithdrawals.filter((w) => w.status === 'pending').length} Pending Review
                </span>
              </div>

              {adminWithdrawals.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-950 rounded-2xl border border-neutral-800">
                  No withdrawal requests submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto bg-neutral-950 rounded-2xl border border-neutral-800/80">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[11px] font-semibold text-neutral-400 bg-neutral-900/60">
                        <th className="p-3">Requested Date</th>
                        <th className="p-3">Developer</th>
                        <th className="p-3">Requested Gross</th>
                        <th className="p-3">Sending Fee</th>
                        <th className="p-3">Net Disbursed</th>
                        <th className="p-3">Payout Method</th>
                        <th className="p-3">Account Details</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {adminWithdrawals.map((w) => {
                        const isPending = w.status === 'pending';
                        const isActioning = actioningWithdrawalId === w.id;
                        const fee = w.transferFee !== undefined ? w.transferFee : Math.round((w.amount / 1000) * 100);
                        const netAmount = w.netPayoutAmount !== undefined ? w.netPayoutAmount : Math.max(0, w.amount - fee);

                        return (
                          <tr key={w.id} className="text-neutral-300 hover:bg-neutral-900/40 transition-colors">
                            <td className="p-3 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                              {new Date(w.requestedAt).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-white whitespace-nowrap">{w.developerName}</div>
                              <div className="text-[10px] text-neutral-400 font-mono">{w.developerEmail}</div>
                            </td>
                            <td className="p-3 font-bold text-white font-mono text-xs whitespace-nowrap">
                              {w.amount.toLocaleString()} {w.currency}
                            </td>
                            <td className="p-3 font-mono text-xs text-rose-400 whitespace-nowrap">
                              -{fee.toLocaleString()} {w.currency}
                              <span className="block text-[9px] text-neutral-500 font-sans">100/1000 fee</span>
                            </td>
                            <td className="p-3 font-black text-amber-300 font-mono text-sm whitespace-nowrap">
                              {netAmount.toLocaleString()} {w.currency}
                              <span className="block text-[9px] text-emerald-400 font-sans">To handset</span>
                            </td>
                            <td className="p-3 capitalize font-medium whitespace-nowrap">
                              {w.payoutMethod.replace(/_/g, ' ')}
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              <div>{w.payoutDetails?.accountName || w.developerName}</div>
                              <div className="text-amber-400 font-semibold">{w.payoutDetails?.accountNumber || '—'}</div>
                              {w.payoutDetails?.bankName && (
                                <div className="text-neutral-500 text-[10px]">
                                  {w.payoutDetails.bankName} {w.payoutDetails.swiftCode ? `(${w.payoutDetails.swiftCode})` : ''}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {w.status === 'paid' || w.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                  <Check className="w-3 h-3" />
                                  <span>Paid</span>
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                  <Clock className="w-3 h-3 animate-pulse" />
                                  <span>Pending Payout</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                                  <X className="w-3 h-3" />
                                  <span>Rejected</span>
                                </span>
                              )}
                              {w.transactionRef && (
                                <div className="text-[10px] font-mono text-neutral-500 mt-0.5">Ref: {w.transactionRef}</div>
                              )}
                              {w.rejectionReason && (
                                <div className="text-[10px] text-rose-400 mt-0.5 max-w-xs">{w.rejectionReason}</div>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    disabled={isActioning || actioningLivePayWithdrawalId === w.id}
                                    onClick={() => handleDisburseViaLivePay(w)}
                                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-[11px] rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Disburse automatically via LivePay Mobile Money API"
                                  >
                                    {actioningLivePayWithdrawalId === w.id ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                                        <span>Sending MoMo...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3 text-neutral-950 fill-neutral-950" />
                                        <span>⚡ Pay via LivePay</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isActioning || actioningLivePayWithdrawalId === w.id}
                                    onClick={() => handleApprovePayout(w.id)}
                                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold text-[11px] rounded-lg border border-neutral-700 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Manual mark paid"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Manual Paid</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isActioning || actioningLivePayWithdrawalId === w.id}
                                    onClick={() => {
                                      setRejectWithdrawalModal(w);
                                      setRejectWithdrawalReason('');
                                    }}
                                    className="px-2.5 py-1.5 bg-neutral-900 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-neutral-800 rounded-lg font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-neutral-500">Processed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* LIVE CUSTOMER APP SALES LEDGER */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>Real-Time Store Sales Transactions</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    All completed app purchases ({commissionPercentInput}% Super Admin cut) and developer-to-developer ownership transfers (10% Super Admin cut).
                  </p>
                </div>
                <span className="text-xs text-neutral-400 font-mono bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                  {adminSales.length} Total Transactions
                </span>
              </div>

              {adminSales.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-950 rounded-2xl border border-neutral-800">
                  No app sales recorded yet. When users purchase paid apps or developers transfer ownership on Zuzu Store, transactions will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto bg-neutral-950 rounded-2xl border border-neutral-800/80">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[11px] font-semibold text-neutral-400 bg-neutral-900/60">
                        <th className="p-3">Date</th>
                        <th className="p-3">Application</th>
                        <th className="p-3">Buyer</th>
                        <th className="p-3">Gross Paid</th>
                        <th className="p-3">Admin Cut</th>
                        <th className="p-3">Developer Net</th>
                        <th className="p-3">Payment Method</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {adminSales.map((sale) => (
                        <tr key={sale.id} className="text-neutral-300 hover:bg-neutral-900/40 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-neutral-400">
                            {new Date(sale.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-white">
                            <div>{sale.appName}</div>
                            {sale.transactionType === 'ownership_transfer' && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                                Ownership Transfer (10% Fee)
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            <div>{sale.customerName}</div>
                            <div className="text-neutral-500">{sale.customerEmail}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-white">
                            {sale.grossAmount.toLocaleString()} {sale.currency}
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-400">
                            +{sale.adminCommissionAmount.toLocaleString()} {sale.currency} ({sale.adminCommissionPercent || commissionPercentInput}%)
                          </td>
                          <td className="p-3 font-mono text-emerald-400">
                            {sale.developerNetAmount.toLocaleString()} {sale.currency}
                          </td>
                          <td className="p-3 text-[11px] text-neutral-400">
                            {sale.paymentMethod}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT WITHDRAWAL MODAL */}
      {rejectWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Reject Withdrawal Payout</h3>
              </div>
              <button
                onClick={() => setRejectWithdrawalModal(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 space-y-1">
              <p>
                Rejecting payout of <strong className="text-white font-bold">{rejectWithdrawalModal.amount.toLocaleString()} {rejectWithdrawalModal.currency}</strong> for developer <strong className="text-amber-400 font-bold">{rejectWithdrawalModal.developerName}</strong>.
              </p>
              <p className="text-neutral-400 text-[11px]">
                Upon rejection, the full amount will be refunded back to the developer's available balance immediately.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectWithdrawalReason}
                onChange={(e) => setRejectWithdrawalReason(e.target.value)}
                placeholder="e.g. Invalid MoMo phone number, name does not match, or temporary bank routing failure..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-rose-500 rounded-xl p-3 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setRejectWithdrawalModal(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectWithdrawalReason.trim() || actioningWithdrawalId === rejectWithdrawalModal.id}
                onClick={handleRejectPayout}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actioningWithdrawalId === rejectWithdrawalModal.id ? 'Processing...' : 'Confirm Rejection & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPER ADMIN REJECTION REASON MODAL */}
      {rejectModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Reject Application</h3>
              </div>
              <button
                onClick={() => setRejectModalApp(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 space-y-1">
              <p>
                Rejecting submission for <strong className="text-white font-bold">{rejectModalApp.name}</strong>.
              </p>
              <p className="text-neutral-400 text-[11px]">
                Please explain why this application was rejected so the developer can make the necessary corrections.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Feedback / Rejection Reason
              </label>
              <textarea
                rows={3}
                required
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                placeholder="e.g. Please provide high-resolution screenshots and verify the APK runs properly on Android TV..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalApp(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewingAppId === rejectModalApp.id}
                onClick={handleReject}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                {reviewingAppId === rejectModalApp.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Send Rejection & Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete App Confirmation Modal */}
      {appToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Application</h3>
                <p className="text-xs text-neutral-400">Permanent removal from website and cloud database</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80">
              Are you sure you want to permanently delete <strong className="text-white font-semibold">"{appToDelete.name}"</strong>?
              This application and all its versions will be deleted from the database and will <strong className="text-rose-300">never appear again on the website</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAppToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete App</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Release/Version Confirmation Modal */}
      {releaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Version Release</h3>
                <p className="text-xs text-neutral-400">{releaseToDelete.app.name}</p>
              </div>
            </div>

            <div className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-1.5">
              <p>
                Are you sure you want to permanently delete version <strong className="text-white font-mono font-semibold">v{releaseToDelete.version}</strong> ({releaseToDelete.fileName})?
              </p>
              <p className="text-[11px] text-neutral-400">
                This specific version build will be permanently purged from the cloud database and will <strong className="text-rose-300">never appear again on the website</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingRelease}
                onClick={() => setReleaseToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRelease}
                onClick={handleConfirmDeleteRelease}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingRelease ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting Version...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Version</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE SCREENSHOTS MODAL FOR EXISTING LIVE APPS */}
      {editingScreenshotsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-neutral-100 space-y-6 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={editingScreenshotsApp.iconUrl}
                  alt={editingScreenshotsApp.name}
                  className="w-12 h-12 rounded-xl object-contain border border-neutral-800 bg-neutral-950 p-1"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Manage Screenshots for &quot;{editingScreenshotsApp.name}&quot;
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Add more than 3 screenshots or rearrange existing showcase previews.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingScreenshotsApp(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Screenshots counter & requirement status in modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl">
              <div className="flex items-center gap-2 text-xs">
                {editingScreenshotsList.length >= 3 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingScreenshotsList.length} Screenshots (Meets 3+ Showcase Target!)</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{editingScreenshotsList.length} Screenshots • Add {Math.max(0, 3 - editingScreenshotsList.length)} more to reach 3+</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={editScreenshotInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectEditScreenshotFiles}
                />
                <button
                  type="button"
                  onClick={() => editScreenshotInputRef.current?.click()}
                  disabled={isSavingScreenshots}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload More Screenshots</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingScreenshotsList((prev) => [...prev, ...SAMPLE_SCREENSHOTS]);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl border border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Samples</span>
                </button>
              </div>
            </div>

            {/* Add by URL */}
            <div className="flex gap-2">
              <input
                type="url"
                value={customEditScreenshotUrl}
                onChange={(e) => setCustomEditScreenshotUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (customEditScreenshotUrl.trim()) {
                      setEditingScreenshotsList((prev) => [...prev, customEditScreenshotUrl.trim()]);
                      setCustomEditScreenshotUrl('');
                    }
                  }
                }}
                placeholder="Or paste screenshot image URL..."
                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customEditScreenshotUrl.trim()) {
                    setEditingScreenshotsList((prev) => [...prev, customEditScreenshotUrl.trim()]);
                    setCustomEditScreenshotUrl('');
                  }
                }}
                disabled={!customEditScreenshotUrl.trim()}
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-300 disabled:opacity-40 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-neutral-700 cursor-pointer"
              >
                Add URL
              </button>
            </div>

            {/* Screenshots grid */}
            {editingScreenshotsList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {editingScreenshotsList.map((shot, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl overflow-hidden border border-neutral-800 hover:border-cyan-500/60 bg-neutral-950 aspect-[16/10] transition-all flex flex-col justify-between"
                  >
                    <img
                      src={shot}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/50" />

                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/75 text-cyan-300">
                        {idx === 0 ? 'Cover' : `#${idx + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingScreenshotsList((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            setEditingScreenshotsList((prev) => {
                              const copy = [...prev];
                              const [item] = copy.splice(idx, 1);
                              copy.splice(idx - 1, 0, item);
                              return copy;
                            });
                          }}
                          className="p-1 rounded bg-black/70 hover:bg-neutral-800 disabled:opacity-30 text-white"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === editingScreenshotsList.length - 1}
                          onClick={() => {
                            setEditingScreenshotsList((prev) => {
                              const copy = [...prev];
                              const [item] = copy.splice(idx, 1);
                              copy.splice(idx + 1, 0, item);
                              return copy;
                            });
                          }}
                          className="p-1 rounded bg-black/70 hover:bg-neutral-800 disabled:opacity-30 text-white"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPublisherLightboxUrl(shot)}
                        className="p-1 px-1.5 rounded bg-black/70 text-cyan-300 text-[10px] flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-950/60 rounded-2xl border border-neutral-800">
                No screenshots currently attached. Click &quot;Upload More Screenshots&quot; or &quot;+ Samples&quot; to add previews.
              </div>
            )}

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingScreenshotsApp(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingScreenshots}
                onClick={handleSaveAppScreenshots}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingScreenshots ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Firestore...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Screenshots ({editingScreenshotsList.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISHER LIGHTBOX PREVIEW */}
      {publisherLightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setPublisherLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPublisherLightboxUrl(null)}
              className="absolute -top-10 right-0 p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={publisherLightboxUrl}
              alt="Screenshot full preview"
              className="max-h-[80vh] w-auto object-contain rounded-2xl border border-neutral-800 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* GOD MODE: DEVELOPER STATUS MODAL (FREEZE / BAN / UNFREEZE) */}
      {statusModalDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Manage Developer Status</h3>
              </div>
              <button
                onClick={() => setStatusModalDev(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300">
              Updating account status for <strong className="text-white font-bold">{statusModalDev.name}</strong> ({statusModalDev.email}).
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Select Account Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewStatusChoice('active')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    newStatusChoice === 'active'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatusChoice('frozen')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    newStatusChoice === 'frozen'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Freeze</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatusChoice('banned')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    newStatusChoice === 'banned'
                      ? 'bg-rose-950 text-rose-300 border-rose-600'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Ban</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Reason / Note for Developer
              </label>
              <textarea
                rows={3}
                value={statusReasonInput}
                onChange={(e) => setStatusReasonInput(e.target.value)}
                placeholder="Explain the reason for freeze or ban (shown in developer dashboard)..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalDev(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleUpdateDevStatus}
                className="px-5 py-2 text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/40 disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingStatus ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                <span>Update Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOD MODE: DELETE DEVELOPER CONFIRMATION MODAL */}
      {deleteDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Developer Account</h3>
                <p className="text-xs text-neutral-400">Irreversible administrative deletion</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80">
              Are you sure you want to permanently delete <strong className="text-white font-semibold">"{deleteDevModal.name}"</strong> ({deleteDevModal.email})?
              This developer will no longer be able to log in or publish applications.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingDev}
                onClick={() => setDeleteDevModal(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingDev}
                onClick={handleDeleteDeveloper}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingDev ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOD MODE: INSPECT DEVELOPER APPS MODAL */}
      {inspectDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-4 max-h-[85vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Apps by {inspectDev.name}</h3>
                  <p className="text-xs text-neutral-400">{inspectDev.email}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectDev(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {isLoadingDevApps ? (
                <div className="py-12 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading applications...</span>
                </div>
              ) : inspectDevApps.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-950 rounded-2xl border border-neutral-800">
                  This developer has not submitted any applications yet.
                </div>
              ) : (
                inspectDevApps.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={a.iconUrl}
                        alt={a.name}
                        className="w-11 h-11 rounded-xl object-contain border border-neutral-800 bg-neutral-900 p-1 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-white">{a.name}</h5>
                          <span className="text-[10px] text-neutral-400 bg-neutral-900 px-1.5 py-0.2 rounded font-mono">
                            v{a.currentVersion}
                          </span>
                          {a.isTakenDown && (
                            <span className="text-[10px] text-rose-400 bg-rose-950 px-1.5 py-0.2 rounded border border-rose-800">
                              Taken Down
                            </span>
                          )}
                          {a.approvalStatus === 'pending_approval' && (
                            <span className="text-[10px] text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                              Pending Review
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{a.tagline}</p>
                        <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                          Downloads: {(a.downloadsTotal || 0).toLocaleString()} • Package: {a.packageId}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openTransferOwnershipModal(a)}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/70 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Transfer this app's ownership to another user or Store Admin"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Transfer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownloadTest(a.id, a.releases?.[0]?.id)}
                        className="p-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl"
                        title="Download APK"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setInspectDev(null)}
                className="px-5 py-2 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOD MODE: SOFT TAKEDOWN MODAL */}
      {takedownAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <EyeOff className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Soft Takedown Application</h3>
              </div>
              <button
                onClick={() => setTakedownAppModal(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 space-y-1">
              <p>
                Taking down <strong className="text-white font-bold">{takedownAppModal.name}</strong> from the store.
              </p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                This will immediately hide the application from search results, category listings, and block public downloads. All APK files and versions are safely preserved and can be restored at any time.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Takedown Reason
              </label>
              <textarea
                rows={3}
                value={takedownReasonInput}
                onChange={(e) => setTakedownReasonInput(e.target.value)}
                placeholder="e.g. Under investigation for security vulnerabilities or policy violation..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTakedownAppModal(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTakedownSaving}
                onClick={handleTakedownApp}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950/40 disabled:opacity-50 cursor-pointer"
              >
                {isTakedownSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                <span>Confirm Soft Takedown</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOD MODE: SUPER ADMIN DIRECT METADATA OVERRIDE MODAL */}
      {overrideAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Super Admin Direct Override</h3>
              </div>
              <button
                onClick={() => setOverrideAppModal(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Directly override metadata for <strong className="text-white">{overrideAppModal.name}</strong> without developer involvement.
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  App Name
                </label>
                <input
                  type="text"
                  value={overrideFormData.name}
                  onChange={(e) => setOverrideFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tagline / Brief Info
                </label>
                <input
                  type="text"
                  value={overrideFormData.tagline}
                  onChange={(e) => setOverrideFormData((p) => ({ ...p, tagline: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Category
                </label>
                <select
                  value={overrideFormData.category}
                  onChange={(e) => setOverrideFormData((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                >
                  {['Productivity', 'Utilities', 'Tools', 'Entertainment', 'Smart TV', 'Social', 'Games', 'TV & Movies', 'Streaming'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Full Description
                </label>
                <textarea
                  rows={3}
                  value={overrideFormData.description}
                  onChange={(e) => setOverrideFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Icon URL
                </label>
                <input
                  type="text"
                  value={overrideFormData.iconUrl}
                  onChange={(e) => setOverrideFormData((p) => ({ ...p, iconUrl: e.target.value }))}
                  placeholder="/zuzustore-logo.png"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setOverrideAppModal(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingOverride}
                onClick={handleSaveOverride}
                className="px-5 py-2 text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/40 disabled:opacity-50 cursor-pointer"
              >
                {isSavingOverride ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                <span>Save Overrides</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* GOD MODE: TRANSFER APP OWNERSHIP MODAL */}
      {transferAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-neutral-100 space-y-4 max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5 text-indigo-400 min-w-0">
                <ArrowLeftRight className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">Transfer App Ownership</h3>
                  <p className="text-[11px] text-neutral-400 truncate">Super Admin God Mode Control</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferAppModal(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* App & Current Owner Summary */}
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center gap-3">
                <img
                  src={transferAppModal.iconUrl || '/zuzustore-logo.png'}
                  alt={transferAppModal.name}
                  className="w-12 h-12 rounded-xl object-contain border border-neutral-800 bg-neutral-900 p-1 shrink-0"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/zuzustore-logo.png';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">{transferAppModal.name}</h4>
                  <p className="text-[11px] text-neutral-400 font-mono truncate">
                    Current Owner:{' '}
                    <span className="text-amber-300 font-semibold">
                      {transferAppModal.submittedBy?.name || transferAppModal.developer?.name || 'ZuzuStore Official'}
                    </span>{' '}
                    ({transferAppModal.submittedBy?.email || transferAppModal.developer?.email || 'sseruwagijohn452@gmail.com'})
                  </p>
                </div>
              </div>

              {/* Target Type Switcher */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-300">Select Target Owner</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTransferTargetMode('developer')}
                    className={`py-2 px-2 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      transferTargetMode === 'developer'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Registered User
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferTargetMode('email')}
                    className={`py-2 px-2 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      transferTargetMode === 'email'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    By Email / ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferTargetMode('admin')}
                    className={`py-2 px-2 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      transferTargetMode === 'admin'
                        ? 'bg-amber-500 text-neutral-950 shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Store Admin
                  </button>
                </div>
              </div>

              {/* Mode 1: Pick from Registered Developers */}
              {transferTargetMode === 'developer' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={transferDevSearch}
                      onChange={(e) => setTransferDevSearch(e.target.value)}
                      placeholder="Filter developers by name, email, or studio..."
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {developers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-950 rounded-xl border border-neutral-800">
                        No registered developer accounts found yet. Use &quot;By Email / ID&quot; or register a developer first.
                      </div>
                    ) : (
                      developers
                        .filter((d) => {
                          if (!transferDevSearch.trim()) return true;
                          const q = transferDevSearch.toLowerCase();
                          return (
                            d.name.toLowerCase().includes(q) ||
                            d.email.toLowerCase().includes(q) ||
                            (d.companyName && d.companyName.toLowerCase().includes(q))
                          );
                        })
                        .map((dev) => {
                          const isCurrent =
                            transferAppModal.submittedBy?.id === dev.id ||
                            transferAppModal.submittedBy?.email?.toLowerCase() === dev.email.toLowerCase();
                          const isSelected = selectedTargetDevId === dev.id;

                          return (
                            <button
                              key={dev.id}
                              type="button"
                              disabled={isCurrent}
                              onClick={() => setSelectedTargetDevId(dev.id)}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                isCurrent
                                  ? 'bg-neutral-950/40 border-neutral-800/50 opacity-50 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs font-bold text-white truncate">{dev.name}</span>
                                  {dev.companyName && (
                                    <span className="text-[10px] text-neutral-400">({dev.companyName})</span>
                                  )}
                                  {dev.status === 'frozen' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                      Frozen
                                    </span>
                                  )}
                                  {dev.status === 'banned' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                                      Banned
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                      Current Owner
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-neutral-400 font-mono truncate">{dev.email}</p>
                              </div>

                              {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Enter Exact Developer Email or ID */}
              {transferTargetMode === 'email' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Registered User Email or Developer ID
                  </label>
                  <input
                    type="text"
                    value={manualTargetEmail}
                    onChange={(e) => setManualTargetEmail(e.target.value)}
                    placeholder="e.g. developer@example.com or dev_..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Must match an existing registered developer email/ID (or Super Admin email).
                  </p>
                </div>
              )}

              {/* Mode 3: Reclaim / Transfer to Official Store Admin */}
              {transferTargetMode === 'admin' && (
                <div className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-700/50 text-xs text-amber-200 space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4" />
                    <span>Transfer to Official Store Admin</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Reassigns ownership to <strong className="text-white">ZuzuStore Official</strong> ({admin?.email || 'sseruwagijohn452@gmail.com'}), marks it as official store-managed, and routes future revenue to the Store Admin wallet.
                  </p>
                </div>
              )}

              {/* Public Credit Toggle */}
              <label className="flex items-start gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateDisplayDeveloper}
                  onChange={(e) => setUpdateDisplayDeveloper(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <span className="block text-xs font-semibold text-white">
                    Update public developer name &amp; email on storefront
                  </span>
                  <span className="block text-[11px] text-neutral-400">
                    Uncheck to transfer console &amp; payout rights silently while keeping the original storefront author credit.
                  </span>
                </div>
              </label>

              {/* Reason / Audit Note */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Transfer Reason / Audit Note (Optional)
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Studio acquisition, co-founder handover, or admin takeover"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 outline-none"
                />
              </div>

              {/* Financial Safeguard Notice */}
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/50 text-[11px] text-indigo-200 leading-relaxed">
                <strong>Revenue Rule:</strong> Future app sales and withdrawals immediately route to the new owner. Past completed earnings remain safely in the previous owner&apos;s wallet ledger.
              </div>

              {/* Ownership History Audit Log */}
              {transferAppModal.ownershipHistory && transferAppModal.ownershipHistory.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Previous Ownership Transfers ({transferAppModal.ownershipHistory.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {transferAppModal.ownershipHistory.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 text-[11px] text-neutral-400"
                      >
                        <div className="text-neutral-200 font-medium">
                          {rec.fromName} → <span className="text-indigo-300">{rec.toName}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {new Date(rec.transferredAt).toLocaleString()} {rec.reason ? `• ${rec.reason}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setTransferAppModal(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isTransferringOwnership ||
                  (transferTargetMode === 'developer' && !selectedTargetDevId) ||
                  (transferTargetMode === 'email' && !manualTargetEmail.trim())
                }
                onClick={handleTransferOwnership}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 disabled:opacity-50 cursor-pointer"
              >
                {isTransferringOwnership ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                )}
                <span>Confirm Ownership Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
