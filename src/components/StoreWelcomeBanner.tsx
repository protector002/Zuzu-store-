import React from 'react';
import { Smartphone, Download, QrCode, ShieldCheck, Lock, UploadCloud, HelpCircle } from 'lucide-react';
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
    <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-20 border-b border-neutral-800/60 overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-900/20 via-cyan-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Direct Android APK Distribution Hub</span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Download & Distribute Android APKs Directly
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Anyone can download applications freely without creating an account or logging in. The store administrator can publish new APK packages using their verified account.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Public Direct Downloads</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Zero registration or account required. Visitors can download raw .apk files with one tap.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Mobile QR Scanner</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Scan from your phone camera to download and install packages straight to Android.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Publisher Admin Portal</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Admin sseruwagijohn452@gmail.com can publish APKs and manage app versions.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          {admin ? (
            <button
              onClick={onNavigateToUpload}
              className="px-6 py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Publish Your First APK Package</span>
            </button>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="px-6 py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Admin Login to Publish APK</span>
            </button>
          )}

          <button
            onClick={onOpenGuide}
            className="px-4 py-3.5 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>How to Install APKs</span>
          </button>
        </div>
      </div>
    </section>
  );
};
