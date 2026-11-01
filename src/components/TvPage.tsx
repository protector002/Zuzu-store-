import React, { useState } from 'react';
import {
  Tv,
  Download,
  QrCode,
  Sparkles,
  Check,
  Star,
  UploadCloud,
  Smartphone,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StoreApp, AdminUser, Platform } from '../types';
import { isAppInstalled } from '../utils/androidBridge';

interface TvPageProps {
  apps: StoreApp[];
  admin: AdminUser | null;
  onDownloadApp: (appId: string, releaseId?: string) => Promise<void>;
  onSelectApp: (app: StoreApp) => void;
  onOpenQR: (app: StoreApp) => void;
  onNavigateToUpload: () => void;
  onOpenGuide: (platform?: Platform) => void;
  onNavigateToPhoneStore?: () => void;
}

export const TvPage: React.FC<TvPageProps> = ({
  apps,
  admin,
  onDownloadApp,
  onSelectApp,
  onOpenQR,
  onNavigateToUpload,
  onNavigateToPhoneStore,
}) => {
  const [downloadingTvId, setDownloadingTvId] = useState<string | null>(null);

  // Filter apps for Smart TV / Android TV / Fire TV
  const tvApps = apps.filter((app) => {
    const plats = (app.supportedPlatforms || []).map((p) => p.toLowerCase());
    return (
      plats.includes('smart tv') ||
      plats.includes('android tv') ||
      plats.includes('fire tv') ||
      app.appEdition === 'tv' ||
      app.appEdition === 'both' ||
      app.isTvCompatible === true ||
      app.category?.toLowerCase() === 'smart tv' ||
      app.category?.toLowerCase() === 'tv & movies' ||
      app.name.toLowerCase().includes('tv') ||
      app.tagline?.toLowerCase().includes('tv')
    );
  });

  const featuredTvApp = tvApps[0] || null;

  const handleDownload = async (app: StoreApp) => {
    setDownloadingTvId(app.id);
    try {
      await onDownloadApp(app.id, app.releases[0]?.id);
    } finally {
      setTimeout(() => setDownloadingTvId(null), 2500);
    }
  };

  const handleDownloadDefaultTv = () => {
    const link = document.createElement('a');
    link.href = '/api/zuzu-tv-app/download';
    link.download = 'Zuzu-TV-Edition-v1.0.0.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 text-neutral-100">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Tv className="w-4 h-4 text-red-500" />
            <span>Smart TV Applications</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Smart TV</span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-700/60 text-red-300 font-medium">
              TV Edition
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
            Official applications built and optimized for Smart TVs, Android TV, and Amazon Fire TV.
          </p>
        </div>

        {/* Action Controls: Switch to Android App & Publish button */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {onNavigateToPhoneStore && (
            <button
              onClick={onNavigateToPhoneStore}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Switch to Android App</span>
            </button>
          )}

          {admin && (
            <button
              onClick={onNavigateToUpload}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Publish Smart TV App</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {featuredTvApp ? (
        <div className="space-y-10">
          {/* Featured Primary TV App Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-2xl relative overflow-hidden">
            {/* Background Warm Glow matching brand colors */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-red-500/10 to-transparent blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
              {/* App Icon & Basic Info */}
              <div className="lg:col-span-8 flex flex-col sm:flex-row items-start gap-6">
                <img
                  src={featuredTvApp.iconUrl || '/zuzustore-logo.png'}
                  alt={featuredTvApp.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-contain bg-neutral-950 border-2 border-amber-500/40 p-2 shrink-0 shadow-xl"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/zuzustore-logo.png';
                  }}
                />

                <div className="space-y-3 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {featuredTvApp.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-1">
                      <Tv className="w-3 h-3 text-red-400" />
                      <span>Smart TV Ready</span>
                    </span>
                    {featuredTvApp.isOfficial && (
                      <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-700/60 text-red-300 font-semibold text-[11px]">
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {featuredTvApp.tagline || featuredTvApp.description}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-neutral-200">
                      v{featuredTvApp.currentVersion}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
                      {featuredTvApp.releases[0]?.fileSize || '32 MB'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
                      {featuredTvApp.releases[0]?.minOS || 'Android TV 8.0+ / Fire OS'}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{featuredTvApp.rating > 0 ? featuredTvApp.rating.toFixed(1) : '5.0'}</span>
                    </span>
                    <span className="text-neutral-500">
                      ({featuredTvApp.downloadsTotal} downloads)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
                <button
                  onClick={() => handleDownload(featuredTvApp)}
                  disabled={downloadingTvId === featuredTvApp.id}
                  className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-extrabold text-sm sm:text-base transition-all shadow-xl shadow-red-950/40 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
                >
                  {downloadingTvId === featuredTvApp.id ? (
                    <>
                      <Check className="w-5 h-5 text-amber-200" />
                      <span>Streaming APK...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 text-white" />
                      <span>Download Smart TV APK</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={() => onOpenQR(featuredTvApp)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    title="Scan QR Code on TV or Mobile"
                  >
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>TV QR Code</span>
                  </button>

                  <button
                    onClick={() => onSelectApp(featuredTvApp)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Screenshots strip if available */}
            {featuredTvApp.screenshots && featuredTvApp.screenshots.length > 0 && (
              <div className="mt-8 pt-6 border-t border-neutral-800/80 space-y-3">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  TV Interface Screenshots
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {featuredTvApp.screenshots.map((shot, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl overflow-hidden aspect-video bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 transition-colors shadow-md"
                    >
                      <img
                        src={shot}
                        alt={`Screenshot ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* If there are more TV apps published, list them in a clean grid */}
          {tvApps.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>More Smart TV Apps ({tvApps.length - 1})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tvApps.slice(1).map((app) => (
                  <div
                    key={app.id}
                    onClick={() => onSelectApp(app)}
                    className="p-5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-md"
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={app.iconUrl || '/zuzustore-logo.png'}
                        alt={app.name}
                        className="w-12 h-12 rounded-xl object-contain bg-neutral-950 border border-neutral-800 p-1 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-white truncate">{app.name}</h4>
                        <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{app.tagline}</p>
                        <div className="text-[11px] text-neutral-500 mt-1 font-mono">v{app.currentVersion}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenQR(app);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(app);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-600 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* When no TV apps published yet */
        <div className="p-8 sm:p-14 rounded-3xl bg-neutral-900/40 border border-neutral-800 text-center space-y-6 max-w-2xl mx-auto shadow-2xl">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-red-500/20 to-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-xl">
              <Tv className="w-10 h-10 text-red-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Smart TV App Ready</h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
              This page displays your Smart TV application. You can publish your official TV APK build now from the Publisher Portal, or download the TV package below.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleDownloadDefaultTv}
              className="px-6 py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Smart TV APK</span>
            </button>

            {admin ? (
              <button
                onClick={onNavigateToUpload}
                className="px-5 py-3 text-xs sm:text-sm font-bold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-amber-400" />
                <span>Publish Your TV App Now</span>
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
