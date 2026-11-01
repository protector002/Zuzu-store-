import React, { useState, useEffect } from 'react';
import { Download, UploadCloud, Smartphone, ShieldCheck, LogIn, LogOut, Zap, Tv } from 'lucide-react';
import { AdminUser } from '../types';

interface HeaderProps {
  currentView: 'store' | 'upload' | 'detail' | 'tv';
  onNavigate: (view: 'store' | 'upload' | 'tv') => void;
  onOpenInstallGuide: () => void;
  onQuickDownload?: () => void;
  hasApps: boolean;
  totalDownloads?: number;
  admin: AdminUser | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onSecretAdminTrigger?: () => void;
  onOpenCompanionModal?: () => void;
}


export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenInstallGuide,
  onQuickDownload,
  hasApps,
  totalDownloads = 0,
  admin,
  onOpenLoginModal,
  onLogout,
  onSecretAdminTrigger,
  onOpenCompanionModal,
}) => {

  // Discreet secret logo multi-tap (3 taps within 2 seconds unlocks admin login modal)
  const [logoTapCount, setLogoTapCount] = useState(0);

  useEffect(() => {
    if (logoTapCount > 0) {
      const timer = setTimeout(() => setLogoTapCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [logoTapCount]);

  const handleLogoTap = () => {
    const next = logoTapCount + 1;
    if (next >= 3) {
      setLogoTapCount(0);
      onSecretAdminTrigger?.();
    } else {
      setLogoTapCount(next);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Brand with Official Logo - Tapping 3 times secretly unlocks Admin Login */}
        <button
          onClick={() => {
            onNavigate('store');
            handleLogoTap();
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5 text-left group cursor-pointer"
          title="ZuzuStore"
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 rounded-xl blur-xs opacity-75 group-hover:opacity-100 transition duration-300" />
            <img
              src="/public/assets/aistudio/file_00000000212c8208b64f5bd04e8c4ee8_95799501.png"
              alt="Zuzu Logo"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-md border border-amber-400/50"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/zuzustore-logo.png';
              }}
            />
          </div>
          <div>
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-red-500 tracking-tight text-lg sm:text-xl">
              ZuzuStore
            </span>
            <span className="hidden sm:inline-block text-[10px] ml-2 px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300 font-mono font-medium">
              Popcorn Hub
            </span>
          </div>
        </button>

        {/* Navigation links */}
        <nav className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-medium text-neutral-300">
          <button
            onClick={() => onNavigate('store')}
            className={`transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer py-1 ${
              currentView === 'store' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Android App</span>
          </button>

          <button
            onClick={() => onNavigate('tv')}
            className={`transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer py-1 ${
              currentView === 'tv' ? 'text-red-400 font-bold border-b-2 border-red-500' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-red-500" />
            <span>Smart TV</span>
            <span className="text-[10px] bg-red-950/80 border border-red-700/60 text-red-300 px-1.5 py-0.2 rounded font-semibold">
              TV App
            </span>
          </button>

          {hasApps && (
            <a
              href="#featured-app"
              onClick={(e) => {
                if (currentView !== 'store') {
                  e.preventDefault();
                  onNavigate('store');
                  setTimeout(() => {
                    document.getElementById('featured-app')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="hover:text-white text-neutral-400 transition-colors whitespace-nowrap"
            >
              Featured
            </a>
          )}

          <a
            href="#catalog"
            onClick={(e) => {
              if (currentView !== 'store') {
                e.preventDefault();
                onNavigate('store');
                setTimeout(() => {
                  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-white text-neutral-400 transition-colors whitespace-nowrap"
          >
            All APKs
          </a>

          <button
            onClick={onOpenInstallGuide}
            className="hover:text-white text-neutral-400 transition-colors whitespace-nowrap"
          >
            How to Install
          </button>

          {/* Publisher Portal Tab: ONLY visible to logged-in administrator */}
          {admin && (
            <button
              onClick={() => onNavigate('upload')}
              className={`transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                currentView === 'upload' ? 'text-amber-400 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Publisher Portal</span>
            </button>
          )}
        </nav>

        {/* Right Action Zone */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Dual Platform Switcher: Android App vs Smart TV */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs shadow-inner">
            <button
              onClick={() => onNavigate('store')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentView === 'store'
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="View Android Phone & Tablet App storefront"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Android App</span>
              <span className="sm:hidden">Phone</span>
            </button>
            <button
              onClick={() => onNavigate('tv')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentView === 'tv'
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="View Smart TV & Fire TV App page"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Smart TV</span>
              <span className="sm:hidden">TV</span>
            </button>
          </div>

          {/* Total App Downloads Metric Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs shadow-inner"
            title="Total downloads across all applications on ZuzuStore"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono font-bold text-white tabular-nums">
              {totalDownloads.toLocaleString()}
            </span>
            <span className="text-[11px] text-neutral-400 hidden sm:inline">downloads</span>
          </div>

          {/* Play Store Mode / Companion Client Quick Link */}
          {onOpenCompanionModal && (
            <button
              onClick={onOpenCompanionModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              title="Automate installs & uninstalls with Zuzu Store Companion client"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Play Store Mode</span>
              <span className="sm:hidden">Auto Install</span>
            </button>
          )}

          {/* Quick Direct Download Button if apps exist - public for all visitors */}
          {hasApps && onQuickDownload && (
            <button
              onClick={onQuickDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 rounded-lg transition-all whitespace-nowrap shadow-sm cursor-pointer active:scale-95"
              title="Download latest APK directly without signing in"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Download APK</span>
            </button>
          )}

          {/* Admin Controls: ONLY visible when admin is authenticated! Hidden from public */}
          {admin && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Admin: {admin.name || 'Publisher'}</span>
                  <span className="sm:hidden">Admin</span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                  title="Log out of Admin Publisher Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mode Switcher */}
              {currentView === 'upload' ? (
                <button
                  onClick={() => onNavigate('store')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Storefront</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('upload')}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Publish APK</span>
                  <span className="sm:hidden">Publish</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
