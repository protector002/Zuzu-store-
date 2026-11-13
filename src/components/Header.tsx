import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  UploadCloud,
  Smartphone,
  ShieldCheck,
  LogOut,
  Tv,
  Check,
  Search,
  X,
  Package,
  ArrowRight,
  ExternalLink,
  Code2,
  Crown
} from 'lucide-react';
import { StoreApp, AdminUser, DeveloperUser } from '../types';
import { getPhoneRelease, getTvRelease } from '../utils/editionHelper';

interface HeaderProps {
  currentView: 'store' | 'upload' | 'detail' | 'tv' | 'developer_console';
  onNavigate: (view: 'store' | 'upload' | 'tv' | 'developer_console') => void;
  onOpenInstallGuide: () => void;
  onQuickDownload?: () => void;
  hasApps: boolean;
  totalDownloads?: number;
  admin: AdminUser | null;
  developer?: DeveloperUser | null;
  onOpenDeveloperPortal?: () => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onSecretAdminTrigger?: () => void;
  // Real-time Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  apps?: StoreApp[];
  onSelectApp?: (app: StoreApp) => void;
  isGodModeActive?: boolean;
  onOpenGodMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenInstallGuide,
  onQuickDownload,
  hasApps,
  totalDownloads = 0,
  admin,
  developer,
  onOpenDeveloperPortal,
  onOpenLoginModal: _onOpenLoginModal,
  onLogout,
  onSecretAdminTrigger,
  searchQuery,
  onSearchChange,
  apps = [],
  onSelectApp,
  isGodModeActive = false,
  onOpenGodMode,
}) => {
  // Discreet secret logo multi-tap (3 taps within 2 seconds unlocks admin login modal)
  const [logoTapCount, setLogoTapCount] = useState(0);

  // Search state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (logoTapCount > 0) {
      const timer = setTimeout(() => setLogoTapCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [logoTapCount]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (ESC to clear search / close dropdown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setIsMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogoTap = () => {
    const next = logoTapCount + 1;
    if (next >= 3) {
      setLogoTapCount(0);
      onSecretAdminTrigger?.();
    } else {
      setLogoTapCount(next);
    }
  };

  // Real-time matching anime apps by name or package ID
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchingApps = normalizedQuery
    ? apps
        .filter((app) => {
          return (
            app.name.toLowerCase().includes(normalizedQuery) ||
            app.packageId.toLowerCase().includes(normalizedQuery) ||
            (app.tagline && app.tagline.toLowerCase().includes(normalizedQuery)) ||
            (app.category && app.category.toLowerCase().includes(normalizedQuery))
          );
        })
        .slice(0, 6)
    : [];

  const handleSelectSearchResult = (app: StoreApp) => {
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    if (onSelectApp) {
      onSelectApp(app);
    } else {
      onNavigate('store');
    }
  };

  const handleClearSearch = () => {
    onSearchChange('');
    searchInputRef.current?.focus();
    mobileInputRef.current?.focus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    if (currentView !== 'store' && currentView !== 'tv') {
      onNavigate('store');
    }
    setTimeout(() => {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md">
      {/* Primary Top Bar Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
        {/* Brand with Official Logo - Tapping 3 times secretly unlocks Admin Login */}
        <button
          onClick={() => {
            onNavigate('store');
            handleLogoTap();
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 text-left group cursor-pointer"
          title="ZuzuStore • Tap to go home"
        >
          <div className="relative shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 rounded-xl blur-xs opacity-75 group-hover:opacity-100 transition duration-300" />
            <img
              src="/public/assets/aistudio/file_00000000212c8208b64f5bd04e8c4ee8_95799501.png"
              alt="Zuzu Logo"
              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain shadow-md border border-amber-400/50"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/zuzustore-logo.png';
              }}
            />
          </div>
          <div className="flex items-center">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-red-500 tracking-tight text-base sm:text-xl">
              ZuzuStore
            </span>
            <span className="hidden xl:inline-block text-[10px] ml-2 px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300 font-mono font-medium">
              Anime APKs
            </span>
          </div>
        </button>

        {/* Real-Time Search Bar (Desktop & Tablet screens: md+) */}
        <div ref={searchContainerRef} className="relative hidden md:block flex-1 max-w-xs lg:max-w-md mx-2">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="relative flex items-center">
              <Search
                className={`w-4 h-4 absolute left-3 pointer-events-none transition-colors ${
                  isSearchFocused || searchQuery ? 'text-amber-400' : 'text-neutral-500'
                }`}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search anime apps or package ID..."
                className="w-full pl-9 pr-9 py-2 bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 transition-all outline-hidden shadow-inner font-medium"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 p-1 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="absolute right-3 text-[10px] font-mono text-neutral-600 hidden lg:inline pointer-events-none">
                  ESC
                </span>
              )}
            </div>
          </form>

          {/* Real-Time Dropdown Results Popover (Desktop) */}
          {isSearchFocused && normalizedQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900/95 border border-neutral-700/80 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden z-50 animate-fade-in">
              <div className="p-3 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Anime search results for <strong className="text-white">"{searchQuery}"</strong></span>
                </span>
                <span className="text-[11px] font-mono text-neutral-500">
                  {matchingApps.length} {matchingApps.length === 1 ? 'match' : 'matches'}
                </span>
              </div>

              {matchingApps.length > 0 ? (
                <div className="divide-y divide-neutral-800/60 max-h-80 overflow-y-auto">
                  {matchingApps.map((app) => {
                    const phoneRel = getPhoneRelease(app);
                    const tvRel = getTvRelease(app);
                    const isTv = Boolean(tvRel && !phoneRel);

                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(app)}
                        className="w-full p-3 hover:bg-neutral-800/70 transition-colors flex items-center justify-between gap-3 text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={app.iconUrl || '/zuzustore-logo.png'}
                            alt={app.name}
                            className="w-9 h-9 rounded-xl object-contain bg-neutral-950 border border-neutral-800 p-0.5 shrink-0"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/zuzustore-logo.png';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                {app.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-neutral-800 text-neutral-300 shrink-0">
                                v{app.currentVersion}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 truncate mt-0.5 font-mono">
                              <Package className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="text-cyan-300 truncate">{app.packageId}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                            isTv ? 'bg-red-950/80 text-red-300 border border-red-800/60' : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          }`}>
                            {isTv ? <Tv className="w-2.5 h-2.5 text-red-400" /> : <Smartphone className="w-2.5 h-2.5 text-amber-400" />}
                            <span>{isTv ? 'TV' : 'Phone'}</span>
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  })}

                  <div className="p-2.5 bg-neutral-950/60 text-center">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Explore all matching apps in catalog</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-neutral-300">
                    No anime apps or packages matching <strong className="text-white">"{searchQuery}"</strong>
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Try searching by package ID like <code className="text-cyan-400">com.zuzu</code> or general name.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="mt-2 px-3 py-1 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation links (Desktop only: lg+) */}
        <nav className="hidden xl:flex items-center gap-4 text-xs font-medium text-neutral-300">
          {hasApps && (
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
              className="hover:text-white text-neutral-400 transition-colors whitespace-nowrap py-1"
            >
              All APKs
            </a>
          )}

          <button
            onClick={onOpenInstallGuide}
            className="hover:text-white text-neutral-400 transition-colors whitespace-nowrap py-1"
          >
            Installation Guide
          </button>

          {/* Publisher Portal Tab: ONLY visible to logged-in administrator */}
          {admin && (
            <button
              onClick={() => onNavigate('upload')}
              className={`transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer py-1 ${
                currentView === 'upload' ? 'text-amber-400 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Publisher Portal</span>
            </button>
          )}
        </nav>

        {/* Right Action Zone */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Admin God Mode Button (Tablet & Desktop sm+: mobile uses dedicated admin bar below to avoid clipping) */}
          {admin && (
            <button
              type="button"
              onClick={() => (onOpenGodMode ? onOpenGodMode() : onNavigate('upload'))}
              className={`hidden sm:flex group relative px-3 py-1.5 rounded-xl font-black items-center gap-1.5 transition-all duration-300 cursor-pointer overflow-hidden border whitespace-nowrap shrink-0 active:scale-95 ${
                isGodModeActive
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 border-amber-300 text-neutral-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/80'
                  : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/60 text-amber-300 hover:text-white shadow-xs'
              }`}
              title="Super Admin God Mode & Platform Operations"
              aria-label="Open Super Admin God Mode"
            >
              <Crown className={`w-3.5 h-3.5 group-hover:rotate-12 transition-transform fill-current shrink-0 ${isGodModeActive ? 'text-neutral-950' : 'text-amber-400'}`} />
              <span className="text-xs tracking-tight font-black">
                👑 God Mode
              </span>
            </button>
          )}

          {/* Become a Developer / Get Console Button (Visible & fully functional on Mobile, Tablet, and Desktop) */}
          <button
            type="button"
            onClick={onOpenDeveloperPortal}
            className={`group relative px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-extrabold flex items-center gap-1 sm:gap-1.5 transition-all duration-300 cursor-pointer overflow-hidden border whitespace-nowrap shrink-0 active:scale-95 ${
              currentView === 'developer_console'
                ? 'bg-gradient-to-r from-amber-500/25 via-amber-600/30 to-amber-500/25 border-amber-400/90 text-amber-300 shadow-md shadow-amber-500/25 ring-1 ring-amber-400/50'
                : 'bg-neutral-900/90 hover:bg-neutral-800 border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white shadow-xs'
            }`}
            title={developer ? 'Open Developer Console' : 'Become a Developer • Get Console & Publish APKs'}
            aria-label={developer ? 'Open Developer Console' : 'Become a Developer • Get Console'}
          >
            {/* Shimmer sweep on hover */}
            <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700" />

            {/* Icon: Checkmark if active view, or code icon */}
            {currentView === 'developer_console' ? (
              <span className="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-400 text-neutral-950 shrink-0 shadow-xs">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            ) : (
              <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 group-hover:rotate-6 transition-transform" />
            )}

            {/* Responsive Text Label */}
            <span className="text-[11px] sm:text-xs tracking-tight font-black">
              {developer ? (
                <>
                  <span className="hidden sm:inline">Dev Console</span>
                  <span className="sm:hidden">Console</span>
                </>
              ) : (
                <>
                  <span className="hidden xl:inline">Become a Developer</span>
                  <span className="hidden sm:inline xl:hidden">Get Console</span>
                  <span className="sm:hidden">Get Console</span>
                </>
              )}
            </span>

            {/* Small active badge or beacon */}
            {developer ? (
              <span className="hidden md:inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active Developer" />
            ) : (
              <span className="hidden xl:inline-flex text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded shrink-0">
                Publish
              </span>
            )}
          </button>

          {/* Mobile Search Toggle Button (visible on mobile screens < md) */}
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(!isMobileSearchOpen);
              if (!isMobileSearchOpen) {
                setTimeout(() => mobileInputRef.current?.focus(), 150);
              }
            }}
            className={`md:hidden p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer relative ${
              isMobileSearchOpen || searchQuery
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-xs'
                : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Search Anime APKs"
            aria-label="Toggle search bar"
          >
            <Search className="w-4 h-4" />
            {searchQuery && !isMobileSearchOpen && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          {/* Dual Platform Switcher: Android Phone vs Smart TV with Eye-Catching Check Animation */}
          <div className="relative flex items-center bg-neutral-900/90 border border-neutral-700/80 rounded-2xl p-0.5 sm:p-1 text-xs shadow-xl shadow-black/40 backdrop-blur-md">
            {/* Phone Button */}
            <button
              onClick={() => onNavigate('store')}
              className={`group relative px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-black flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                currentView === 'store'
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-neutral-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-300/80 scale-100 animate-glow-amber'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80 hover:scale-105 active:scale-95'
              }`}
              title="View Android Phone Storefront"
            >
              {/* Shimmer sweep on active/hover */}
              <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700" />

              {currentView === 'store' ? (
                <span className="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-neutral-950 text-amber-400 shadow-xs animate-fade-in shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3] animate-bounce" />
                </span>
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:rotate-12 transition-transform duration-300" />
              )}

              <span className="tracking-tight font-extrabold text-[11px] sm:text-xs">
                <span>Phone</span>
              </span>

              {currentView === 'store' ? (
                <span className="hidden lg:inline-flex text-[9px] font-black uppercase tracking-wider bg-neutral-950/25 px-1.5 py-0.5 rounded text-neutral-950">
                  ✓ Active
                </span>
              ) : null}
            </button>

            {/* TV Button with eye-catching check and attract animation */}
            <button
              onClick={() => onNavigate('tv')}
              className={`group relative px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-black flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                currentView === 'tv'
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-md shadow-red-600/35 ring-2 ring-red-400/80 scale-100 animate-glow-red'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80 hover:scale-105 active:scale-95 border border-red-500/40 bg-red-950/30 animate-eyecatch-wiggle'
              }`}
              title="View Smart TV & Fire TV Page"
            >
              {/* Shimmer beam sweeps across TV button continuously to attract clicks */}
              <span className="absolute inset-0 w-2/3 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none animate-shimmer-sweep" />

              {currentView === 'tv' ? (
                <span className="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white text-red-600 shadow-xs animate-fade-in shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3] animate-bounce" />
                </span>
              ) : (
                <div className="relative shrink-0 flex items-center">
                  <Tv className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                  <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500" />
                  </span>
                </div>
              )}

              <span className="tracking-tight font-extrabold text-[11px] sm:text-xs">
                <span className="hidden sm:inline">Smart TV</span>
                <span className="sm:hidden">TV</span>
              </span>

              {currentView === 'tv' ? (
                <span className="hidden lg:inline-flex text-[9px] font-black uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded text-white">
                  ✓ Active
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-red-500 to-amber-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full shadow-xs animate-pulse">
                  HOT
                </span>
              )}
            </button>
          </div>

          {/* Total App Downloads Metric Badge (hidden on small mobile to preserve layout) */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs shadow-inner"
            title="Total downloads across all applications on ZuzuStore"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono font-bold text-white tabular-nums">
              {totalDownloads.toLocaleString()}
            </span>
            <span className="text-[11px] text-neutral-400">dl</span>
          </div>

          {/* Quick Direct Download Button if apps exist (hidden on small mobile) */}
          {hasApps && onQuickDownload && (
            <button
              onClick={onQuickDownload}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 rounded-lg transition-all whitespace-nowrap shadow-sm cursor-pointer active:scale-95"
              title="Download latest APK directly without signing in"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span className="hidden md:inline">Download APK</span>
              <span className="md:hidden">APK</span>
            </button>
          )}

          {/* Admin Controls: Tablet/Desktop (sm+) — Mobile uses dedicated admin bar below */}
          {admin && (
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden md:inline">Admin: {admin.name || 'Publisher'}</span>
                <span className="md:hidden">Admin</span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Log out of Admin Publisher Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Admin Quick-Access Bar (< sm): Prevents top-row overflow and guarantees God Mode is 100% accessible on phones */}
      {admin && (
        <div className="sm:hidden border-t border-neutral-800/80 bg-neutral-900/75 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => (onOpenGodMode ? onOpenGodMode() : onNavigate('upload'))}
              className={`px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 transition-all cursor-pointer border text-xs active:scale-95 ${
                isGodModeActive
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 border-amber-300 text-neutral-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/80'
                  : 'bg-amber-950/60 hover:bg-amber-900/70 border-amber-500/70 text-amber-300'
              }`}
              title="Open Super Admin God Mode"
              aria-label="Open Super Admin God Mode"
            >
              <Crown className={`w-3.5 h-3.5 fill-current shrink-0 ${isGodModeActive ? 'text-neutral-950' : 'text-amber-400'}`} />
              <span>👑 God Mode</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
                currentView === 'upload' && !isGodModeActive
                  ? 'bg-neutral-800 border-neutral-600 text-white'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-300'
              }`}
            >
              <UploadCloud className="w-3 h-3 text-cyan-400" />
              <span>Publisher</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Admin</span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-neutral-300 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Log out of Admin Publisher Account"
              aria-label="Log out of Admin Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Expandable Mobile Search Row (Mobile screens: < md) */}
      {(isMobileSearchOpen || searchQuery) && (
        <div className="md:hidden border-t border-neutral-800/80 bg-neutral-950/95 px-3 py-2.5 animate-slide-up">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-amber-400 absolute left-3 pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search anime apps or package ID..."
                className="w-full pl-9 pr-9 py-2 bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl text-xs text-white placeholder-neutral-500 outline-hidden font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 p-1 text-neutral-400 hover:text-white rounded-md"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (searchQuery) {
                  onSearchChange('');
                }
                setIsMobileSearchOpen(false);
              }}
              className="p-2 text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer shrink-0"
            >
              Cancel
            </button>
          </form>

          {/* Quick Mobile Results Strip */}
          {normalizedQuery && (
            <div className="mt-2 text-xs text-neutral-400 flex items-center justify-between px-1">
              <span>
                Found <strong className="text-amber-400 font-bold">{matchingApps.length}</strong> {matchingApps.length === 1 ? 'anime app' : 'anime apps'}
              </span>
              {matchingApps.length > 0 && (
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="text-amber-400 font-semibold underline"
                >
                  View in Catalog
                </button>
              )}
            </div>
          )}

          {/* Mobile Instant Match Cards */}
          {normalizedQuery && matchingApps.length > 0 && (
            <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
              {matchingApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleSelectSearchResult(app)}
                  className="w-full p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 flex items-center justify-between gap-2.5 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={app.iconUrl || '/zuzustore-logo.png'}
                      alt={app.name}
                      className="w-8 h-8 rounded-lg object-contain bg-neutral-950 border border-neutral-800 p-0.5 shrink-0"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{app.name}</div>
                      <div className="text-[10px] font-mono text-cyan-400 truncate">{app.packageId}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
