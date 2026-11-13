import React, { useState, useEffect } from 'react';
import {
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlusCircle,
  Trash2,
  ExternalLink,
  Layers,
  ArrowLeft,
  Smartphone,
  Tv,
  Image as ImageIcon,
  FileCode,
  ShieldCheck,
  LogOut,
  Send,
  Megaphone,
  Snowflake,
  Ban,
  EyeOff,
  Wallet,
  DollarSign,
  ArrowDownToLine,
  CheckCircle2,
  Receipt,
  CreditCard,
  RefreshCw,
  Percent,
  X,
  ArrowRightLeft,
  Edit3,
  UploadCloud,
  UserCheck,
  History,
  ShoppingBag,
  Sparkles,
  Tag
} from 'lucide-react';
import {
  DeveloperUser,
  StoreApp,
  AdminBroadcast,
  DeveloperWallet,
  WithdrawalRequest,
  AppPricingType,
  AppTransferListing
} from '../types';
import { saveApkBlob } from '../utils/fileStorage';
import {
  submitDeveloperApp,
  fetchDeveloperMyApps,
  deleteDeveloperApp,
  developerLogout,
  fetchBroadcast,
  fetchDeveloperWallet,
  requestDeveloperWithdrawal,
  fetchDeveloperWithdrawals,
  fetchStoreCommission,
  fetchDeveloperDirectory,
  createDeveloperAppTransferListing,
  fetchDeveloperTransfers,
  cancelDeveloperAppTransfer,
  purchaseDeveloperAppTransfer,
  updateDeveloperOwnedApp,
  addDeveloperOwnedAppRelease,
  acceptDeveloperAgreements
} from '../services/api';
import { AGREEMENTS_VERSION, LegalTab } from './LegalAgreementsModal';

// Compress icon image into a lightweight Data URL (permanent across restarts/instances)
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
          resolve(canvas.toDataURL('image/png', 0.92));
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

// Compress screenshot into a fast-loading JPEG Data URL so it stays well within Firestore 1MB doc limits
function convertScreenshotToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 960;
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
          resolve(canvas.toDataURL('image/jpeg', 0.78));
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

interface DeveloperConsoleProps {
  developer: DeveloperUser;
  onLogout: () => void;
  onBackToStore: () => void;
  onDeveloperUpdated?: (dev: DeveloperUser) => void;
  onOpenLegal?: (tab: LegalTab) => void;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({
  developer,
  onLogout,
  onBackToStore,
  onDeveloperUpdated,
  onOpenLegal,
}) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'my-apps' | 'transfers' | 'wallet'>('submit');
  const [isAcceptingAgreement, setIsAcceptingAgreement] = useState(false);
  const [myApps, setMyApps] = useState<StoreApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [myAppsMessage, setMyAppsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [broadcast, setBroadcast] = useState<AdminBroadcast | null>(null);

  // Wallet & Earnings State
  const [wallet, setWallet] = useState<DeveloperWallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [walletMessage, setWalletMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Withdrawal Request Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(1000);
  const [withdrawMethod, setWithdrawMethod] = useState<'mobile_money_mtn' | 'mobile_money_airtel'>('mobile_money_mtn');
  const [payoutAccountName, setPayoutAccountName] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  // Live Platform Commission & Fee Rates (Dynamic)
  const [adminCommissionPercent, setAdminCommissionPercent] = useState<number>(6);
  const [feeRatePer1000, setFeeRatePer1000] = useState<number>(100);

  // Developer-to-Developer App Ownership Transfer State
  const [myTransferListings, setMyTransferListings] = useState<AppTransferListing[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<AppTransferListing[]>([]);
  const [marketTransfers, setMarketTransfers] = useState<AppTransferListing[]>([]);
  const [transferHistory, setTransferHistory] = useState<AppTransferListing[]>([]);
  const [fellowDevelopers, setFellowDevelopers] = useState<
    Array<{ id: string; name: string; email: string; companyName?: string }>
  >([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [transfersFeedback, setTransfersFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cancellingTransferId, setCancellingTransferId] = useState<string | null>(null);

  // Sell / Transfer App Ownership Modal
  const [sellModalApp, setSellModalApp] = useState<StoreApp | null>(null);
  const [sellMode, setSellMode] = useState<'specific' | 'open'>('specific');
  const [sellTargetEmail, setSellTargetEmail] = useState('');
  const [sellPrice, setSellPrice] = useState<number>(50000);
  const [sellNote, setSellNote] = useState('');
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  // Buyer Checkout Modal for Purchasing App Ownership
  const [buyModalListing, setBuyModalListing] = useState<AppTransferListing | null>(null);
  const [buyPaymentMethod, setBuyPaymentMethod] = useState<'livepay_mtn' | 'livepay_airtel' | 'wallet'>('livepay_mtn');
  const [buyPhoneNumber, setBuyPhoneNumber] = useState('');
  const [isPurchasingTransfer, setIsPurchasingTransfer] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  // Full Owner Control: Edit Owned App Modal
  const [editModalApp, setEditModalApp] = useState<StoreApp | null>(null);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Streaming');
  const [editPackageId, setEditPackageId] = useState('');
  const [editEdition, setEditEdition] = useState<'phone' | 'tv' | 'both'>('phone');
  const [editDirectUrl, setEditDirectUrl] = useState('');
  const [editPricingType, setEditPricingType] = useState<AppPricingType>('free');
  const [editPrice, setEditPrice] = useState<number>(5000);
  const [editCurrency, setEditCurrency] = useState<string>('UGX');
  const [editIconUrl, setEditIconUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Full Owner Control: Release New Version Modal
  const [releaseModalApp, setReleaseModalApp] = useState<StoreApp | null>(null);
  const [relVersion, setRelVersion] = useState('');
  const [relPlatform, setRelPlatform] = useState<'Android' | 'Android TV' | 'Fire TV' | 'Smart TV'>('Android');
  const [relMinOS, setRelMinOS] = useState('Android 8.0+');
  const [relChangelog, setRelChangelog] = useState('');
  const [relApkFile, setRelApkFile] = useState<File | null>(null);
  const [relDirectUrl, setRelDirectUrl] = useState('');
  const [isPublishingRelease, setIsPublishingRelease] = useState(false);
  const [relError, setRelError] = useState<string | null>(null);

  // Confirm Withdraw Submission Modal (no window.confirm)
  const [withdrawAppModal, setWithdrawAppModal] = useState<StoreApp | null>(null);
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  const isFrozen = developer.status === 'frozen';
  const isBanned = developer.status === 'banned';

  // Form State
  const [name, setName] = useState('');
  const [briefInfo, setBriefInfo] = useState('');
  const [description, setDescription] = useState('');
  const [appEdition, setAppEdition] = useState<'phone' | 'tv'>('phone');
  const [category, setCategory] = useState('Streaming');
  const [version, setVersion] = useState('1.0.0');
  const [packageId, setPackageId] = useState('');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconUrlFallback, setIconUrlFallback] = useState('');
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [isProcessingAssets, setIsProcessingAssets] = useState(false);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [directDownloadUrl, setDirectDownloadUrl] = useState('');
  const [minOS, setMinOS] = useState('Android 8.0+');

  // Pricing & Monetization Form State (Free vs Paid)
  const [pricingType, setPricingType] = useState<AppPricingType>('free');
  const [price, setPrice] = useState<number>(5000);
  const [currency, setCurrency] = useState<string>('UGX');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Load developer apps
  const loadMyApps = async () => {
    setIsLoadingApps(true);
    try {
      const apps = await fetchDeveloperMyApps();
      setMyApps(apps);
    } catch (e) {
      console.warn('Failed to fetch developer apps:', e);
    } finally {
      setIsLoadingApps(false);
    }
  };

  // Load developer earnings and wallet
  const loadWallet = async () => {
    setIsLoadingWallet(true);
    try {
      const [walletData, withdrawalsData] = await Promise.all([
        fetchDeveloperWallet().catch(() => null),
        fetchDeveloperWithdrawals().catch(() => [])
      ]);
      if (walletData) {
        setWallet(walletData);
      }
      if (withdrawalsData) {
        setWithdrawals(withdrawalsData);
      }
    } catch (e) {
      console.warn('Failed to load wallet data:', e);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Load developer-to-developer app ownership transfer offers & fellow developer directory
  const loadTransfers = async () => {
    setIsLoadingTransfers(true);
    try {
      const [trfData, dirData] = await Promise.all([
        fetchDeveloperTransfers(),
        fetchDeveloperDirectory().catch(() => [])
      ]);
      setMyTransferListings(trfData.myListings);
      setIncomingTransfers(trfData.incomingOffers);
      setMarketTransfers(trfData.marketplaceOffers);
      setTransferHistory(trfData.completedHistory);
      setFellowDevelopers(dirData);
    } catch (e) {
      console.warn('Failed to load app transfers:', e);
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  useEffect(() => {
    loadMyApps();
    loadWallet();
    loadTransfers();
    fetchStoreCommission().then((data) => {
      if (data) {
        setAdminCommissionPercent(data.adminCommissionPercent ?? 6);
        setFeeRatePer1000(data.withdrawalTransferFeePer1000 ?? 100);
      }
    });
    fetchBroadcast().then((b) => {
      if (b && b.active) setBroadcast(b);
    });
  }, []);

  // Icon file handler (compresses to lightweight Data URL so icons persist across restarts/instances)
  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessingAssets(true);
      try {
        const dataUrl = await convertImageToDataUrl(file);
        setIconPreview(dataUrl);
      } finally {
        setIsProcessingAssets(false);
        e.target.value = '';
      }
    }
  };

  // Screenshots file handler (compresses to JPEG Data URLs, max 8 screenshots to keep payload fast & Firestore-safe)
  const handleScreenshotsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsProcessingAssets(true);
      try {
        const converted: string[] = [];
        for (const file of files) {
          const url = await convertScreenshotToDataUrl(file);
          if (url) converted.push(url);
        }
        setScreenshotPreviews((prev) => [...prev, ...converted].slice(0, 8));
      } finally {
        setIsProcessingAssets(false);
        e.target.value = '';
      }
    }
  };

  const handleRemoveScreenshot = (idx: number) => {
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // APK file handler
  const handleApkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setApkFile(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!name.trim()) {
      setSubmitError('Application name is required.');
      return;
    }

    if (!briefInfo.trim()) {
      setSubmitError('Please add a brief description of the application.');
      return;
    }

    const rawDirectUrl = directDownloadUrl.trim();
    const normalizedDirectUrl =
      rawDirectUrl && !/^https?:\/\//i.test(rawDirectUrl) ? `https://${rawDirectUrl}` : rawDirectUrl;

    if (!apkFile && !normalizedDirectUrl) {
      setSubmitError('Please upload an APK file or provide a direct download link (e.g. Google Drive / cloud link).');
      return;
    }

    if (pricingType === 'paid') {
      const minAllowed = currency === 'USD' ? 1 : 500;
      if (!price || isNaN(price) || price < minAllowed) {
        setSubmitError(`Paid app price must be at least ${minAllowed.toLocaleString()} ${currency}.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const targetPlatform = appEdition === 'tv' ? 'Android TV' : 'Android';
      const resolvedPkg =
        packageId.trim() ||
        `com.${developer.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'dev'}.${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'app'}`;
      const finalIcon = iconPreview || iconUrlFallback.trim() || '/zuzustore-logo.png';
      const finalScreenshots = screenshotPreviews.length > 0 ? screenshotPreviews : [finalIcon];

      let payload: FormData | Record<string, any>;
      if (apkFile) {
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('tagline', briefInfo.trim());
        formData.append('description', description.trim() || briefInfo.trim());
        formData.append('appEdition', appEdition);
        formData.append('platform', targetPlatform);
        formData.append('category', category);
        formData.append('version', version.trim() || '1.0.0');
        formData.append('minOS', minOS.trim() || 'Android 8.0+');
        formData.append('packageId', resolvedPkg);
        formData.append('apkFile', apkFile);
        if (normalizedDirectUrl) {
          formData.append('directDownloadUrl', normalizedDirectUrl);
        }
        formData.append('iconUrl', finalIcon);
        formData.append('screenshots', JSON.stringify(finalScreenshots));
        formData.append('pricingType', pricingType);
        formData.append('price', String(pricingType === 'paid' ? price : 0));
        formData.append('currency', currency);
        payload = formData;
      } else {
        payload = {
          name: name.trim(),
          tagline: briefInfo.trim(),
          description: description.trim() || briefInfo.trim(),
          appEdition,
          platform: targetPlatform,
          category,
          version: version.trim() || '1.0.0',
          minOS: minOS.trim() || 'Android 8.0+',
          packageId: resolvedPkg,
          directDownloadUrl: normalizedDirectUrl,
          iconUrl: finalIcon,
          screenshots: finalScreenshots,
          pricing: {
            type: pricingType,
            price: pricingType === 'paid' ? price : 0,
            currency
          }
        };
      }

      const res = await submitDeveloperApp(payload);

      if (apkFile && res.app?.id) {
        await saveApkBlob(res.app.id, apkFile).catch(() => {});
      }

      setSubmitSuccess(res.message || 'Application submitted successfully! It is now waiting for Super Admin review.');

      // Reset form
      setName('');
      setBriefInfo('');
      setDescription('');
      setPackageId('');
      setVersion('1.0.0');
      setApkFile(null);
      setDirectDownloadUrl('');
      setIconPreview(null);
      setIconUrlFallback('');
      setScreenshotPreviews([]);
      setPricingType('free');
      setPrice(5000);

      // Reload developer's apps list & switch tab
      await loadMyApps();
      setTimeout(() => {
        setActiveTab('my-apps');
        setSubmitSuccess(null);
      }, 2000);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit application. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletMessage(null);

    if (withdrawAmount < 1000) {
      setWalletMessage({ type: 'error', text: 'Minimum withdrawal amount is 1,000 UGX.' });
      return;
    }

    if (!wallet || withdrawAmount > wallet.availableBalance) {
      setWalletMessage({
        type: 'error',
        text: `Insufficient balance. Your current available net balance is ${(wallet?.availableBalance || 0).toLocaleString()} UGX.`
      });
      return;
    }

    if (!payoutAccountName.trim() || !payoutAccountNumber.trim()) {
      setWalletMessage({ type: 'error', text: 'Please fill in both the account name and account number / phone.' });
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      const res = await requestDeveloperWithdrawal({
        amount: withdrawAmount,
        payoutMethod: withdrawMethod,
        payoutDetails: {
          accountName: payoutAccountName.trim(),
          accountNumber: payoutAccountNumber.trim(),
          notes: payoutNotes.trim() || undefined
        },
        currency: 'UGX'
      });

      setWalletMessage({
        type: 'success',
        text: res.message || 'Withdrawal request submitted! Super Admin will review and disburse your payout.'
      });
      setWallet(res.wallet);
      setWithdrawAmount(1000);
      setPayoutAccountNumber('');
      await loadWallet();
    } catch (err: any) {
      setWalletMessage({ type: 'error', text: err.message || 'Failed to submit withdrawal request.' });
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const handleConfirmDeleteApp = async () => {
    if (!withdrawAppModal) return;
    setIsDeletingApp(true);
    try {
      await deleteDeveloperApp(withdrawAppModal.id);
      setMyAppsMessage({
        type: 'success',
        text: `Application "${withdrawAppModal.name}" was withdrawn from the store.`
      });
      setWithdrawAppModal(null);
      await Promise.all([loadMyApps(), loadTransfers()]);
    } catch (err: any) {
      setMyAppsMessage({
        type: 'error',
        text: err.message || 'Could not withdraw application. Please try again.'
      });
    } finally {
      setIsDeletingApp(false);
    }
  };

  const openSellTransferModal = (app: StoreApp) => {
    setSellModalApp(app);
    setSellMode('specific');
    setSellTargetEmail('');
    setSellPrice(50000);
    setSellNote('');
    setSellError(null);
    if (fellowDevelopers.length === 0) {
      fetchDeveloperDirectory().then(setFellowDevelopers).catch(() => {});
    }
  };

  const handleCreateTransferListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellModalApp) return;
    setSellError(null);

    if (!sellPrice || isNaN(sellPrice) || sellPrice < 1000) {
      setSellError('Minimum ownership sale price is 1,000 UGX.');
      return;
    }

    if (sellMode === 'specific' && !sellTargetEmail.trim()) {
      setSellError('Please choose or enter the recipient developer email.');
      return;
    }

    setIsCreatingTransfer(true);
    try {
      const res = await createDeveloperAppTransferListing({
        appId: sellModalApp.id,
        askingPrice: sellPrice,
        targetBuyerEmail: sellMode === 'specific' ? sellTargetEmail.trim() : undefined,
        note: sellNote.trim() || undefined
      });
      setSellModalApp(null);
      setTransfersFeedback({ type: 'success', text: res.message });
      setMyAppsMessage({ type: 'success', text: res.message });
      await loadTransfers();
      setActiveTab('transfers');
    } catch (err: any) {
      setSellError(err.message || 'Failed to create transfer offer.');
    } finally {
      setIsCreatingTransfer(false);
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    setCancellingTransferId(transferId);
    setTransfersFeedback(null);
    try {
      const res = await cancelDeveloperAppTransfer(transferId);
      setTransfersFeedback({ type: 'success', text: res.message });
      await loadTransfers();
    } catch (err: any) {
      setTransfersFeedback({ type: 'error', text: err.message || 'Could not cancel transfer offer.' });
    } finally {
      setCancellingTransferId(null);
    }
  };

  const openBuyTransferModal = (listing: AppTransferListing) => {
    setBuyModalListing(listing);
    setBuyPaymentMethod('livepay_mtn');
    setBuyPhoneNumber('');
    setBuyError(null);
    loadWallet();
  };

  const handleCompleteTransferPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyModalListing) return;
    setBuyError(null);

    if (buyPaymentMethod !== 'wallet' && !buyPhoneNumber.trim()) {
      setBuyError('Please enter your MTN or Airtel Mobile Money phone number to complete payment.');
      return;
    }

    if (buyPaymentMethod === 'wallet' && (wallet?.availableBalance || 0) < buyModalListing.askingPrice) {
      setBuyError(
        `Insufficient wallet balance. Available: ${(wallet?.availableBalance || 0).toLocaleString()} UGX, Required: ${buyModalListing.askingPrice.toLocaleString()} UGX.`
      );
      return;
    }

    setIsPurchasingTransfer(true);
    try {
      const res = await purchaseDeveloperAppTransfer(buyModalListing.id, {
        paymentMethod: buyPaymentMethod,
        phoneNumber: buyPaymentMethod !== 'wallet' ? buyPhoneNumber.trim() : undefined
      });
      setBuyModalListing(null);
      setTransfersFeedback({ type: 'success', text: res.message });
      setMyAppsMessage({
        type: 'success',
        text: `Ownership acquired! You now have full control and full rights over "${res.app.name}".`
      });
      await Promise.all([loadMyApps(), loadTransfers(), loadWallet()]);
      setActiveTab('my-apps');
    } catch (err: any) {
      setBuyError(err.message || 'Failed to process app ownership transfer payment.');
    } finally {
      setIsPurchasingTransfer(false);
    }
  };

  const openEditAppModal = (app: StoreApp) => {
    setEditModalApp(app);
    setEditName(app.name);
    setEditTagline(app.tagline || '');
    setEditDescription(app.description || '');
    setEditCategory(app.category || 'Streaming');
    setEditPackageId(app.packageId || '');
    setEditEdition(app.appEdition || 'phone');
    setEditDirectUrl(app.releases?.[0]?.directDownloadUrl || '');
    setEditPricingType(app.pricing?.type || 'free');
    setEditPrice(app.pricing?.price || 5000);
    setEditCurrency(app.pricing?.currency || 'UGX');
    setEditIconUrl(app.iconUrl || '');
    setEditError(null);
  };

  const handleEditIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = await convertImageToDataUrl(e.target.files[0]);
      setEditIconUrl(url);
      e.target.value = '';
    }
  };

  const handleSaveOwnedAppEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalApp) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Application name is required.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await updateDeveloperOwnedApp(editModalApp.id, {
        name: editName.trim(),
        tagline: editTagline.trim(),
        description: editDescription.trim(),
        category: editCategory,
        packageId: editPackageId.trim(),
        appEdition: editEdition,
        isTvCompatible: editEdition === 'tv' || editEdition === 'both',
        directDownloadUrl: editDirectUrl.trim() || undefined,
        iconUrl: editIconUrl.trim() || undefined,
        pricing: {
          type: editPricingType,
          price: editPricingType === 'paid' ? editPrice : 0,
          currency: editCurrency
        }
      });
      setEditModalApp(null);
      setMyAppsMessage({ type: 'success', text: res.message });
      await loadMyApps();
    } catch (err: any) {
      setEditError(err.message || 'Failed to save app updates.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openReleaseModal = (app: StoreApp) => {
    setReleaseModalApp(app);
    setRelVersion('');
    setRelPlatform(app.appEdition === 'tv' ? 'Android TV' : 'Android');
    setRelMinOS('Android 8.0+');
    setRelChangelog('');
    setRelApkFile(null);
    setRelDirectUrl('');
    setRelError(null);
  };

  const handlePublishAppRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseModalApp) return;
    setRelError(null);

    if (!relVersion.trim()) {
      setRelError('Version string is required (e.g. 2.0.0).');
      return;
    }

    if (!relApkFile && !relDirectUrl.trim()) {
      setRelError('Please upload an APK file or provide a direct download URL.');
      return;
    }

    setIsPublishingRelease(true);
    try {
      const fd = new FormData();
      fd.append('version', relVersion.trim());
      fd.append('platform', relPlatform);
      fd.append('minOS', relMinOS.trim() || 'Android 8.0+');
      fd.append('changelog', relChangelog.trim() || 'Performance improvements and bug fixes.');
      if (relApkFile) {
        fd.append('apkFile', relApkFile);
      }
      if (relDirectUrl.trim()) {
        fd.append('directDownloadUrl', relDirectUrl.trim());
      }

      const res = await addDeveloperOwnedAppRelease(releaseModalApp.id, fd);
      setReleaseModalApp(null);
      setMyAppsMessage({ type: 'success', text: res.message });
      await loadMyApps();
    } catch (err: any) {
      setRelError(err.message || 'Failed to publish new release.');
    } finally {
      setIsPublishingRelease(false);
    }
  };

  const handleLogout = () => {
    developerLogout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Store</span>
            </button>
            <div className="h-4 w-px bg-neutral-800" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-neutral-950 font-black text-xs shadow-md">
                DEV
              </div>
              <div>
                <h1 className="text-sm font-black text-white leading-none">Developer Console</h1>
                <p className="text-[11px] text-amber-400 font-medium mt-0.5">
                  {developer.name} {developer.companyName ? `• ${developer.companyName}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs text-neutral-400 font-mono bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
              {developer.email}
            </span>
            <button
              onClick={handleLogout}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Platform Broadcast Banner */}
      {broadcast && broadcast.active && broadcast.message && (
        <div
          className={`py-2.5 px-4 border-b text-xs shadow-md ${
            broadcast.level === 'alert'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : broadcast.level === 'warning'
              ? 'bg-amber-950/90 border-amber-800 text-amber-200'
              : 'bg-cyan-950/90 border-cyan-800 text-cyan-200'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="font-semibold">{broadcast.message}</span>
            </div>
            {broadcast.link && broadcast.linkText && (
              <a
                href={broadcast.link}
                className="font-bold underline text-[11px] shrink-0 hover:opacity-80"
              >
                {broadcast.linkText} →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Account Frozen or Banned Security Notice */}
      {isBanned && (
        <div className="bg-rose-950 border-b border-rose-800 py-3 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto flex items-center gap-3 text-rose-200 text-xs">
            <Ban className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="font-bold text-white">Account Banned by Super Admin:</strong>{' '}
              {developer.banReason || 'This developer account has been suspended for violating store distribution policies.'}
            </div>
          </div>
        </div>
      )}

      {isFrozen && !isBanned && (
        <div className="bg-cyan-950 border-b border-cyan-800 py-3 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto flex items-center gap-3 text-cyan-200 text-xs">
            <Snowflake className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <strong className="font-bold text-white">Account Temporarily Frozen:</strong>{' '}
              {developer.banReason || 'Publishing privileges are suspended for administrative review.'}{' '}
              New app submissions are currently disabled.
            </div>
          </div>
        </div>
      )}

      {/* Protector Technologies Developer & Payment Agreement Prompt for Existing Accounts */}
      {!developer.agreementsAccepted && (
        <div className="bg-amber-950/50 border-b border-amber-500/40 py-3.5 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-amber-300">
                Protector Technologies — Developer &amp; Payment Agreement Update
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                By continuing to publish apps, sell ownership, or withdraw earnings, you agree to Protector Technologies&apos; payment terms: 6% paid app commission, 10% app ownership transfer commission, and {feeRatePer1000} UGX per 1,000 UGX withdrawal charge.{' '}
                {onOpenLegal && (
                  <button
                    type="button"
                    onClick={() => onOpenLegal('developer-payment')}
                    className="text-amber-400 font-semibold hover:underline cursor-pointer"
                  >
                    Read Full Agreement
                  </button>
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={isAcceptingAgreement}
              onClick={async () => {
                setIsAcceptingAgreement(true);
                try {
                  const res = await acceptDeveloperAgreements(AGREEMENTS_VERSION);
                  if (res.developer && onDeveloperUpdated) {
                    onDeveloperUpdated(res.developer);
                  }
                } catch (_) {
                } finally {
                  setIsAcceptingAgreement(false);
                }
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isAcceptingAgreement ? 'Saving...' : 'Agree & Accept Terms'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-neutral-800 pb-4 mb-6">
          <div className="flex flex-wrap bg-neutral-900 p-1 rounded-xl border border-neutral-800 gap-1">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'submit'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publish New App</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('my-apps');
                loadMyApps();
              }}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'my-apps'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>My Submissions</span>
              {myApps.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-neutral-800 text-neutral-200 text-[10px] rounded-full">
                  {myApps.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('transfers');
                loadTransfers();
              }}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'transfers'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>App Transfers &amp; Market</span>
              {incomingTransfers.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-500 text-neutral-950 font-black text-[10px] rounded-full">
                  {incomingTransfers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('wallet');
                loadWallet();
              }}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'wallet'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Earnings &amp; Wallet</span>
              {wallet && wallet.availableBalance > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 font-mono text-[10px] rounded-full border border-emerald-500/30">
                  {wallet.availableBalance.toLocaleString()} {wallet.currency}
                </span>
              )}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-amber-300/80 bg-amber-950/30 border border-amber-800/40 px-3 py-1.5 rounded-xl shrink-0">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>10% Admin Fee on App Sales Transfers</span>
          </div>
        </div>

        {/* TAB 1: SUBMIT NEW APP */}
        {activeTab === 'submit' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-black text-white tracking-tight">Submit Your Android / TV Application</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Upload your APK, icon, screenshots, and brief app information. The Super Admin will review and verify your app before making it live to all store visitors.
              </p>
            </div>

            {submitSuccess && (
              <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs animate-fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-200">Submission Successful!</h4>
                  <p className="mt-0.5 leading-relaxed">{submitSuccess}</p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-rose-300 text-xs">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
                {(submitError.toLowerCase().includes('session') || submitError.toLowerCase().includes('sign in')) && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    Sign Out &amp; Sign In Again
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-2">
                  1. Application Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Application Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. AnimeWave HD"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Target Edition <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAppEdition('phone')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          appEdition === 'phone'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Phone / Tablet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppEdition('tv')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          appEdition === 'tv'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Tv className="w-4 h-4" />
                        <span>Smart TV Edition</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Brief Information / Tagline <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={briefInfo}
                    onChange={(e) => setBriefInfo(e.target.value)}
                    placeholder="Short 1-sentence summary of what this app does"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    This brief information is displayed on app preview cards across the store.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Detailed Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write a clear overview of features, streaming capabilities, or interface details..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
                    >
                      <option value="Streaming">Streaming</option>
                      <option value="Anime">Anime</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Media Player">Media Player</option>
                      <option value="Tools">Tools</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Version</label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="1.0.0"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Package ID (Optional)</label>
                    <input
                      type="text"
                      value={packageId}
                      onChange={(e) => setPackageId(e.target.value)}
                      placeholder="com.example.app"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Media Assets (Icon & Screenshots) */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-2">
                  2. Visual Assets (Icon & Screenshots)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* App Icon */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Application Icon
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-neutral-950 border-2 border-dashed border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                        {iconPreview ? (
                          <img src={iconPreview} alt="Icon preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-neutral-600" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Choose Icon File</span>
                          <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
                        </label>
                        <input
                          type="text"
                          value={iconUrlFallback}
                          onChange={(e) => setIconUrlFallback(e.target.value)}
                          placeholder="Or paste image URL"
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg py-1.5 px-3 text-[11px] text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Screenshots */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Screenshots
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors mb-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Screenshot Images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleScreenshotsChange}
                        className="hidden"
                      />
                    </label>

                    {screenshotPreviews.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 mt-1">
                        {screenshotPreviews.map((url, i) => (
                          <div key={i} className="relative shrink-0 group">
                            <img
                              src={url}
                              alt={`Preview ${i}`}
                              className="w-14 h-24 object-cover rounded-lg border border-neutral-800"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveScreenshot(i)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow hover:bg-rose-500 cursor-pointer"
                              aria-label={`Remove screenshot ${i + 1}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: APK Delivery */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-2">
                  3. APK Delivery (File Upload or Direct Download Link)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-white">
                        Option A: Upload APK File
                      </label>
                      {apkFile && (
                        <button
                          type="button"
                          onClick={() => setApkFile(null)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                        >
                          Clear file
                        </button>
                      )}
                    </div>
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-xl cursor-pointer transition-colors text-center">
                      <FileCode className="w-8 h-8 text-neutral-500 mb-2" />
                      <span className="text-xs font-bold text-neutral-200 break-all">
                        {apkFile ? apkFile.name : 'Select .apk File'}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1">
                        {apkFile ? `${(apkFile.size / (1024 * 1024)).toFixed(1)} MB` : 'For large APKs (>25MB), Option B cloud link is recommended'}
                      </span>
                      <input type="file" accept=".apk" onChange={handleApkChange} className="hidden" />
                    </label>
                  </div>

                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="block text-xs font-semibold text-white">
                      Option B: Direct Download / Cloud Link
                    </label>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Google Drive share link (set to "Anyone with the link"), Dropbox, or GitHub releases.
                    </p>
                    <input
                      type="text"
                      value={directDownloadUrl}
                      onChange={(e) => setDirectDownloadUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Monetization & Pricing (Free or Paid App) */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-neutral-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    4. Monetization &amp; Pricing (Free vs. Paid App)
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    Super Admin 6% Platform Fee applies on sales
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Free App */}
                  <div
                    onClick={() => setPricingType('free')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      pricingType === 'free'
                        ? 'bg-amber-950/20 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          pricingType === 'free' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'
                        }`}>
                          FREE
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">100% Free Application</h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Users can download this APK freely without payment.
                          </p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        pricingType === 'free' ? 'border-amber-500 bg-amber-500' : 'border-neutral-700'
                      }`}>
                        {pricingType === 'free' && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Paid App */}
                  <div
                    onClick={() => setPricingType('paid')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      pricingType === 'paid'
                        ? 'bg-amber-950/20 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          pricingType === 'paid' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'
                        }`}>
                          PAID
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Paid Premium Application</h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Charge users before they can download your APK.
                          </p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        pricingType === 'paid' ? 'border-amber-500 bg-amber-500' : 'border-neutral-700'
                      }`}>
                        {pricingType === 'paid' && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* If Paid App selected: price inputs and commission transparency breakdown */}
                {pricingType === 'paid' && (
                  <div className="p-4 bg-neutral-950 border border-neutral-800/90 rounded-2xl space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                          Price <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={currency === 'USD' ? 1 : 500}
                            step={currency === 'USD' ? '0.01' : '100'}
                            required={pricingType === 'paid'}
                            value={price}
                            onChange={(e) => {
                              const parsed = currency === 'USD' ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                              setPrice(isNaN(parsed) ? 0 : Math.max(0, parsed));
                            }}
                            placeholder={currency === 'USD' ? '5' : '5000'}
                            className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-mono">
                            {currency}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Currency</label>
                        <select
                          value={currency}
                          onChange={(e) => {
                            const nextCurr = e.target.value;
                            setCurrency(nextCurr);
                            if (nextCurr === 'USD' && price >= 500) setPrice(5);
                            if (nextCurr === 'UGX' && price < 500) setPrice(5000);
                          }}
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                        >
                          <option value="UGX">UGX (Ugandan Shillings)</option>
                          <option value="USD">USD (US Dollars)</option>
                        </select>
                      </div>
                    </div>

                    {/* Commission Split Live Preview */}
                    <div className="p-3.5 bg-neutral-900/80 rounded-xl border border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        Real Money Earnings &amp; {adminCommissionPercent}% Super Admin Commission Breakdown
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                          <span className="text-[10px] text-neutral-400 block">Gross Sale Price</span>
                          <span className="text-xs font-black text-white font-mono">
                            {price.toLocaleString()} {currency}
                          </span>
                        </div>
                        <div className="p-2 bg-rose-950/30 rounded-lg border border-rose-900/40">
                          <span className="text-[10px] text-rose-300 block">Super Admin {adminCommissionPercent}% Fee</span>
                          <span className="text-xs font-black text-rose-400 font-mono">
                            -{Math.round((price * adminCommissionPercent) / 100).toLocaleString()} {currency}
                          </span>
                        </div>
                        <div className="p-2 bg-emerald-950/30 rounded-lg border border-emerald-900/40">
                          <span className="text-[10px] text-emerald-300 block">Your Net Take-Home ({Math.max(0, 100 - adminCommissionPercent)}%)</span>
                          <span className="text-xs font-black text-emerald-400 font-mono">
                            {(price - Math.round((price * adminCommissionPercent) / 100)).toLocaleString()} {currency}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-400 pt-1">
                        When users buy your app, you see the real money sold for and your net balance after the {adminCommissionPercent}% Super Admin commission is credited directly to your Developer Wallet.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-neutral-400">
                  By submitting, you confirm this application complies with copyright and safe distribution rules.
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || isProcessingAssets || isFrozen || isBanned}
                  className="w-full sm:w-auto py-3 px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Submitting for Review...</span>
                    </>
                  ) : isBanned ? (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Account Banned</span>
                    </>
                  ) : isFrozen ? (
                    <>
                      <Snowflake className="w-4 h-4" />
                      <span>Account Frozen</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit for Super Admin Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MY SUBMISSIONS & OWNED APPS (FULL CONTROL & TRANSFER RIGHTS) */}
        {activeTab === 'my-apps' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">Your Owned &amp; Submitted Applications</h2>
                <p className="text-xs text-neutral-400">
                  Full owner rights: edit metadata, push new APK updates, or sell/transfer ownership to another developer
                </p>
              </div>
              <button
                onClick={() => {
                  loadMyApps();
                  loadTransfers();
                }}
                className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {myAppsMessage && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 ${
                  myAppsMessage.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/40 border border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {myAppsMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{myAppsMessage.text}</span>
                </div>
                <button
                  onClick={() => setMyAppsMessage(null)}
                  className="text-[11px] font-bold underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isLoadingApps ? (
              <div className="py-20 text-center">
                <span className="inline-block w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-neutral-400 mt-3">Loading your applications...</p>
              </div>
            ) : myApps.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No applications in your account yet</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Submit a new Android/TV app or acquire full ownership of an existing app from the App Transfers &amp; Market tab.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="py-2 px-5 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Submit an App</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('transfers');
                      loadTransfers();
                    }}
                    className="py-2 px-5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>Browse Transfer Market</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myApps.map((app) => {
                  const status = app.approvalStatus || 'approved';
                  const openListing = myTransferListings.find((l) => l.appId === app.id && l.status === 'open');
                  const latestTransfer = app.ownershipHistory?.[0];

                  return (
                    <div
                      key={app.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={app.iconUrl || '/zuzustore-logo.png'}
                            alt={app.name}
                            className="w-14 h-14 rounded-2xl object-cover bg-neutral-950 border border-neutral-800 p-0.5 shrink-0"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/zuzustore-logo.png';
                            }}
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-extrabold text-white">{app.name}</h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-950 text-neutral-300 border border-neutral-800">
                                v{app.currentVersion}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {app.appEdition === 'tv' ? 'TV Edition' : app.appEdition === 'both' ? 'Phone & TV' : 'Phone'}
                              </span>
                              {app.pricing?.type === 'paid' && Number(app.pricing.price) > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                                  Paid: {Number(app.pricing.price).toLocaleString()} {app.pricing.currency || 'UGX'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                                  Free
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{app.tagline}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                              Package: {app.packageId} • Category: {app.category}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {app.isTakenDown ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold">
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Taken Down</span>
                            </span>
                          ) : status === 'pending_approval' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>Pending Review</span>
                            </span>
                          ) : status === 'approved' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Live on Store</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Requires Changes</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Acquired Ownership / Open Transfer Listing Indicators */}
                      {latestTransfer && (
                        <div className="p-2.5 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-[11px] text-indigo-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>
                              Full ownership acquired from <strong>{latestTransfer.fromName}</strong>
                              {latestTransfer.pricePaid
                                ? ` for ${latestTransfer.pricePaid.toLocaleString()} ${latestTransfer.currency || 'UGX'}`
                                : ''}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-indigo-300">
                            {new Date(latestTransfer.transferredAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {openListing && (
                        <div className="p-2.5 bg-amber-950/30 border border-amber-700/40 rounded-xl text-[11px] text-amber-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              Listed for transfer at{' '}
                              <strong className="font-mono">{openListing.askingPrice.toLocaleString()} UGX</strong>
                              {openListing.targetBuyerEmail
                                ? ` → Offered to ${openListing.targetBuyerEmail}`
                                : ' → Open Developer Market'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancelTransfer(openListing.id)}
                            disabled={cancellingTransferId === openListing.id}
                            className="text-[11px] font-bold text-rose-300 hover:text-rose-200 underline cursor-pointer"
                          >
                            {cancellingTransferId === openListing.id ? 'Cancelling...' : 'Cancel Offer'}
                          </button>
                        </div>
                      )}

                      {/* Takedown notice if taken down */}
                      {app.isTakenDown && (
                        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                          <EyeOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-200">Taken Down by Super Admin:</span>{' '}
                            {app.takedownReason || 'Taken down by Super Admin for platform review.'}
                          </div>
                        </div>
                      )}

                      {/* Rejection / Feedback Note if rejected */}
                      {status === 'rejected' && app.rejectionReason && (
                        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-200">Super Admin Feedback:</span>{' '}
                            {app.rejectionReason}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions (Full Owner Control) */}
                      <div className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
                        <div className="flex items-center gap-4">
                          <span>Downloads: <strong className="text-white">{app.downloadsTotal || 0}</strong></span>
                          <span>Rating: <strong className="text-amber-400">{app.rating > 0 ? `★ ${app.rating}` : 'New'}</strong></span>
                          <span>Releases: <strong className="text-white">{app.releases?.length || 0}</strong></span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isFrozen || isBanned}
                            onClick={() => openEditAppModal(app)}
                            className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>Edit App</span>
                          </button>

                          <button
                            type="button"
                            disabled={isFrozen || isBanned}
                            onClick={() => openReleaseModal(app)}
                            className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <UploadCloud className="w-3 h-3 text-cyan-400" />
                            <span>Release Update</span>
                          </button>

                          <button
                            type="button"
                            disabled={isFrozen || isBanned}
                            onClick={() => openSellTransferModal(app)}
                            className="py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Sell / Transfer</span>
                          </button>

                          {status === 'approved' && (
                            <a
                              href={`/#app-${app.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                onBackToStore();
                              }}
                              className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Store</span>
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={isFrozen || isBanned}
                            onClick={() => setWithdrawAppModal(app)}
                            className="py-1.5 px-3 bg-neutral-950 hover:bg-rose-950/50 hover:text-rose-400 text-neutral-400 border border-neutral-800 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Withdraw</span>
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

        {/* TAB 3: DEVELOPER-TO-DEVELOPER APP OWNERSHIP TRANSFERS & MARKET */}
        {activeTab === 'transfers' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-white">App Ownership Sales &amp; Transfers</h2>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    10% Super Admin Fee • 90% to Seller Wallet
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Sell full app ownership &amp; rights to another developer directly on the website. All money transfers happen in-platform; standard withdrawal fees ({feeRatePer1000} UGX per 1,000 UGX) apply when withdrawing from your wallet.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={loadTransfers}
                  disabled={isLoadingTransfers}
                  className="py-1.5 px-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTransfers ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Refresh</span>
                </button>
                {myApps.length > 0 && (
                  <button
                    type="button"
                    disabled={isFrozen || isBanned}
                    onClick={() => openSellTransferModal(myApps[0])}
                    className="py-1.5 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Sell an App</span>
                  </button>
                )}
              </div>
            </div>

            {transfersFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 ${
                  transfersFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/40 border border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {transfersFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{transfersFeedback.text}</span>
                </div>
                <button
                  onClick={() => setTransfersFeedback(null)}
                  className="font-bold underline text-[11px] shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Incoming Direct Offers Targeted at Me */}
            <div className="bg-neutral-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Direct Ownership Offers Sent to You</h3>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {incomingTransfers.length} awaiting payment
                </span>
              </div>

              {incomingTransfers.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  No direct ownership transfer offers targeted to your account right now.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingTransfers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/30 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={offer.appIcon || '/zuzustore-logo.png'}
                            alt={offer.appName}
                            className="w-11 h-11 rounded-xl object-cover bg-neutral-900 border border-neutral-800"
                          />
                          <div>
                            <div className="font-bold text-white text-sm">{offer.appName}</div>
                            <div className="text-[11px] text-neutral-400">
                              v{offer.appVersion} • {offer.appCategory}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            {offer.askingPrice.toLocaleString()} {offer.currency}
                          </div>
                          <div className="text-[10px] text-neutral-500">Full ownership rights</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-300 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800 space-y-1">
                        <div>
                          Seller: <strong className="text-white">{offer.sellerName}</strong> ({offer.sellerEmail})
                        </div>
                        {offer.note && <div className="text-neutral-400 italic">"{offer.note}"</div>}
                      </div>

                      <button
                        type="button"
                        disabled={isFrozen || isBanned}
                        onClick={() => openBuyTransferModal(offer)}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay {offer.askingPrice.toLocaleString()} {offer.currency} &amp; Claim Ownership</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open Developer Ownership Market */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Open Developer Ownership Marketplace</h3>
                </div>
                <span className="text-xs font-mono text-neutral-400">{marketTransfers.length} available</span>
              </div>

              {marketTransfers.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  No open marketplace listings from other developers right now.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketTransfers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={offer.appIcon || '/zuzustore-logo.png'}
                            alt={offer.appName}
                            className="w-11 h-11 rounded-xl object-cover bg-neutral-900 border border-neutral-800"
                          />
                          <div>
                            <div className="font-bold text-white text-sm">{offer.appName}</div>
                            <div className="text-[11px] text-neutral-400">
                              v{offer.appVersion} • {offer.appCategory}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-amber-400 font-mono">
                            {offer.askingPrice.toLocaleString()} {offer.currency}
                          </div>
                          <div className="text-[10px] text-neutral-500">Includes full rights</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-400">
                        Owner: <strong className="text-neutral-200">{offer.sellerName}</strong> ({offer.sellerEmail})
                        {offer.note ? <p className="mt-1 italic text-neutral-400">"{offer.note}"</p> : null}
                      </div>

                      <button
                        type="button"
                        disabled={isFrozen || isBanned}
                        onClick={() => openBuyTransferModal(offer)}
                        className="w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Buy Ownership ({offer.askingPrice.toLocaleString()} {offer.currency})</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Your Active Outgoing Transfer Listings */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Your Active Apps Listed for Transfer</h3>
                </div>
                <span className="text-xs font-mono text-neutral-400">{myTransferListings.length} active</span>
              </div>

              {myTransferListings.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  You have no active transfer offers. Open &ldquo;My Submissions&rdquo; and click &ldquo;Sell / Transfer&rdquo; on any app you own.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[11px] font-semibold text-neutral-400">
                        <th className="pb-2.5">Application</th>
                        <th className="pb-2.5">Target Recipient</th>
                        <th className="pb-2.5">Asking Price</th>
                        <th className="pb-2.5">10% Admin Fee</th>
                        <th className="pb-2.5">Your 90% Net</th>
                        <th className="pb-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {myTransferListings.map((l) => (
                        <tr key={l.id} className="text-neutral-300">
                          <td className="py-3 font-bold text-white">{l.appName}</td>
                          <td className="py-3 font-mono text-[11px]">
                            {l.targetBuyerEmail ? `${l.targetBuyerName || ''} (${l.targetBuyerEmail})` : 'Open Market'}
                          </td>
                          <td className="py-3 font-mono font-bold text-white">
                            {l.askingPrice.toLocaleString()} {l.currency}
                          </td>
                          <td className="py-3 font-mono text-rose-400">
                            -{l.adminFeeAmount.toLocaleString()} {l.currency}
                          </td>
                          <td className="py-3 font-mono font-black text-emerald-400">
                            +{l.sellerNetAmount.toLocaleString()} {l.currency}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleCancelTransfer(l.id)}
                              disabled={cancellingTransferId === l.id}
                              className="px-2.5 py-1 bg-neutral-950 hover:bg-rose-950/60 text-rose-400 border border-neutral-800 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              {cancellingTransferId === l.id ? 'Cancelling...' : 'Cancel Offer'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Completed & Cancelled Transfer History */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-bold text-white">Ownership Transfer History</h3>
                </div>
                <span className="text-xs font-mono text-neutral-400">{transferHistory.length} records</span>
              </div>

              {transferHistory.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">No completed or cancelled transfers yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[11px] font-semibold text-neutral-400">
                        <th className="pb-2.5">Date</th>
                        <th className="pb-2.5">App</th>
                        <th className="pb-2.5">From → To</th>
                        <th className="pb-2.5">Price</th>
                        <th className="pb-2.5">10% Admin Fee</th>
                        <th className="pb-2.5">Seller 90% Net</th>
                        <th className="pb-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {transferHistory.map((h) => (
                        <tr key={h.id} className="text-neutral-300">
                          <td className="py-3 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                            {new Date(h.completedAt || h.cancelledAt || h.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-bold text-white">{h.appName}</td>
                          <td className="py-3 text-[11px]">
                            <span>{h.sellerEmail}</span> →{' '}
                            <strong className="text-amber-300">{h.buyerEmail || h.targetBuyerEmail || 'Market'}</strong>
                          </td>
                          <td className="py-3 font-mono font-bold text-white whitespace-nowrap">
                            {h.askingPrice.toLocaleString()} {h.currency}
                          </td>
                          <td className="py-3 font-mono text-rose-400 whitespace-nowrap">
                            {h.adminFeeAmount.toLocaleString()} {h.currency}
                          </td>
                          <td className="py-3 font-mono text-emerald-400 whitespace-nowrap">
                            {h.sellerNetAmount.toLocaleString()} {h.currency}
                          </td>
                          <td className="py-3">
                            {h.status === 'completed' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                Transferred
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-bold">
                                Cancelled
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: EARNINGS & WALLET (REAL MONEY SALES, 6% COMMISSION & WITHDRAWALS >= 1,000) */}
        {activeTab === 'wallet' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header and Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">Developer Earnings &amp; Wallet</h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    6% Admin Commission Applied
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  View real money earned from your paid apps, 6% Super Admin commission deductions, and request payouts.
                </p>
              </div>

              <button
                type="button"
                onClick={loadWallet}
                disabled={isLoadingWallet}
                className="py-1.5 px-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWallet ? 'animate-spin text-amber-400' : ''}`} />
                <span>Refresh Wallet</span>
              </button>
            </div>

            {/* Notification Messages */}
            {walletMessage && (
              <div
                className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-fade-in ${
                  walletMessage.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/40 border border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {walletMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{walletMessage.text}</span>
                </div>
                <button
                  onClick={() => setWalletMessage(null)}
                  className="font-bold underline text-[11px] shrink-0 hover:opacity-80"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Financial Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* Card 1: Available Balance */}
              <div className="p-4 bg-gradient-to-br from-amber-950/50 via-neutral-900 to-neutral-900 border border-amber-500/40 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-neutral-400 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    Available Balance
                  </span>
                  <Wallet className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white tabular-nums tracking-tight">
                  {(wallet?.availableBalance || 0).toLocaleString()}{' '}
                  <span className="text-xs text-amber-400 font-mono">{wallet?.currency || 'UGX'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 mt-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Ready to Withdraw (Min 1,000)</span>
                </div>
              </div>

              {/* Card 2: Total Gross Sales */}
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-neutral-400 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Gross App Sales</span>
                  <DollarSign className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-xl font-black text-neutral-100 tabular-nums">
                  {(wallet?.totalGrossRevenue || 0).toLocaleString()}{' '}
                  <span className="text-xs text-neutral-400 font-mono">{wallet?.currency || 'UGX'}</span>
                </div>
                <div className="text-[10px] text-neutral-500 mt-2">
                  Real total money paid by buyers
                </div>
              </div>

              {/* Card 3: 6% Admin Fee Deducted */}
              <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-rose-300 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Super Admin 6% Fee</span>
                  <Receipt className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-xl font-black text-rose-300 tabular-nums">
                  {(wallet?.totalAdminFeesPaid || 0).toLocaleString()}{' '}
                  <span className="text-xs text-rose-400 font-mono">{wallet?.currency || 'UGX'}</span>
                </div>
                <div className="text-[10px] text-rose-400/80 mt-2">
                  6% store fee automatically deducted
                </div>
              </div>

              {/* Card 4: Total Withdrawn */}
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-neutral-400 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Total Withdrawn</span>
                  <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-emerald-400 tabular-nums">
                  {(wallet?.totalWithdrawn || 0).toLocaleString()}{' '}
                  <span className="text-xs text-neutral-400 font-mono">{wallet?.currency || 'UGX'}</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-2">
                  Pending: <strong className="text-amber-400 font-mono">{(wallet?.pendingWithdrawals || 0).toLocaleString()} {wallet?.currency || 'UGX'}</strong>
                </div>
              </div>
            </div>

            {/* WITHDRAWAL REQUEST MODULE */}
            <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Request Payout / Withdrawal</h3>
                    <p className="text-[11px] text-neutral-400">
                      Disburse money directly to MTN MoMo, Airtel Money, Bank Account, or PayPal.
                    </p>
                  </div>
                </div>

                <div className="px-3 py-1 bg-amber-950/40 border border-amber-800/60 rounded-full text-[11px] font-bold text-amber-300 self-start sm:self-auto">
                  ★ Minimum withdrawal starts from 1,000 UGX
                </div>
              </div>

              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Amount Field */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Withdrawal Amount (UGX) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1000"
                        step="500"
                        required
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                        placeholder="1000"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-mono">UGX</span>
                    </div>

                    {/* Quick amount shortcuts */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(1000)}
                        className="px-2 py-0.5 text-[10px] rounded-md bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors cursor-pointer"
                      >
                        Min: 1,000 UGX
                      </button>
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(5000)}
                        className="px-2 py-0.5 text-[10px] rounded-md bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors cursor-pointer"
                      >
                        5,000 UGX
                      </button>
                      {wallet && wallet.availableBalance >= 1000 && (
                        <button
                          type="button"
                          onClick={() => setWithdrawAmount(wallet.availableBalance)}
                          className="px-2 py-0.5 text-[10px] rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors cursor-pointer"
                        >
                          Max All ({wallet.availableBalance.toLocaleString()} UGX)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payout Method */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Payout Method <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={withdrawMethod}
                      onChange={(e) => setWithdrawMethod(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
                    >
                      <option value="mobile_money_mtn">MTN Mobile Money (⚡ Instant LivePay Payout)</option>
                      <option value="mobile_money_airtel">Airtel Money (⚡ Instant LivePay Payout)</option>
                    </select>
                  </div>
                </div>

                {/* Account Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Account Registered Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={payoutAccountName}
                      onChange={(e) => setPayoutAccountName(e.target.value)}
                      placeholder="e.g. John Sseruwagi"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      {withdrawMethod === 'mobile_money_mtn' ? 'MTN Mobile Money Phone Number' : 'Airtel Money Phone Number'} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={payoutAccountNumber}
                      onChange={(e) => setPayoutAccountNumber(e.target.value)}
                      placeholder="e.g. 0770 000 000 or 0750 000 000"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Live Sending Network Charge & Net Handset Payout Calculation */}
                {withdrawAmount >= 1000 && (
                  <div className="p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-neutral-300 flex items-center gap-1.5">
                        <ArrowDownToLine className="w-3.5 h-3.5 text-amber-400" />
                        <span>Withdrawal Payout &amp; Sending Fee Breakdown</span>
                      </span>
                      <span className="text-[10px] text-amber-400/90 font-mono">
                        Rule: 100 UGX deducted per 1,000 UGX
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center pt-1 font-mono text-xs">
                      <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                        <span className="text-[10px] text-neutral-400 block font-sans">Requested Gross</span>
                        <span className="font-bold text-white">
                          {withdrawAmount.toLocaleString()} UGX
                        </span>
                      </div>
                      <div className="p-2 bg-rose-950/30 rounded-lg border border-rose-900/40">
                        <span className="text-[10px] text-rose-300 block font-sans">Network Sending Charge</span>
                        <span className="font-bold text-rose-400">
                          -{Math.round((withdrawAmount / 1000) * feeRatePer1000).toLocaleString()} UGX
                        </span>
                      </div>
                      <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-800/60">
                        <span className="text-[10px] text-emerald-300 block font-sans font-bold">Net Cash to Handset</span>
                        <span className="font-black text-emerald-400 text-sm">
                          {Math.max(0, withdrawAmount - Math.round((withdrawAmount / 1000) * feeRatePer1000)).toLocaleString()} UGX
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-neutral-400">
                      The 100 UGX sending charge on every 1,000 UGX is automatically deducted to cover mobile money network distribution costs when sending the payout to your phone number.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-800">
                  <span className="text-[11px] text-neutral-400">
                    Subject to{' '}
                    {onOpenLegal ? (
                      <button
                        type="button"
                        onClick={() => onOpenLegal('developer-payment')}
                        className="text-amber-400 hover:underline cursor-pointer"
                      >
                        Protector Technologies Developer Payment Agreement
                      </button>
                    ) : (
                      'Protector Technologies Developer Payment Agreement'
                    )}{' '}
                    ({feeRatePer1000} UGX per 1,000 UGX sending charge).
                  </span>

                  <button
                    type="submit"
                    disabled={isSubmittingWithdrawal || !wallet || (wallet?.availableBalance || 0) < 1000}
                    className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingWithdrawal ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span>Request Payout ({withdrawAmount.toLocaleString()} UGX)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* WITHDRAWALS HISTORY */}
            <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-bold text-white">Your Payout Requests &amp; Status</h3>
                <span className="text-xs text-neutral-400 font-mono">{withdrawals.length} total</span>
              </div>

              {withdrawals.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No withdrawal requests made yet. When your sales reach 1,000 UGX or more, you can submit your first payout request here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[11px] font-semibold text-neutral-400">
                        <th className="pb-2.5">Date</th>
                        <th className="pb-2.5">Gross Requested</th>
                        <th className="pb-2.5">Sending Fee</th>
                        <th className="pb-2.5">Net to Handset</th>
                        <th className="pb-2.5">Method</th>
                        <th className="pb-2.5">Account Details</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5">Transaction Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {withdrawals.map((w) => {
                        const fee = w.transferFee !== undefined ? w.transferFee : Math.round((w.amount / 1000) * 100);
                        const netAmount = w.netPayoutAmount !== undefined ? w.netPayoutAmount : Math.max(0, w.amount - fee);

                        return (
                          <tr key={w.id} className="text-neutral-300">
                            <td className="py-3 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                              {new Date(w.requestedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 font-bold text-white font-mono whitespace-nowrap">
                              {w.amount.toLocaleString()} {w.currency}
                            </td>
                            <td className="py-3 font-mono text-rose-400 text-xs whitespace-nowrap">
                              -{fee.toLocaleString()} {w.currency}
                            </td>
                            <td className="py-3 font-black text-amber-300 font-mono text-sm whitespace-nowrap">
                              {netAmount.toLocaleString()} {w.currency}
                            </td>
                            <td className="py-3 capitalize whitespace-nowrap">
                              {w.payoutMethod.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 font-mono text-[11px]">
                              {w.payoutDetails.accountName} • {w.payoutDetails.accountNumber}
                            </td>
                          <td className="py-3">
                            {w.status === 'paid' || w.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                <CheckCircle className="w-3 h-3" />
                                <span>Paid</span>
                              </span>
                            ) : w.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                <Clock className="w-3 h-3 animate-pulse" />
                                <span>Pending Admin</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                                <XCircle className="w-3 h-3" />
                                <span>Rejected</span>
                              </span>
                            )}
                            {w.rejectionReason && (
                              <p className="text-[10px] text-rose-400 mt-0.5">{w.rejectionReason}</p>
                            )}
                          </td>
                          <td className="py-3 font-mono text-[11px] text-neutral-400">
                            {w.transactionRef || '—'}
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                    </table>
                </div>
              )}
            </div>

            {/* CUSTOMER SALES & OWNERSHIP TRANSFER LEDGER */}
            <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Revenue &amp; Ownership Transfer Ledger</h3>
                  <p className="text-[11px] text-neutral-400">
                    Real transactions showing app sales ({adminCommissionPercent}% Admin cut) and ownership transfers (10% Admin cut, 90% Seller net).
                  </p>
                </div>
                <span className="text-xs text-neutral-400 font-mono">
                  {wallet?.recentSales?.length || 0} transactions
                </span>
              </div>

              {!wallet?.recentSales || wallet.recentSales.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No sales or ownership transfer earnings recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[11px] font-semibold text-neutral-400">
                        <th className="pb-2.5">Date</th>
                        <th className="pb-2.5">Application</th>
                        <th className="pb-2.5">Buyer</th>
                        <th className="pb-2.5">Gross Paid</th>
                        <th className="pb-2.5">Admin Cut</th>
                        <th className="pb-2.5">Net Take-Home</th>
                        <th className="pb-2.5">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {wallet.recentSales.map((sale) => (
                        <tr key={sale.id} className="text-neutral-300">
                          <td className="py-3 font-mono text-[11px] text-neutral-400">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-bold text-white">
                            <div>{sale.appName}</div>
                            {sale.transactionType === 'ownership_transfer' && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                                App Ownership Sale (10% fee)
                              </span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-[11px]">
                            {sale.customerName} ({sale.customerEmail})
                          </td>
                          <td className="py-3 font-mono font-bold text-neutral-100">
                            {sale.grossAmount.toLocaleString()} {sale.currency}
                          </td>
                          <td className="py-3 font-mono text-rose-400">
                            -{sale.adminCommissionAmount.toLocaleString()} {sale.currency} ({sale.adminCommissionPercent}%)
                          </td>
                          <td className="py-3 font-mono font-black text-emerald-400">
                            +{sale.developerNetAmount.toLocaleString()} {sale.currency}
                          </td>
                          <td className="py-3 text-[11px] text-neutral-400">
                            {sale.paymentMethod}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: SELL / TRANSFER APP OWNERSHIP TO ANOTHER DEVELOPER */}
      {sellModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-5 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Sell / Transfer App Ownership</h3>
              </div>
              <button
                type="button"
                onClick={() => setSellModalApp(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-neutral-950 rounded-2xl border border-neutral-800">
              <img
                src={sellModalApp.iconUrl || '/zuzustore-logo.png'}
                alt={sellModalApp.name}
                className="w-11 h-11 rounded-xl object-cover bg-neutral-900 border border-neutral-800"
              />
              <div>
                <div className="font-bold text-white text-sm">{sellModalApp.name}</div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  v{sellModalApp.currentVersion} • {sellModalApp.packageId}
                </div>
              </div>
            </div>

            {sellError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{sellError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTransferListing} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Who should receive full rights to this app?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSellMode('specific')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      sellMode === 'specific'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Specific Developer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellMode('open')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      sellMode === 'open'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    Open Dev Marketplace
                  </button>
                </div>
              </div>

              {sellMode === 'specific' && (
                <div className="space-y-2">
                  {fellowDevelopers.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                        Select Registered Developer
                      </label>
                      <select
                        value={sellTargetEmail}
                        onChange={(e) => setSellTargetEmail(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                      >
                        <option value="">-- Choose developer or type email below --</option>
                        {fellowDevelopers.map((d) => (
                          <option key={d.id} value={d.email}>
                            {d.name} ({d.email}) {d.companyName ? `• ${d.companyName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Target Developer Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required={sellMode === 'specific'}
                      value={sellTargetEmail}
                      onChange={(e) => setSellTargetEmail(e.target.value)}
                      placeholder="buyer.developer@example.com"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Transfer Sale Price (UGX) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3 text-sm font-black text-white outline-none font-mono"
                />
              </div>

              {/* Live 10% Admin Commission & 90% Seller Net Preview */}
              <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Ownership Transfer Payout Split (10% Admin Commission)
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block font-sans">Sale Price</span>
                    <span className="text-xs font-black text-white">
                      {Math.max(0, sellPrice).toLocaleString()} UGX
                    </span>
                  </div>
                  <div className="p-2 bg-rose-950/30 rounded-lg border border-rose-900/40">
                    <span className="text-[10px] text-rose-300 block font-sans">Super Admin (10%)</span>
                    <span className="text-xs font-black text-rose-400">
                      -{Math.round(Math.max(0, sellPrice) * 0.1).toLocaleString()} UGX
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-950/30 rounded-lg border border-emerald-900/40">
                    <span className="text-[10px] text-emerald-300 block font-sans">Your Net (90%)</span>
                    <span className="text-xs font-black text-emerald-400">
                      {(Math.max(0, sellPrice) - Math.round(Math.max(0, sellPrice) * 0.1)).toLocaleString()} UGX
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Once the buyer pays on the website, 90% is credited to your Developer Wallet, 10% goes to Super Admin, and full rights transfer immediately. Standard withdrawal sending charges ({feeRatePer1000} UGX per 1,000 UGX) remain unchanged when cashing out.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Transfer Note (Optional)</label>
                <input
                  type="text"
                  value={sellNote}
                  onChange={(e) => setSellNote(e.target.value)}
                  placeholder="e.g. Includes full store listing, future updates & monetization rights"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSellModalApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTransfer}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingTransfer ? 'Publishing Offer...' : 'Publish Ownership Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BUYER PAY & CLAIM APP OWNERSHIP */}
      {buyModalListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-5 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Pay &amp; Claim Full App Ownership</h3>
              </div>
              <button
                type="button"
                onClick={() => setBuyModalListing(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={buyModalListing.appIcon || '/zuzustore-logo.png'}
                  alt={buyModalListing.appName}
                  className="w-12 h-12 rounded-xl object-cover bg-neutral-900 border border-neutral-800"
                />
                <div>
                  <div className="font-bold text-white text-sm">{buyModalListing.appName}</div>
                  <div className="text-[11px] text-neutral-400">
                    Seller: {buyModalListing.sellerName} ({buyModalListing.sellerEmail})
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                <span className="text-neutral-400">Total Transfer Price:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {buyModalListing.askingPrice.toLocaleString()} {buyModalListing.currency}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400">
                Includes 10% Super Admin commission ({buyModalListing.adminFeeAmount.toLocaleString()} {buyModalListing.currency}) &amp; 90% to Seller ({buyModalListing.sellerNetAmount.toLocaleString()} {buyModalListing.currency}).
              </div>
            </div>

            {buyError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{buyError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteTransferPurchase} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-300">Select Payment Method</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setBuyPaymentMethod('livepay_mtn')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer ${
                      buyPaymentMethod === 'livepay_mtn'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span>MTN Mobile Money (LivePay)</span>
                    <span className="text-[10px] font-mono">Instant Prompt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyPaymentMethod('livepay_airtel')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer ${
                      buyPaymentMethod === 'livepay_airtel'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span>Airtel Money (LivePay)</span>
                    <span className="text-[10px] font-mono">Instant Prompt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyPaymentMethod('wallet')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer ${
                      buyPaymentMethod === 'wallet'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span>Developer Wallet Balance</span>
                    <span className="text-[10px] font-mono">
                      Avail: {(wallet?.availableBalance || 0).toLocaleString()} UGX
                    </span>
                  </button>
                </div>
              </div>

              {buyPaymentMethod !== 'wallet' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Mobile Money Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyPhoneNumber}
                    onChange={(e) => setBuyPhoneNumber(e.target.value)}
                    placeholder="e.g. 0770 000 000 or 0750 000 000"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs text-white outline-none font-mono"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-200 leading-relaxed">
                By confirming payment under the{' '}
                {onOpenLegal ? (
                  <button
                    type="button"
                    onClick={() => onOpenLegal('developer-payment')}
                    className="text-amber-300 font-semibold hover:underline cursor-pointer"
                  >
                    Protector Technologies Developer Payment Agreement
                  </button>
                ) : (
                  'Protector Technologies Developer Payment Agreement'
                )}
                , 90% goes to Seller, 10% platform commission goes to Protector Technologies, and &ldquo;{buyModalListing.appName}&rdquo; transfers into your developer account with full ownership rights.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setBuyModalListing(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPurchasingTransfer}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-black text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isPurchasingTransfer
                    ? 'Processing Transfer...'
                    : `Confirm & Pay ${buyModalListing.askingPrice.toLocaleString()} ${buyModalListing.currency}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT OWNED APP (FULL RIGHTS CONTROL) */}
      {editModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-5 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Manage &amp; Edit App ({editModalApp.name})</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalApp(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOwnedAppEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">App Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Package ID</label>
                  <input
                    type="text"
                    value={editPackageId}
                    onChange={(e) => setEditPackageId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Tagline</label>
                <input
                  type="text"
                  value={editTagline}
                  onChange={(e) => setEditTagline(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                  >
                    <option value="Streaming">Streaming</option>
                    <option value="TV & Movies">TV &amp; Movies</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Tools">Tools</option>
                    <option value="Games">Games</option>
                    <option value="Social">Social</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Target Device</label>
                  <select
                    value={editEdition}
                    onChange={(e) => setEditEdition(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                  >
                    <option value="phone">Android Phone</option>
                    <option value="tv">Android / Smart TV</option>
                    <option value="both">Both Phone &amp; TV</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">App Icon URL</label>
                  <input
                    type="text"
                    value={editIconUrl}
                    onChange={(e) => setEditIconUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Or Upload New Icon</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditIconUpload}
                    className="w-full text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-neutral-200 file:font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Latest Release Direct Download URL (Optional)
                </label>
                <input
                  type="url"
                  value={editDirectUrl}
                  onChange={(e) => setEditDirectUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                />
              </div>

              {/* Pricing Update */}
              <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Store Pricing Model</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPricingType('free')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        editPricingType === 'free' ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPricingType('paid')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        editPricingType === 'paid' ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      Paid App
                    </button>
                  </div>
                </div>

                {editPricingType === 'paid' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      min={editCurrency === 'USD' ? 1 : 500}
                      value={editPrice}
                      onChange={(e) => setEditPrice(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white font-mono outline-none"
                    />
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white outline-none"
                    >
                      <option value="UGX">UGX</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditModalApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving Changes...' : 'Save App Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RELEASE NEW APK VERSION UPDATE */}
      {releaseModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-5 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <UploadCloud className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Publish New Update ({releaseModalApp.name})</h3>
              </div>
              <button
                type="button"
                onClick={() => setReleaseModalApp(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {relError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{relError}</span>
              </div>
            )}

            <form onSubmit={handlePublishAppRelease} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">New Version *</label>
                  <input
                    type="text"
                    required
                    value={relVersion}
                    onChange={(e) => setRelVersion(e.target.value)}
                    placeholder="e.g. 2.1.0"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Platform</label>
                  <select
                    value={relPlatform}
                    onChange={(e) => setRelPlatform(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                  >
                    <option value="Android">Android</option>
                    <option value="Android TV">Android TV</option>
                    <option value="Fire TV">Fire TV</option>
                    <option value="Smart TV">Smart TV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Min OS</label>
                  <input
                    type="text"
                    value={relMinOS}
                    onChange={(e) => setRelMinOS(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Upload APK Binary</label>
                <input
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  onChange={(e) => setRelApkFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-neutral-800 file:text-white file:font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Or Direct Cloud APK Link</label>
                <input
                  type="url"
                  value={relDirectUrl}
                  onChange={(e) => setRelDirectUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">What&apos;s New / Changelog</label>
                <textarea
                  rows={3}
                  value={relChangelog}
                  onChange={(e) => setRelChangelog(e.target.value)}
                  placeholder="- Added new features&#10;- Fixed startup crash"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setReleaseModalApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishingRelease}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-neutral-950 font-black text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isPublishingRelease ? 'Publishing Update...' : 'Publish New Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM WITHDRAW / DELETE APPLICATION */}
      {withdrawAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Withdraw Application</h3>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawAppModal(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-white">{withdrawAppModal.name}</strong> from your account and the store catalog?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setWithdrawAppModal(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingApp}
                onClick={handleConfirmDeleteApp}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isDeletingApp ? 'Withdrawing...' : 'Yes, Withdraw App'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
