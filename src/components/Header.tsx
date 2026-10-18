import React from 'react';
import { Download, UploadCloud, Smartphone, ShieldCheck, LogIn, LogOut } from 'lucide-react';
import { AdminUser } from '../types';

interface HeaderProps {
  currentView: 'store' | 'upload' | 'detail';
  onNavigate: (view: 'store' | 'upload') => void;
  onOpenInstallGuide: () => void;
  onQuickDownload?: () => void;
  hasApps: boolean;
  admin: AdminUser | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenInstallGuide,
  onQuickDownload,
  hasApps,
  admin,
  onOpenLoginModal,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Brand with Official Logo */}
        <button
          onClick={() => onNavigate('store')}
          className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5 text-left group"
        >
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-xl blur-xs opacity-70 group-hover:opacity-100 transition duration-300" />
            <img
              src="/zuzustore-logo.png"
              alt="ZuzuStore Logo"
              className="relative w-9 h-9 rounded-xl object-contain shadow-md border border-cyan-400/40"
            />
          </div>
          <div>
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 tracking-tight text-lg">
              ZuzuStore
            </span>
            <span className="hidden sm:inline-block text-[10px] ml-2 px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/50 text-cyan-300 font-mono font-normal">
              APK Hub
            </span>
          </div>
        </button>

        {/* Navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-neutral-300">
          <button
            onClick={() => onNavigate('store')}
            className={`transition-colors whitespace-nowrap ${
              currentView === 'store' ? 'text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Storefront
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
              Featured App
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
            All Apps
          </a>

          <button
            onClick={onOpenInstallGuide}
            className="hover:text-white text-neutral-400 transition-colors whitespace-nowrap"
          >
            How to Install
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentView === 'upload' ? 'text-cyan-400 font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Publisher Portal</span>
          </button>
        </nav>

        {/* Right Action Zone */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Direct Download Button if apps exist - anyone can click! */}
          {hasApps && onQuickDownload && (
            <button
              onClick={onQuickDownload}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              title="Download latest APK directly without signing in"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download APK</span>
            </button>
          )}

          {/* Admin Authentication Status */}
          {admin ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Admin</span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg transition-colors"
                title="Log out of Admin Publisher Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
              title="Admin sign-in to publish and manage APKs"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Login</span>
            </button>
          )}

          {/* Mode Switcher */}
          {currentView === 'upload' ? (
            <button
              onClick={() => onNavigate('store')}
              className="px-3.5 py-1.5 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('upload')}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-md shadow-cyan-950/40"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Publish APK</span>
              <span className="sm:hidden">Publish</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
