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
  Percent
} from 'lucide-react';
import { DeveloperUser, StoreApp, AdminBroadcast, DeveloperWallet, WithdrawalRequest, AppPricingType } from '../types';
import {
  submitDeveloperApp,
  fetchDeveloperMyApps,
  deleteDeveloperApp,
  developerLogout,
  fetchBroadcast,
  fetchDeveloperWallet,
  requestDeveloperWithdrawal,
  fetchDeveloperWithdrawals,
  fetchStoreCommission
} from '../services/api';

interface DeveloperConsoleProps {
  developer: DeveloperUser;
  onLogout: () => void;
  onBackToStore: () => void;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({
  developer,
  onLogout,
  onBackToStore,
}) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'my-apps' | 'wallet'>('submit');
  const [myApps, setMyApps] = useState<StoreApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
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
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconUrlFallback, setIconUrlFallback] = useState('');
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
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

  useEffect(() => {
    loadMyApps();
    loadWallet();
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

  // Icon file handler
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  // Screenshots file handler
  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setScreenshotFiles((prev) => [...prev, ...files]);
      const newPreviews = files.map((f) => URL.createObjectURL(f));
      setScreenshotPreviews((prev) => [...prev, ...newPreviews]);
    }
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

    if (!apkFile && !directDownloadUrl.trim()) {
      setSubmitError('Please upload an APK file or provide a direct download link (e.g. Google Drive / cloud link).');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('tagline', briefInfo.trim());
      formData.append('description', description.trim() || briefInfo.trim());
      formData.append('appEdition', appEdition);
      formData.append('platform', appEdition === 'tv' ? 'Android TV' : 'Android');
      formData.append('category', category);
      formData.append('version', version.trim() || '1.0.0');
      formData.append('minOS', minOS.trim() || 'Android 8.0+');

      const resolvedPkg = packageId.trim() || `com.${developer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      formData.append('packageId', resolvedPkg);

      if (apkFile) {
        formData.append('apkFile', apkFile);
      }
      if (directDownloadUrl.trim()) {
        formData.append('directDownloadUrl', directDownloadUrl.trim());
      }
      if (iconFile) {
        formData.append('iconFile', iconFile);
      }
      if (iconUrlFallback.trim()) {
        formData.append('iconUrlFallback', iconUrlFallback.trim());
      }

      screenshotFiles.forEach((file) => {
        formData.append('screenshotFiles', file);
      });

      // Append monetization & pricing settings
      formData.append('pricingType', pricingType);
      formData.append('price', String(pricingType === 'paid' ? price : 0));
      formData.append('currency', currency);

      const res = await submitDeveloperApp(formData);

      setSubmitSuccess(res.message || 'Application submitted successfully! It is now waiting for Super Admin review.');
      
      // Reset form
      setName('');
      setBriefInfo('');
      setDescription('');
      setPackageId('');
      setVersion('1.0.0');
      setApkFile(null);
      setDirectDownloadUrl('');
      setIconFile(null);
      setIconPreview(null);
      setIconUrlFallback('');
      setScreenshotFiles([]);
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

  const handleDelete = async (appId: string, appName: string) => {
    if (!window.confirm(`Are you sure you want to withdraw the submission for "${appName}"?`)) {
      return;
    }

    try {
      await deleteDeveloperApp(appId);
      await loadMyApps();
    } catch (e) {
      alert('Could not withdraw application. Please try again.');
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

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
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
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'my-apps'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>My Submissions</span>
              {myApps.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-neutral-800 text-neutral-200 text-[10px] rounded-full">
                  {myApps.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('wallet');
                loadWallet();
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'wallet'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Earnings &amp; Wallet</span>
              {wallet && wallet.availableBalance > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 font-mono text-[10px] rounded-full border border-emerald-500/30">
                  {wallet.availableBalance.toLocaleString()} {wallet.currency}
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-amber-300/80 bg-amber-950/30 border border-amber-800/40 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Super Admin (John) reviews all submissions</span>
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
              <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{submitError}</span>
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
                          <img
                            key={i}
                            src={url}
                            alt={`Preview ${i}`}
                            className="w-14 h-24 object-cover rounded-lg border border-neutral-800 shrink-0"
                          />
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
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="block text-xs font-semibold text-white">
                      Option A: Upload APK File
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-xl cursor-pointer transition-colors text-center">
                      <FileCode className="w-8 h-8 text-neutral-500 mb-2" />
                      <span className="text-xs font-bold text-neutral-200">
                        {apkFile ? apkFile.name : 'Select .apk File'}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1">
                        {apkFile ? `${(apkFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Supports up to 2GB package sizes'}
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
                      type="url"
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
                            min="500"
                            step="100"
                            required={pricingType === 'paid'}
                            value={price}
                            onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            placeholder="5000"
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
                          onChange={(e) => setCurrency(e.target.value)}
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
                  disabled={isSubmitting || isFrozen || isBanned}
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

        {/* TAB 2: MY SUBMISSIONS */}
        {activeTab === 'my-apps' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Your Submitted Applications</h2>
                <p className="text-xs text-neutral-400">Track the review and approval status of your apps</p>
              </div>
              <button
                onClick={loadMyApps}
                className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300"
              >
                Refresh
              </button>
            </div>

            {isLoadingApps ? (
              <div className="py-20 text-center">
                <span className="inline-block w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-neutral-400 mt-3">Loading your submissions...</p>
              </div>
            ) : myApps.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No applications submitted yet</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Submit your first Android or TV application to be reviewed by the Super Admin and published on Zuzu Store.
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="mt-2 py-2 px-5 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit an App</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myApps.map((app) => {
                  const status = app.approvalStatus || 'approved';
                  const release = app.releases?.[0];

                  return (
                    <div
                      key={app.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={app.iconUrl || '/zuzustore-logo.png'}
                            alt={app.name}
                            className="w-14 h-14 rounded-2xl object-cover bg-neutral-950 border border-neutral-800 p-0.5"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/zuzustore-logo.png';
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-white">{app.name}</h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-950 text-neutral-300 border border-neutral-800">
                                v{app.currentVersion}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {app.appEdition === 'tv' ? 'TV Edition' : 'Phone'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{app.tagline}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                              Package: {app.packageId} • Category: {app.category}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
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

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                        <div className="flex items-center gap-4">
                          <span>Downloads: <strong className="text-white">{app.downloadsTotal || 0}</strong></span>
                          <span>Rating: <strong className="text-amber-400">{app.rating > 0 ? `★ ${app.rating}` : 'New'}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          {status === 'approved' && (
                            <a
                              href={`/#app-${app.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                onBackToStore();
                              }}
                              className="py-1 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View in Store</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(app.id, app.name)}
                            className="py-1 px-3 bg-neutral-950 hover:bg-rose-950/50 hover:text-rose-400 text-neutral-400 border border-neutral-800 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
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
                    Payouts are reviewed by Super Admin and credited directly to your destination account.
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

            {/* CUSTOMER SALES LEDGER */}
            <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Customer App Sales Ledger</h3>
                  <p className="text-[11px] text-neutral-400">
                    Real transactions showing gross sale price, 6% platform commission, and your 94% net take-home.
                  </p>
                </div>
                <span className="text-xs text-neutral-400 font-mono">
                  {wallet?.recentSales?.length || 0} sales
                </span>
              </div>

              {!wallet?.recentSales || wallet.recentSales.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No sales recorded yet. When visitors purchase your paid applications, their payments and the 6% commission split will appear here.
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
                        <th className="pb-2.5">6% Admin Fee</th>
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
                            {sale.appName}
                          </td>
                          <td className="py-3 font-mono text-[11px]">
                            {sale.customerName} ({sale.customerEmail})
                          </td>
                          <td className="py-3 font-mono font-bold text-neutral-100">
                            {sale.grossAmount.toLocaleString()} {sale.currency}
                          </td>
                          <td className="py-3 font-mono text-rose-400">
                            -{sale.adminCommissionAmount.toLocaleString()} {sale.currency}
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
    </div>
  );
};
