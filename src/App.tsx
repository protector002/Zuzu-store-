import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { HeroZuzu } from './components/HeroZuzu';
import { StoreWelcomeBanner } from './components/StoreWelcomeBanner';
import { OpeningSplash } from './components/OpeningSplash';
import { AppCatalog } from './components/AppCatalog';
import { AppDetailView } from './components/AppDetailView';
import { PublisherPortal } from './components/PublisherPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { DeveloperAuthModal } from './components/DeveloperAuthModal';
import { DeveloperConsole } from './components/DeveloperConsole';
import { QRModal } from './components/QRModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { ScreenshotModal } from './components/ScreenshotModal';
import { DownloadProgressModal } from './components/DownloadProgressModal';
import { TvPage } from './components/TvPage';
import { Footer } from './components/Footer';
import {
  fetchApps,
  getDownloadUrl,
  recordDownload,
  checkAdminSession,
  checkDeveloperSession,
  adminLogout,
  adminUploadApp,
  adminUpdateApp,
  adminAddRelease,
  adminDeleteApp,
  adminDeleteRelease,
  adminResetStore,
  submitReview,
  downloadWithProgress,
  parseFileSizeToBytes,
  formatBytes,
  fetchBroadcast
} from './services/api';
import { StoreApp, AppRelease, Platform, AdminUser, DeveloperUser, DownloadProgressState, AdminBroadcast } from './types';
import { getApkBlob, deleteApkBlob } from './utils/fileStorage';
import { filterPhoneApps, filterTvApps, getPhoneRelease, getTvRelease } from './utils/editionHelper';
import { CheckCircle2, ArrowRight, Megaphone } from 'lucide-react';



export default function App() {
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'store' | 'upload' | 'detail' | 'tv' | 'developer_console'>('store');
  const [detailSourceView, setDetailSourceView] = useState<'store' | 'tv'>('store');
  const [selectedApp, setSelectedApp] = useState<StoreApp | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Opening Logo Splash Screen
  const [showSplash, setShowSplash] = useState(true);

  // Admin state
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Developer state
  const [developer, setDeveloper] = useState<DeveloperUser | null>(null);
  const [isDevAuthModalOpen, setIsDevAuthModalOpen] = useState(false);

  // Platform Broadcast Banner State
  const [broadcast, setBroadcast] = useState<AdminBroadcast | null>(null);

  // Modals
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrApp, setQrApp] = useState<StoreApp | null>(null);
  const [qrRelease, setQrRelease] = useState<AppRelease | undefined>(undefined);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<Platform>('Android');

  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(0);
  const [screenshotTargetApp, setScreenshotTargetApp] = useState<StoreApp | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // In-App Download Progress Modal State
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressState>({
    isOpen: false,
    status: 'idle',
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    downloadedMbFormatted: '0 MB',
    remainingMbFormatted: '0 MB',
    speedFormatted: '0 KB/s',
    timeRemainingFormatted: '0s',
    appName: '',
    appIcon: '',
    version: '',
    fileName: ''
  });
  const downloadAbortRef = useRef<AbortController | null>(null);
  const activeDownloadTargetRef = useRef<{ appId: string; releaseId?: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };


  // Load apps and check admin session on mount
  const loadApps = async () => {
    try {
      const data = await fetchApps();
      setApps(data);
      if (data.length > 0) {
        setSelectedApp((prev) => (prev ? data.find((a) => a.id === prev.id) || data[0] : data[0]));
      } else {
        setSelectedApp(null);
      }
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();

    // Check if admin is logged in
    checkAdminSession().then((res) => {
      if (res.authenticated && res.admin) {
        setAdmin(res.admin);
      }
    });

    // Check if developer is logged in
    checkDeveloperSession().then((res) => {
      if (res.authenticated && res.developer) {
        setDeveloper(res.developer);
      }
    });

    // Check system broadcast
    fetchBroadcast().then((b) => {
      if (b && b.active) setBroadcast(b);
    });
  }, []);

  // Secret trigger to open administrator login modal
  const handleOpenSecretAdmin = () => {
    if (admin) {
      setCurrentView('upload');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Welcome back, ${admin.name}! Publisher Portal is active.`);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  // Keyboard shortcut (Ctrl+Shift+A or Cmd+Shift+A or Alt+A) to access Admin Publisher Console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;

      if (
        (isCmdOrCtrl && e.shiftKey && (e.key === 'a' || e.key === 'A')) ||
        (isAlt && (e.key === 'a' || e.key === 'A'))
      ) {
        e.preventDefault();
        handleOpenSecretAdmin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [admin]);

  // URL pathname (/admin, /login, /publisher), hash (#admin), and query param (?admin) listener
  useEffect(() => {
    const handleUrlTrigger = () => {
      const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);

      const isPathAdmin =
        pathname === '/admin' ||
        pathname === '/login' ||
        pathname === '/publisher' ||
        pathname === '/portal';

      const isHashOrQueryAdmin =
        hash === '#admin' ||
        hash === '#login' ||
        hash === '#publisher' ||
        hash === '#portal' ||
        params.has('admin') ||
        params.has('publisher');

      if (isPathAdmin || isHashOrQueryAdmin) {
        handleOpenSecretAdmin();
      }
    };

    handleUrlTrigger();
    window.addEventListener('hashchange', handleUrlTrigger);
    window.addEventListener('popstate', handleUrlTrigger);
    return () => {
      window.removeEventListener('hashchange', handleUrlTrigger);
      window.removeEventListener('popstate', handleUrlTrigger);
    };
  }, [admin]);

  // Handle APK Download (PUBLIC - NO ACCOUNT REQUIRED, STREAMS IN-APP WITH PROGRESS)
  const handleDownload = async (appId: string, releaseId?: string) => {
    const targetApp = apps.find((a) => a.id === appId || a.slug === appId);
    if (!targetApp) return;

    const targetRelease = releaseId
      ? targetApp.releases.find((r) => r.id === releaseId) || targetApp.releases[0]
      : targetApp.releases[0];
    const fileName =
      targetRelease?.fileName || `${targetApp.slug || 'app'}-v${targetRelease?.version || '1.0.0'}.apk`;

    // Save active download target for retry support
    activeDownloadTargetRef.current = { appId, releaseId };

    // Fast Immediate Increment: Optimistically update UI so visitors see the download counter jump up instantly!
    setApps((prevApps) =>
      prevApps.map((a) =>
        a.id === appId || a.slug === appId
          ? {
              ...a,
              downloadsTotal: (a.downloadsTotal || 0) + 1,
              releases: a.releases.map((r) =>
                r.id === targetRelease?.id ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r
              )
            }
          : a
      )
    );
    if (selectedApp && (selectedApp.id === appId || selectedApp.slug === appId)) {
      setSelectedApp((prev) =>
        prev
          ? {
              ...prev,
              downloadsTotal: (prev.downloadsTotal || 0) + 1,
              releases: prev.releases.map((r) =>
                r.id === targetRelease?.id ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r
              )
            }
          : null
      );
    }

    // Persist download increment to Firestore cloud database & server
    recordDownload(appId, targetRelease?.id);

    // Initial state for the in-app progress modal
    const estimatedTotalBytes = parseFileSizeToBytes(targetRelease?.fileSize) || 25 * 1024 * 1024;
    setDownloadProgress({
      isOpen: true,
      status: 'connecting',
      percent: 0,
      downloadedBytes: 0,
      totalBytes: estimatedTotalBytes,
      downloadedMbFormatted: '0 MB',
      remainingMbFormatted: targetRelease?.fileSize || 'Calculating...',
      speedFormatted: 'Connecting...',
      timeRemainingFormatted: 'Estimating...',
      appName: targetApp.name,
      appIcon: targetApp.iconUrl,
      version: targetRelease?.version || '1.0.0',
      fileName,
      fileSize: targetRelease?.fileSize,
      packageId: targetApp.packageId
    });


    // 1. Check if the physical APK file is cached in local client storage (uploader device)
    const localBlob = await getApkBlob(appId);
    if (localBlob) {
      try {
        const total = localBlob.size;
        setDownloadProgress((prev) => ({
          ...prev,
          status: 'downloading',
          percent: 35,
          downloadedMbFormatted: formatBytes(total * 0.35),
          remainingMbFormatted: formatBytes(total * 0.65),
          speedFormatted: 'Streaming local package...',
          timeRemainingFormatted: '1s'
        }));
        await new Promise((r) => setTimeout(r, 220));

        setDownloadProgress((prev) => ({
          ...prev,
          percent: 85,
          downloadedMbFormatted: formatBytes(total * 0.85),
          remainingMbFormatted: formatBytes(total * 0.15),
          speedFormatted: 'Finalizing APK...',
          timeRemainingFormatted: '<1s'
        }));
        await new Promise((r) => setTimeout(r, 180));

        const blobUrl = URL.createObjectURL(localBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadProgress((prev) => ({
          ...prev,
          status: 'completed',
          percent: 100,
          downloadedMbFormatted: formatBytes(total),
          remainingMbFormatted: '0 MB',
          speedFormatted: 'Finished',
          timeRemainingFormatted: '0s',
          blobUrl
        }));
        showToast(`Downloaded ${fileName} successfully!`);
        return;
      } catch (err: any) {
        setDownloadProgress((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: 'Failed to extract package from local storage.'
        }));
        return;
      }
    }

    // 2. Stream directly through our backend download proxy
    // This streams Google Drive, Dropbox, GitHub Releases, or Server-stored APKs
    // with 0 external pages/tabs opened and live in-app progress!
    const queryParams = new URLSearchParams();
    if (targetRelease?.id) queryParams.append('releaseId', targetRelease.id);
    if (targetRelease?.directDownloadUrl) queryParams.append('directUrl', targetRelease.directDownloadUrl);
    if (fileName) queryParams.append('fileName', fileName);
    if (targetApp.name) queryParams.append('appName', targetApp.name);
    if (targetApp.packageId) queryParams.append('packageId', targetApp.packageId);
    if (targetRelease?.version) queryParams.append('version', targetRelease.version);
    if (targetRelease?.fileSize) queryParams.append('fileSize', targetRelease.fileSize);
    const downloadUrl = `/api/apps/${targetApp.id}/download?${queryParams.toString()}`;

    if (downloadAbortRef.current) {
      downloadAbortRef.current.abort();
    }
    const controller = new AbortController();
    downloadAbortRef.current = controller;

    try {
      setDownloadProgress((prev) => ({
        ...prev,
        status: 'downloading',
        speedFormatted: 'Starting stream...'
      }));

      const { blobUrl } = await downloadWithProgress(
        downloadUrl,
        fileName,
        targetRelease?.fileSize,
        (update) => {
          setDownloadProgress((prev) => ({
            ...prev,
            status: update.percent >= 100 ? 'verifying' : 'downloading',
            percent: update.percent,
            downloadedBytes: update.downloadedBytes,
            totalBytes: update.totalBytes,
            downloadedMbFormatted: update.downloadedMbFormatted,
            remainingMbFormatted: update.remainingMbFormatted,
            speedFormatted: update.speedFormatted,
            timeRemainingFormatted: update.timeRemainingFormatted
          }));
        },
        controller.signal
      );

      // Automatically start saving downloaded APK to the user's device
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadProgress((prev) => ({
        ...prev,
        status: 'completed',
        percent: 100,
        downloadedMbFormatted: prev.fileSize || prev.downloadedMbFormatted,
        remainingMbFormatted: '0 MB',
        speedFormatted: 'Finished',
        timeRemainingFormatted: '0s',
        blobUrl
      }));
      showToast(`Downloaded ${fileName} successfully!`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setDownloadProgress((prev) => ({ ...prev, isOpen: false, status: 'idle' }));
        return;
      }
      console.warn('Download stream notice:', err);

      // Graceful Mirror Fallback: If server proxy was interrupted but targetRelease has directDownloadUrl,
      // trigger immediate direct download without opening external tabs
      if (targetRelease?.directDownloadUrl) {
        try {
          const directUrl = targetRelease.directDownloadUrl.trim();
          let cleanUrl = directUrl;
          const gdMatch =
            directUrl.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/) ||
            directUrl.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
          if (gdMatch && gdMatch[1]) {
            cleanUrl = `https://drive.usercontent.google.com/download?id=${gdMatch[1]}&export=download&confirm=t`;
          }

          const mirrorLink = document.createElement('a');
          mirrorLink.href = cleanUrl;
          mirrorLink.download = fileName;
          document.body.appendChild(mirrorLink);
          mirrorLink.click();
          document.body.removeChild(mirrorLink);

          setDownloadProgress((prev) => ({
            ...prev,
            status: 'completed',
            percent: 100,
            remainingMbFormatted: '0 MB',
            speedFormatted: 'Finished',
            timeRemainingFormatted: '0s'
          }));
          showToast(`Downloading ${fileName}...`);
          return;
        } catch (mirrorErr) {
          console.error('Mirror download error:', mirrorErr);
        }
      }

      setDownloadProgress((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'The download was interrupted. Please check your connection and retry.'
      }));
    }


    // Refresh apps to reflect updated download counters
    setTimeout(() => {
      loadApps();
    }, 1200);
  };

  const handleCancelDownload = () => {
    if (downloadAbortRef.current) {
      downloadAbortRef.current.abort();
      downloadAbortRef.current = null;
    }
    setDownloadProgress((prev) => ({ ...prev, isOpen: false, status: 'idle' }));
  };

  const handleRetryDownload = () => {
    if (activeDownloadTargetRef.current) {
      handleDownload(activeDownloadTargetRef.current.appId, activeDownloadTargetRef.current.releaseId);
    }
  };

  const handleSaveAgain = () => {
    if (downloadProgress.blobUrl) {
      const link = document.createElement('a');
      link.href = downloadProgress.blobUrl;
      link.download = downloadProgress.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Saved another copy of ${downloadProgress.fileName}!`);
    }
  };



  // Handle Admin Logout
  const handleLogout = async () => {
    await adminLogout();
    setAdmin(null);
    showToast('Logged out of Publisher Account.');
  };

  // Handle Admin Upload New App
  const handleUploadApp = async (payload: FormData | Record<string, any>): Promise<StoreApp> => {
    const res = await adminUploadApp(payload);
    await loadApps();
    showToast(res.message || 'App published successfully!');
    return res.app;
  };

  // Handle Admin Update App (e.g. screenshots, metadata)
  const handleUpdateApp = async (appId: string, updates: Partial<StoreApp>): Promise<StoreApp> => {
    const res = await adminUpdateApp(appId, updates);
    await loadApps();
    showToast(res.message || 'App updated successfully!');
    return res.app;
  };

  // Handle Admin Add Release
  const handleAddRelease = async (appId: string, payload: FormData | Record<string, any>): Promise<StoreApp> => {
    const res = await adminAddRelease(appId, payload);
    await loadApps();
    showToast(res.message || 'Release deployed successfully!');
    return res.app;
  };

  // Handle Admin Delete Release/Version
  const handleDeleteRelease = async (appId: string, releaseId: string): Promise<StoreApp> => {
    const res = await adminDeleteRelease(appId, releaseId);
    await loadApps();
    if (selectedApp?.id === appId) {
      setSelectedApp(res.app);
    }
    showToast(res.message || 'Version release permanently deleted.');
    return res.app;
  };

  // Handle Admin Delete App
  const handleDeleteApp = async (appId: string) => {
    await deleteApkBlob(appId);
    await adminDeleteApp(appId);
    await loadApps();
    if (selectedApp?.id === appId) {
      setSelectedApp(null);
      setCurrentView('store');
    }
    showToast('Application permanently deleted from website.');
  };

  // Handle Admin Reset Catalog
  const handleResetCatalog = async () => {
    await adminResetStore();
    await loadApps();
    showToast('Store catalog reset to clean state.');
  };

  // Handle Community Review (Public)
  const handleAddReview = async (
    appId: string,
    review: { author: string; rating: number; platform: string; title: string; comment: string }
  ) => {
    const res = await submitReview(appId, review);
    await loadApps();
    setSelectedApp(res.app);
    showToast('Review posted successfully!');
  };

  // Modal triggers
  const openQRModal = (app: StoreApp, release?: AppRelease) => {
    setQrApp(app);
    setQrRelease(release);
    setIsQrOpen(true);
  };

  const openGuideModal = (platform: Platform = 'Android') => {
    setGuidePlatform(platform);
    setIsGuideOpen(true);
  };

  const openScreenshotPreview = (app: StoreApp, index: number) => {
    setScreenshotTargetApp(app);
    setActiveScreenshotIndex(index);
    setIsScreenshotOpen(true);
  };

  const normalizedSearch = searchQuery.toLowerCase().trim();

  // Real-time filter across all apps by name or package ID
  const filteredApps = apps.filter((app) => {
    if (!normalizedSearch) return true;
    return (
      app.name.toLowerCase().includes(normalizedSearch) ||
      app.packageId.toLowerCase().includes(normalizedSearch) ||
      (app.tagline && app.tagline.toLowerCase().includes(normalizedSearch)) ||
      (app.category && app.category.toLowerCase().includes(normalizedSearch))
    );
  });

  const phoneApps = filterPhoneApps(filteredApps);
  const tvApps = filterTvApps(filteredApps);
  const featuredPhoneApp = phoneApps[0] || null;
  const totalDownloads = apps.reduce((sum, a) => sum + (a.downloadsTotal || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Opening Animated Logo Splash Screen */}
      {showSplash && (
        <OpeningSplash onComplete={() => setShowSplash(false)} />
      )}

      {/* Live System Broadcast Banner */}
      {broadcast && broadcast.active && broadcast.message && (
        <div
          className={`py-2.5 px-4 text-xs shadow-md border-b flex items-center justify-between transition-colors z-50 relative ${
            broadcast.level === 'alert'
              ? 'bg-rose-950/95 border-rose-800 text-rose-200'
              : broadcast.level === 'warning'
              ? 'bg-amber-950/95 border-amber-800 text-amber-200'
              : 'bg-cyan-950/95 border-cyan-800 text-cyan-200'
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

      {/* Top Bar Navigation */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'upload' && !admin) {
            handleOpenSecretAdmin();
            return;
          }
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenInstallGuide={() => openGuideModal('Android')}
        onQuickDownload={
          featuredPhoneApp
            ? () => handleDownload(featuredPhoneApp.id, getPhoneRelease(featuredPhoneApp)?.id)
            : undefined
        }
        hasApps={apps.length > 0}
        totalDownloads={totalDownloads}
        admin={admin}
        developer={developer}
        onOpenDeveloperPortal={() => {
          if (developer) {
            setCurrentView('developer_console');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setIsDevAuthModalOpen(true);
          }
        }}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onSecretAdminTrigger={handleOpenSecretAdmin}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q && currentView !== 'store' && currentView !== 'tv') {
            setCurrentView('store');
          }
        }}
        apps={apps}
        onSelectApp={(app) => {
          setSelectedApp(app);
          setDetailSourceView(currentView === 'tv' ? 'tv' : 'store');
          setCurrentView('detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />


      {/* Floating Publisher Banner when in Admin Studio */}
      {currentView === 'upload' && admin && (
        <div className="bg-neutral-900 border-b border-neutral-800 py-2.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="font-bold">Publisher Mode:</span>
              <span className="text-neutral-400">
                You are logged in as <strong className="text-white font-medium">{admin.name || 'Administrator'}</strong> to upload and manage APK packages.
              </span>
            </div>
            <button
              onClick={() => setCurrentView('store')}
              className="text-neutral-300 hover:text-white flex items-center gap-1 font-semibold hover:underline"
            >
              <span>Back to Public Storefront</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="relative inline-block">
              {/* Outer glowing pulsing halo */}
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 rounded-3xl blur-md opacity-75 animate-pulse" />
              <img
                src="/public/assets/aistudio/file_00000000212c8208b64f5bd04e8c4ee8_95799501.png"
                alt="Loading ZuzuStore..."
                className="relative w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl shadow-2xl border-2 border-amber-400/60 animate-bounce"
                style={{ animationDuration: '1.4s' }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/zuzustore-logo.png';
                }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white tracking-wide">Opening ZuzuStore...</p>
              <p className="text-xs text-amber-400/80 font-medium">Preparing verified packages</p>
            </div>
            <div className="w-32 h-1 bg-neutral-900 rounded-full overflow-hidden mx-auto border border-neutral-800">
              <div className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-red-600 rounded-full animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            {currentView === 'store' && (
              <>
                {/* If real phone apps exist, show the featured phone app hero */}
                {featuredPhoneApp ? (
                  <HeroZuzu
                    app={featuredPhoneApp}
                    onDownload={(appId, relId) => handleDownload(appId, relId || getPhoneRelease(featuredPhoneApp)?.id)}
                    onOpenQR={(app) => openQRModal(app, getPhoneRelease(app))}
                    onOpenGuide={(plat) => openGuideModal(plat)}
                    onViewDetails={(app) => {
                      setSelectedApp(app);
                      setDetailSourceView('store');
                      setCurrentView('detail');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onPreviewScreenshot={(idx) => openScreenshotPreview(featuredPhoneApp, idx)}
                    onNavigateToTv={() => {
                      setCurrentView('tv');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                ) : (
                  /* If no phone apps published yet, show clean ZuzuStore welcome banner with logo */
                  <StoreWelcomeBanner
                    admin={admin}
                    onOpenLoginModal={() => setIsLoginModalOpen(true)}
                    onNavigateToUpload={() => setCurrentView('upload')}
                    onOpenGuide={() => openGuideModal('Android')}
                    onNavigateToTv={() => {
                      setCurrentView('tv');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    totalDownloads={totalDownloads}
                    totalApps={phoneApps.length}
                  />
                )}

                {/* Android Phone App Catalog & Browse Grid */}
                <AppCatalog
                  apps={phoneApps}
                  admin={admin}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectApp={(app) => {
                    setSelectedApp(app);
                    setDetailSourceView('store');
                    setCurrentView('detail');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onQuickDownload={(app, relId) => {
                    const rel = relId ? { id: relId } : getPhoneRelease(app);
                    handleDownload(app.id, rel?.id);
                  }}
                  onOpenQR={(app) => openQRModal(app, getPhoneRelease(app))}
                  onOpenUpload={() => {
                    if (!admin) {
                      handleOpenSecretAdmin();
                    } else {
                      setCurrentView('upload');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                />
              </>
            )}

            {currentView === 'detail' && selectedApp && (
              <AppDetailView
                app={selectedApp}
                admin={admin}
                initialPlatformPreference={detailSourceView === 'tv' ? 'tv' : 'phone'}
                onBack={() => {
                  setCurrentView(detailSourceView);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDownloadRelease={handleDownload}
                onOpenQR={(app, rel) => openQRModal(app, rel)}
                onOpenGuide={(plat) => openGuideModal(plat)}
                onAddReview={handleAddReview}
                onPreviewScreenshot={(idx) => openScreenshotPreview(selectedApp, idx)}
                onDeleteRelease={(releaseId) => handleDeleteRelease(selectedApp.id, releaseId)}
                onDeleteApp={() => handleDeleteApp(selectedApp.id)}
              />

            )}

            {currentView === 'tv' && (
              <TvPage
                apps={tvApps}
                admin={admin}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
                onDownloadApp={handleDownload}
                onSelectApp={(app) => {
                  setSelectedApp(app);
                  setDetailSourceView('tv');
                  setCurrentView('detail');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenQR={(app) => openQRModal(app, getTvRelease(app))}
                onNavigateToUpload={() => {
                  if (!admin) {
                    handleOpenSecretAdmin();
                  } else {
                    setCurrentView('upload');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                onOpenGuide={(plat) => openGuideModal(plat || 'Android')}
                onNavigateToPhoneStore={() => {
                  setCurrentView('store');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentView === 'upload' && admin && (
              <PublisherPortal
                apps={apps}
                admin={admin}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
                onUploadApp={handleUploadApp}
                onUpdateApp={handleUpdateApp}
                onAddRelease={handleAddRelease}
                onDeleteRelease={handleDeleteRelease}
                onDeleteApp={handleDeleteApp}
                onResetCatalog={handleResetCatalog}
                onViewAppInStore={(app) => {
                  setSelectedApp(app);
                  setCurrentView('detail');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDownloadTest={(appId, relId) => handleDownload(appId, relId)}
                onAppApproved={(app) => {
                  loadApps();
                  showToast(`App "${app.name}" approved and live on ZuzuStore!`);
                }}
                onRefreshCatalog={loadApps}
              />
            )}

            {currentView === 'developer_console' && developer && (
              <DeveloperConsole
                developer={developer}
                onLogout={() => {
                  setDeveloper(null);
                  setCurrentView('store');
                  showToast('Signed out of Developer Console.');
                }}
                onBackToStore={() => {
                  setCurrentView('store');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={(view) => {
          if (view === 'upload' && !admin) {
            handleOpenSecretAdmin();
            return;
          }
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenGuide={() => openGuideModal('Android')}
        appsCount={apps.length}
        admin={admin}
        onSecretAdminTrigger={handleOpenSecretAdmin}
      />

      {/* Admin Login Modal (Blank inputs, no prefilled or displayed email) */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(newAdmin) => {
          setAdmin(newAdmin);
          setCurrentView('upload');
          showToast(`Welcome back, ${newAdmin.name}!`);
        }}
      />

      {/* Developer Authentication Modal */}
      <DeveloperAuthModal
        isOpen={isDevAuthModalOpen}
        onClose={() => setIsDevAuthModalOpen(false)}
        onSuccess={(dev) => {
          setDeveloper(dev);
          setCurrentView('developer_console');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast(`Welcome, ${dev.name}! Developer Console is ready.`);
        }}
      />

      {/* QR Code Modal for Phone Download */}
      {qrApp && (
        <QRModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          app={qrApp}
          release={qrRelease}
        />
      )}

      {/* Android Installation Help Modal */}
      <InstallGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        defaultPlatform={guidePlatform}
      />

      {/* In-App Live Download Streaming Progress Modal */}
      <DownloadProgressModal
        progress={downloadProgress}
        onClose={() => setDownloadProgress((prev) => ({ ...prev, isOpen: false }))}
        onCancel={handleCancelDownload}
        onRetry={handleRetryDownload}
        onSaveAgain={handleSaveAgain}
      />


      {/* Screenshot Lightbox Modal */}
      {screenshotTargetApp && (
        <ScreenshotModal
          isOpen={isScreenshotOpen}
          onClose={() => setIsScreenshotOpen(false)}
          screenshots={screenshotTargetApp.screenshots}
          activeIndex={activeScreenshotIndex}
          onSelectIndex={(idx) => setActiveScreenshotIndex(idx)}
          appName={screenshotTargetApp.name}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-cyan-500/30 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
