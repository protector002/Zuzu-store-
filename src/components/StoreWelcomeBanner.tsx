import React from 'react';
import { Smartphone, Download, QrCode, ShieldCheck, Lock, UploadCloud, HelpCircle, Sparkles } from 'lucide-react';
import { AdminUser } from '../types';

interface StoreWelcomeBannerProps {
  admin: AdminUser | null;
  onOpenLoginModal: () => void;
  onNavigateToUpload: () => void;
  onOpenGuide: () => void;
}

export const StoreWelcomeBanner: React.FC<StoreWelcomeBannerProps> = ({
  admin,
  onOpenLoginModal,
  onNavigateToUpload,
  onOpenGuide,
}) => {
  return (
    <section className="relative pt-8 sm:pt-14 pb-14 sm:pb-20 border-b border-neutral-800/60 overflow-hidden">
      {/* Background glow effect matching brand colors */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[380px] bg-gradient-to-b from-cyan-600/15 via-indigo-900/15 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Brand Logo & Pill */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-3xl blur-md opacity-60 group-hover:opacity-90 transition duration-500" />
            <img
              src="/zuzustore-logo.png"
              alt="ZuzuStore Brand Logo"
              className="relative w-28 h-28 sm:w-36 sm:h-36 object-contain rounded-2xl shadow-2xl border border-cyan-400/40 transform hover:scale-105 transition-transform"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>ZuzuStore • Direct APK Distribution Hub</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Download & Distribute Android APKs Directly
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Welcome to <strong className="text-cyan-300 font-bold">ZuzuStore</strong>. Anyone can download applications freely with zero accounts, paywalls, or registrations. Direct, verified APK packages ready for immediate installation.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-cyan-500/40 transition-colors space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Public Direct Downloads</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Zero registration or account required. Visitors can download raw .apk files with one tap.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-indigo-500/40 transition-colors space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Mobile QR Scanner</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Scan from your phone camera to download and install packages straight to Android.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-emerald-500/40 transition-colors space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Verified & Safe Packages</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Cryptographically verified APK packages with SHA-256 validation and instant direct streaming.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          {admin && (
            <button
              onClick={onNavigateToUpload}
              className="px-6 py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-cyan-950/40 active:scale-95 flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Publish Your First APK Package</span>
            </button>
          )}

          <button
            onClick={onOpenGuide}
            className="px-5 py-3.5 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>How to Install APKs</span>
          </button>
        </div>
      </div>
    </section>
  );
};
