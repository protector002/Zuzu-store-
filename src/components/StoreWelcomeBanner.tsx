import React from 'react';
import { Smartphone, Download, QrCode, ShieldCheck, UploadCloud, HelpCircle, Sparkles, Tv, Code2 } from 'lucide-react';
import { AdminUser, DeveloperUser } from '../types';

interface StoreWelcomeBannerProps {
  admin: AdminUser | null;
  developer?: DeveloperUser | null;
  onOpenLoginModal: () => void;
  onNavigateToUpload: () => void;
  onOpenDeveloperPortal?: () => void;
  onOpenGuide: () => void;
  totalDownloads?: number;
  totalApps?: number;
  onNavigateToTv?: () => void;
}

export const StoreWelcomeBanner: React.FC<StoreWelcomeBannerProps> = ({
  admin,
  developer,
  onNavigateToUpload,
  onOpenDeveloperPortal,
  onOpenGuide,
  totalDownloads = 0,
  totalApps = 0,
  onNavigateToTv,
}) => {
  return (
    <section className="relative pt-8 sm:pt-14 pb-14 sm:pb-20 border-b border-neutral-800/60 overflow-hidden">
      {/* Background glow effect matching brand colors */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[380px] bg-gradient-to-b from-amber-600/15 via-red-900/15 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Brand Logo & Pill */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 via-red-500 to-amber-500 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse" />
            <img
              src="/public/assets/aistudio/file_00000000212c8208b64f5bd04e8c4ee8_95799501.png"
              alt="Zuzu Brand Logo"
              className="relative w-28 h-28 sm:w-36 sm:h-36 object-contain rounded-3xl shadow-2xl border-2 border-amber-400/50 transform hover:scale-105 transition-transform"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/zuzustore-logo.png';
              }}
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ZuzuStore • Direct APK Distribution Hub</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Download &amp; Distribute Android APKs Directly
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Welcome to <strong className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500 font-black">ZuzuStore</strong>. Anyone can download applications freely with zero accounts, paywalls, or registrations. Direct, verified APK packages ready for immediate installation.
          </p>

          {/* Real-time Community Downloads Metric */}
          <div className="inline-flex items-center gap-4 px-4 py-2 rounded-xl bg-neutral-900/90 border border-amber-500/30 text-xs shadow-md">
            <div className="flex items-center gap-1.5 text-amber-300">
              <Download className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="font-mono font-bold text-white text-sm tabular-nums">
                {totalDownloads.toLocaleString()}
              </span>
              <span>People Downloaded</span>
            </div>
            {totalApps > 0 && (
              <>
                <span className="text-neutral-700">•</span>
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span className="font-mono font-bold text-white tabular-nums">{totalApps}</span>
                  <span>Active APKs</span>
                </div>
              </>
            )}
            <span className="text-neutral-700 hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Free &amp; Open</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-amber-500/40 transition-colors space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Public Direct Downloads</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Zero registration or account required. Visitors can download raw .apk files with one tap.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-red-500/40 transition-colors space-y-2">
            <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Mobile QR Scanner</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Scan from your phone camera to download and install packages straight to Android.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-emerald-500/40 transition-colors space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Verified &amp; Safe Packages</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Cryptographically verified APK packages with SHA-256 validation and instant direct streaming.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          {admin && (
            <button
              onClick={onNavigateToUpload}
              className="px-6 py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 rounded-xl transition-all shadow-lg shadow-red-950/40 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Publish Your First APK Package</span>
            </button>
          )}

          {/* Become a Developer / Get Console Button */}
          {onOpenDeveloperPortal && (
            <button
              onClick={onOpenDeveloperPortal}
              className="px-5 py-3.5 text-xs sm:text-sm font-bold text-amber-300 hover:text-white bg-neutral-900/90 hover:bg-neutral-800 border border-amber-500/50 hover:border-amber-400 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 group"
              title="Become a Developer • Get Console & Publish APKs"
            >
              <Code2 className="w-4 h-4 text-amber-400 group-hover:rotate-6 transition-transform" />
              <span>{developer ? 'Open Dev Console' : 'Become a Developer (Get Console)'}</span>
            </button>
          )}

          {onNavigateToTv && (
            <button
              onClick={onNavigateToTv}
              className="px-5 py-3.5 text-xs sm:text-sm font-semibold text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Tv className="w-4 h-4 text-red-500" />
              <span>Smart TV Edition</span>
            </button>
          )}

          <button
            onClick={onOpenGuide}
            className="px-5 py-3.5 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>How to Install APKs</span>
          </button>
        </div>
      </div>
    </section>
  );
};
