import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroZuzu } from './components/HeroZuzu';
import { StoreWelcomeBanner } from './components/StoreWelcomeBanner';
import { OpeningSplash } from './components/OpeningSplash';
import { AppCatalog } from './components/AppCatalog';
import { AppDetailView } from './components/AppDetailView';
import { PublisherPortal } from './components/PublisherPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { QRModal } from './components/QRModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { ScreenshotModal } from './components/ScreenshotModal';
import { Footer } from './components/Footer';
import {
  fetchApps,
  getDownloadUrl,
  recordDownload,
  checkAdminSession,
  adminLogout,
  adminUploadApp,
  adminUpdateApp,
  adminAddRelease,
  adminDeleteApp,
  adminDeleteRelease,
  adminResetStore,
  submitReview
} from './services/api';
import { StoreApp, AppRelease, Platform, AdminUser } from './types';
import { getApkBlob, deleteApkBlob } from './utils/fileStorage';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function App() {
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'store' | 'upload' | 'detail'>('store');
  const [selectedApp, setSelectedApp] = useState<StoreApp | null>(null);

  // Opening Logo Splash Screen
  const [showSplash, setShowSplash] = useState(true);

  // Admin state
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

  // Handle APK Download (PUBLIC - NO ACCOUNT REQUIRED)
  const handleDownload = async (appId: string, releaseId?: string) => {
    const targetApp = apps.find((a) => a.id === appId || a.slug === appId);
    const targetRelease = releaseId
      ? targetApp?.releases.find((r) => r.id === releaseId) || targetApp?.releases[0]
      : targetApp?.releases[0];
    const fileName =
      targetRelease?.fileName || `${targetApp?.slug || 'app'}-v${targetRelease?.version || '1.0.0'}.apk`;

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

    // 1. Check if the physical APK file is cached in local client storage (uploader device)
    const localBlob = await getApkBlob(appId);
    if (localBlob) {
      const blobUrl = URL.createObjectURL(localBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      showToast(`Downloading ${fileName}! No account required.`);
      return;
    }

    // 2. Direct Cloud Download (Google Drive, Dropbox, GitHub Releases, MediaFire, etc.)
    if (targetRelease?.directDownloadUrl) {
      let directUrl = targetRelease.directDownloadUrl.trim();
      const gdMatch =
        directUrl.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/) ||
        directUrl.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);

      if (gdMatch && gdMatch[1]) {
        directUrl = `https://drive.usercontent.google.com/download?id=${gdMatch[1]}&export=download&confirm=t`;
      } else if (directUrl.includes('dropbox.com') && directUrl.includes('dl=0')) {
        directUrl = directUrl.replace('dl=0', 'dl=1');
      }

      showToast(`Downloading ${fileName} directly...`);

      const link = document.createElement('a');
      link.href = directUrl;
      link.setAttribute('download', fileName);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // 3. Fallback: Query backend safely without letting Chrome download 404 JSON as a file
    const downloadUrl = getDownloadUrl(appId, releaseId);

    try {
      showToast('Preparing download package...');
      const checkRes = await fetch(downloadUrl, { method: 'HEAD' });
      const contentType = checkRes.headers.get('content-type') || '';

      if (!checkRes.ok || contentType.includes('application/json')) {
        showToast('Download package is updating. Please check back shortly.');
        return;
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading ${fileName}! No account required.`);
    } catch (err) {
      window.location.href = downloadUrl;
    }

    // Refresh apps to reflect updated download counters
    setTimeout(() => {
      loadApps();
    }, 1200);
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

  const featuredApp = apps[0] || null;
  const totalDownloads = apps.reduce((sum, a) => sum + (a.downloadsTotal || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Opening Animated Logo Splash Screen */}
      {showSplash && (
        <OpeningSplash onComplete={() => setShowSplash(false)} />
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
          featuredApp
            ? () => handleDownload(featuredApp.id, featuredApp.releases[0]?.id)
            : undefined
        }
        hasApps={apps.length > 0}
        totalDownloads={totalDownloads}
        admin={admin}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onSecretAdminTrigger={handleOpenSecretAdmin}
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
          <div className="py-24 text-center space-y-3">
            <div className="w-9 h-9 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-400">Loading ZuzuStore...</p>
          </div>
        ) : (
          <>
            {currentView === 'store' && (
              <>
                {/* If real apps exist, show the featured app hero */}
                {featuredApp ? (
                  <HeroZuzu
                    app={featuredApp}
                    onDownload={handleDownload}
                    onOpenQR={(app) => openQRModal(app)}
                    onOpenGuide={(plat) => openGuideModal(plat)}
                    onViewDetails={(app) => {
                      setSelectedApp(app);
                      setCurrentView('detail');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onPreviewScreenshot={(idx) => openScreenshotPreview(featuredApp, idx)}
                  />
                ) : (
                  /* If no apps published yet, show clean ZuzuStore welcome banner with logo */
                  <StoreWelcomeBanner
                    admin={admin}
                    onOpenLoginModal={() => setIsLoginModalOpen(true)}
                    onNavigateToUpload={() => setCurrentView('upload')}
                    onOpenGuide={() => openGuideModal('Android')}
                    totalDownloads={totalDownloads}
                    totalApps={apps.length}
                  />
                )}

                {/* App Catalog & Browse Grid */}
                <AppCatalog
                  apps={apps}
                  admin={admin}
                  onSelectApp={(app) => {
                    setSelectedApp(app);
                    setCurrentView('detail');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onQuickDownload={(app) => {
                    const rel = app.releases[0];
                    handleDownload(app.id, rel?.id);
                  }}
                  onOpenQR={(app) => openQRModal(app)}
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
                onBack={() => {
                  setCurrentView('store');
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
