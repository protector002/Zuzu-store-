import React, { useState, useEffect } from 'react';
import { Download, UploadCloud, Smartphone, ShieldCheck, LogIn, LogOut, Tv, Check, Sparkles, Flame } from 'lucide-react';
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
            className={`group relative px-3 py-1.5 rounded-xl font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              currentView === 'store'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
            }`}
          >
            {currentView === 'store' ? (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0 shadow-xs animate-fade-in">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            ) : (
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
            )}
            <span>Android Phone</span>
            {currentView === 'store' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => onNavigate('tv')}
            className={`group relative px-3 py-1.5 rounded-xl font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              currentView === 'tv'
                ? 'bg-red-500/20 text-red-300 border border-red-500/60 shadow-sm shadow-red-500/25'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent animate-eyecatch-wiggle'
            }`}
          >
            {currentView === 'tv' ? (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-fade-in">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            ) : (
              <div className="relative shrink-0 flex items-center">
                <Tv className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              </div>
            )}
            <span>Smart TV</span>
            {currentView === 'tv' ? (
              <span className="text-[10px] bg-red-500/30 border border-red-500/50 text-red-200 px-1.5 py-0.5 rounded-full font-semibold">
                Checked
              </span>
            ) : (
              <span className="text-[10px] bg-gradient-to-r from-red-600 to-amber-500 text-white px-2 py-0.5 rounded-full font-extrabold shadow-xs animate-pulse">
                HOT
              </span>
            )}
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
          {/* Dual Platform Switcher: Android Phone vs Smart TV with Eye-Catching Check Animation */}
          <div className="relative flex items-center bg-neutral-900/90 border border-neutral-700/80 rounded-2xl p-1 text-xs shadow-xl shadow-black/40 backdrop-blur-md">
            {/* Phone Button */}
            <button
              onClick={() => onNavigate('store')}
              className={`group relative px-2.5 sm:px-3.5 py-1.5 rounded-xl font-black flex items-center gap-1.5 sm:gap-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                currentView === 'store'
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-300/80 scale-100 animate-glow-amber'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80 hover:scale-105 active:scale-95'
              }`}
              title="View Android Phone Storefront"
            >
              {/* Shimmer sweep on active/hover */}
              <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700" />

              {currentView === 'store' ? (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-neutral-950 text-amber-400 shadow-xs animate-fade-in shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3] animate-bounce" />
                </span>
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:rotate-12 transition-transform duration-300" />
              )}

              <span className="tracking-tight font-extrabold">
                <span className="hidden sm:inline">Phone</span>
                <span className="sm:hidden">Phone</span>
              </span>

              {currentView === 'store' ? (
                <span className="hidden md:inline-flex text-[9px] font-black uppercase tracking-wider bg-neutral-950/25 px-1.5 py-0.5 rounded text-neutral-950">
                  ✓ Active
                </span>
              ) : null}
            </button>

            {/* TV Button with eye-catching check and attract animation */}
            <button
              onClick={() => onNavigate('tv')}
              className={`group relative px-2.5 sm:px-3.5 py-1.5 rounded-xl font-black flex items-center gap-1.5 sm:gap-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                currentView === 'tv'
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-md shadow-red-600/35 ring-2 ring-red-400/80 scale-100 animate-glow-red'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80 hover:scale-105 active:scale-95 border border-red-500/40 bg-red-950/30 animate-eyecatch-wiggle'
              }`}
              title="View Smart TV & Fire TV Page"
            >
              {/* Shimmer beam sweeps across TV button continuously to attract clicks */}
              <span className="absolute inset-0 w-2/3 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none animate-shimmer-sweep" />

              {currentView === 'tv' ? (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white text-red-600 shadow-xs animate-fade-in shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3] animate-bounce" />
                </span>
              ) : (
                <div className="relative shrink-0 flex items-center">
                  <Tv className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                </div>
              )}

              <span className="tracking-tight font-extrabold">
                <span className="hidden sm:inline">Smart TV</span>
                <span className="sm:hidden">TV</span>
              </span>

              {currentView === 'tv' ? (
                <span className="hidden md:inline-flex text-[9px] font-black uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded text-white">
                  ✓ Active
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-red-500 to-amber-500 text-white px-1.5 py-0.5 rounded-full shadow-xs animate-pulse">
                  HOT
                </span>
              )}
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
