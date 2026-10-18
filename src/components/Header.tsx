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
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Brand */}
        <button
          onClick={() => onNavigate('store')}
          className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
            APK
          </div>
          <div>
            <span className="font-extrabold">APK Store</span>
            <span className="hidden sm:inline-block text-[10px] ml-2 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 font-mono font-normal">
              Direct Hub
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-colors whitespace-nowrap"
              title="Download latest APK directly without signing in"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download APK</span>
            </button>
          )}

          {/* Admin Authentication Status */}
          {admin ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden md:inline truncate max-w-[150px]">John Sseruwagi</span>
                <span className="md:hidden">Admin</span>
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
              title="Admin account required only to publish APKs"
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
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
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
