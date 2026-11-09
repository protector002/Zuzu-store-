import React, { useState } from 'react';
import { Download, QrCode, ShieldCheck, CheckCircle2, Smartphone, Laptop, HelpCircle, Tv, ArrowRight } from 'lucide-react';
import { StoreApp, Platform } from '../types';

interface HeroZuzuProps {
  app: StoreApp;
  onDownload: (appId: string, releaseId?: string) => Promise<void>;
  onOpenQR: (app: StoreApp) => void;
  onOpenGuide: (platform: Platform) => void;
  onViewDetails: (app: StoreApp) => void;
  onPreviewScreenshot: (index: number) => void;
  onNavigateToTv?: () => void;
}

export const HeroZuzu: React.FC<HeroZuzuProps> = ({
  app,
  onDownload,
  onOpenQR,
  onOpenGuide,
  onViewDetails,
  onPreviewScreenshot,
  onNavigateToTv,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('Android');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const matchingRelease = app.releases.find((r) => r.platform === selectedPlatform) || app.releases[0];

  const handleDownloadClick = async () => {
    if (!matchingRelease) return;
    setIsDownloading(true);
    try {
      await onDownload(app.id, matchingRelease.id);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const isPaid = app.pricing && app.pricing.type === 'paid' && (app.pricing.price || 0) > 0;
  const priceLabel = isPaid ? `${app.pricing?.price.toLocaleString()} ${app.pricing?.currency || 'UGX'}` : 'Free';

  return (
    <section id="featured-app" className="relative pt-6 sm:pt-10 pb-14 sm:pb-16 border-b border-neutral-800/60 overflow-hidden">
      {/* Background glow effect matching brand colors */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-amber-900/25 via-red-900/15 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Information, metadata, CTAs */}
          <div className="lg:col-span-7 space-y-5">
            {/* App Header Lockup */}
            <div className="flex items-start gap-4 sm:gap-5">
              <img
                src={app.iconUrl || '/zuzustore-logo.png'}
                alt={`${app.name} Icon`}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-2xl border border-neutral-800 object-contain shrink-0 bg-neutral-950 p-1"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/zuzustore-logo.png';
                }}
              />
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                    {app.name}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      isPaid
                        ? 'bg-amber-400 text-neutral-950 shadow-md'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isPaid ? priceLabel : 'Free'}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-neutral-300 mt-1 max-w-xl leading-relaxed">
                  {app.tagline}
                </p>
              </div>
            </div>

            {/* Metadata Strip */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-neutral-400 pt-1 border-t border-neutral-800/60">
              <span className="font-mono font-semibold text-neutral-200">v{matchingRelease?.version || app.currentVersion}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-300 font-medium">{matchingRelease?.fileSize || 'APK'}</span>
              <span className="text-neutral-600">•</span>
              <span>{matchingRelease?.minOS || 'Android 8.0+'}</span>
              <span className="text-neutral-600">•</span>
              <span className="tabular-nums font-mono text-amber-300 font-semibold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{app.downloadsTotal.toLocaleString()} People Downloaded</span>
              </span>
              {app.ratingCount > 0 && (
                <>
                  <span className="text-neutral-600">•</span>
                  <span className="text-amber-400 font-semibold">★ {app.rating.toFixed(1)}</span>
                  <span className="text-neutral-500">({app.ratingCount})</span>
                </>
              )}
            </div>

            {/* Platform Selector */}
            {app.supportedPlatforms.length > 1 && (
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Select Platform Build:
                </label>
                <div className="inline-flex p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
                  {app.supportedPlatforms.map((platform) => {
                    const isSelected = selectedPlatform === platform;
                    return (
                      <button
                        key={platform}
                        onClick={() => setSelectedPlatform(platform)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-neutral-800 text-white shadow-sm'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {platform === 'Android' ? (
                          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        ) : platform === 'Android TV' || platform === 'Fire TV' ? (
                          <Tv className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                        <span>{platform === 'Android' ? 'Android Phone' : platform}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TV Version Quick Banner */}
            {onNavigateToTv && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onNavigateToTv}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-amber-500/30 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer group shadow-sm"
                >
                  <Tv className="w-4 h-4 text-red-500" />
                  <span>Now also on <strong className="text-white">Smart TV &amp; Fire TV</strong></span>
                  <span className="text-amber-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    <span>Open Smart TV Page</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 rounded-xl shadow-lg shadow-red-950/40 transition-all flex items-center gap-2.5 active:scale-95 disabled:opacity-75 cursor-pointer"
              >
                {downloadSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>Download Started!</span>
                  </>
                ) : isDownloading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Preparing {matchingRelease?.fileName || 'APK'}...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>{isPaid ? `Buy APK (${priceLabel})` : `Download ${selectedPlatform === 'Android' ? 'APK' : 'Package'}`}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onOpenQR(app)}
                className="px-4 py-3.5 text-xs sm:text-sm font-medium text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                title="Scan QR code with phone camera to download directly to your mobile"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Scan for Phone</span>
              </button>

              <button
                onClick={() => onViewDetails(app)}
                className="px-4 py-3.5 text-xs sm:text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                View App Details
              </button>
            </div>

            {/* Verification & Guide Note */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-neutral-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified SHA-256 Checksum</span>
              </div>
              <span className="text-neutral-700">•</span>
              <span>100% Free & Open Download</span>
              <span className="text-neutral-700">•</span>
              <button
                onClick={() => onOpenGuide(selectedPlatform)}
                className="text-neutral-300 hover:text-cyan-400 underline underline-offset-4 flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>How to install APK on Android</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div
              className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-2xl group cursor-pointer"
              onClick={() => onPreviewScreenshot(0)}
            >
              <img
                src={app.heroImageUrl || app.iconUrl || '/zuzustore-logo.png'}
                alt={`${app.name} Interface`}
                className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/zuzustore-logo.png';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/20 to-transparent flex items-end p-5">
                <div className="w-full flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white font-semibold block">{app.name} v{matchingRelease?.version}</span>
                    <span className="text-neutral-400 text-[11px]">Android APK Package</span>
                  </div>
                  <span className="text-cyan-400 font-medium group-hover:underline">Preview UI</span>
                </div>
              </div>
            </div>

            {/* Screenshots strip */}
            {app.screenshots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
                {app.screenshots.slice(0, 3).map((shot, idx) => (
                  <button
                    key={idx}
                    onClick={() => onPreviewScreenshot(idx)}
                    className="relative rounded-xl overflow-hidden border border-neutral-800 hover:border-cyan-500/60 bg-neutral-900 aspect-[16/10] group transition-all text-left cursor-pointer"
                  >
                    <img
                      src={shot}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent transition-colors" />
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-white font-medium">
                      {idx === 0 ? 'Cover' : `Screen ${idx + 1}`}
                    </span>
                    {idx === 2 && app.screenshots.length > 3 && (
                      <span className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-xs font-bold text-cyan-300">
                        +{app.screenshots.length - 2} more
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
