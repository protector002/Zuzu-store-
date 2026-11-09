import React, { useState, useRef } from 'react';
import {
  Search,
  Download,
  Star,
  QrCode,
  Check,
  TrendingUp,
  X,
  Package,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { StoreApp, AppCategory, Platform, AdminUser } from '../types';
import { filterPhoneApps, getPhoneRelease } from '../utils/editionHelper';

interface AppCatalogProps {
  apps: StoreApp[];
  onSelectApp: (app: StoreApp) => void;
  onQuickDownload: (app: StoreApp, releaseId?: string) => void;
  onOpenQR: (app: StoreApp) => void;
  onOpenUpload: () => void;
  admin?: AdminUser | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const CATEGORIES: ('All' | AppCategory | string)[] = [
  'All',
  'Streaming',
  'Anime',
  'Entertainment',
  'Media Player',
  'Utilities',
  'Tools',
  'Productivity',
];

export const AppCatalog: React.FC<AppCatalogProps> = ({
  apps,
  onSelectApp,
  onQuickDownload,
  onOpenQR,
  onOpenUpload,
  admin,
  searchQuery,
  onSearchChange,
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [mainTab, setMainTab] = useState<'for-you' | 'top-charts' | 'categories'>('for-you');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [chartType, setChartType] = useState<'top-free' | 'trending' | 'top-rated'>('top-free');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const activeSearch = searchQuery !== undefined ? searchQuery : internalSearch;

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    }
    setInternalSearch(val);
  };

  // Strictly filter for Android Phone apps, sorted by Super Admin displayOrder (1 is top/hero)
  const phoneApps = filterPhoneApps(apps).sort((a, b) => {
    const orderA = a.displayOrder !== undefined ? a.displayOrder : (a.isFeatured ? 1 : 9999);
    const orderB = b.displayOrder !== undefined ? b.displayOrder : (b.isFeatured ? 1 : 9999);
    if (orderA !== orderB) return orderA - orderB;
    return (b.downloadsTotal || 0) - (a.downloadsTotal || 0);
  });

  // Active search filtering
  const searchResults = phoneApps.filter((app) => {
    const q = activeSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      app.name.toLowerCase().includes(q) ||
      app.packageId.toLowerCase().includes(q) ||
      (app.tagline && app.tagline.toLowerCase().includes(q)) ||
      (app.category && app.category.toLowerCase().includes(q)) ||
      (app.developer?.name && app.developer.name.toLowerCase().includes(q)) ||
      (app.submittedBy?.name && app.submittedBy.name.toLowerCase().includes(q))
    );
  });

  const handleDownloadClick = async (e: React.MouseEvent, app: StoreApp) => {
    e.stopPropagation();
    setDownloadingId(app.id);
    const phoneRel = getPhoneRelease(app);
    await onQuickDownload(app, phoneRel?.id);
    setTimeout(() => setDownloadingId(null), 3000);
  };

  // Shelves computation for "For You" Play Store style
  const curatedForYouApps = [...phoneApps];
  const popularApps = [...phoneApps].sort((a, b) => (b.downloadsTotal || 0) - (a.downloadsTotal || 0));
  const topRatedApps = [...phoneApps].sort((a, b) => b.rating - a.rating);
  const newDeveloperApps = [...phoneApps].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  const streamingAnimeApps = phoneApps.filter((a) => {
    const cat = a.category.toLowerCase();
    return cat.includes('stream') || cat.includes('anime') || cat.includes('entertainment') || cat.includes('media');
  });
  const utilitiesToolsApps = phoneApps.filter((a) => {
    const cat = a.category.toLowerCase();
    return cat.includes('util') || cat.includes('tool') || cat.includes('product');
  });

  // Top charts sorted list
  const chartApps = [...phoneApps].sort((a, b) => {
    if (chartType === 'top-free') {
      return (b.downloadsTotal || 0) - (a.downloadsTotal || 0);
    }
    if (chartType === 'top-rated') {
      return b.rating - a.rating;
    }
    // Trending: weighted rating & downloads
    const scoreA = (a.downloadsTotal || 0) * 0.7 + a.rating * 100;
    const scoreB = (b.downloadsTotal || 0) * 0.7 + b.rating * 100;
    return scoreB - scoreA;
  });

  // Category browse apps
  const categoryBrowseApps = selectedCategory === 'All'
    ? phoneApps
    : phoneApps.filter((a) => a.category.toLowerCase() === selectedCategory.toLowerCase());

  // Horizontal shelf component for Play Store look
  const PlayStoreShelf = ({
    title,
    subtitle,
    appsList,
    onSeeAll,
    icon: ShelfIcon,
  }: {
    title: string;
    subtitle?: string;
    appsList: StoreApp[];
    onSeeAll?: () => void;
    icon?: React.ElementType;
  }) => {
    const scrollRef = useRef<HTMLDivElement | null>(null);

    if (appsList.length === 0) return null;

    const scrollLeft = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
      }
    };

    const scrollRight = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
      }
    };

    return (
      <div className="space-y-3.5 pt-2">
        {/* Shelf Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {ShelfIcon && (
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShelfIcon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-none">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSeeAll && (
              <button
                type="button"
                onClick={onSeeAll}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-neutral-900"
              >
                <span>See all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Scroll navigation buttons for desktop */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={scrollLeft}
                className="w-7 h-7 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={scrollRight}
                className="w-7 h-7 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Carousel Row (Play Store style) */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {appsList.map((app) => {
            const phoneRel = getPhoneRelease(app);
            const fileSize = phoneRel?.fileSize || '32 MB';
            const isCurrentlyDownloading = downloadingId === app.id;
            const devName = app.submittedBy?.name || app.developer?.name || 'Publisher';
            const isPaid = app.pricing && app.pricing.type === 'paid' && (app.pricing.price || 0) > 0;
            const priceLabel = isPaid ? `${app.pricing?.price.toLocaleString()} ${app.pricing?.currency || 'UGX'}` : 'Free';

            return (
              <div
                key={app.id}
                onClick={() => onSelectApp(app)}
                style={{ scrollSnapAlign: 'start' }}
                className="group relative w-32 sm:w-36 md:w-40 shrink-0 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-amber-500/40 rounded-2xl p-2.5 sm:p-3 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-lg hover:-translate-y-0.5 duration-150"
              >
                <div>
                  {/* Square / Squircle Icon */}
                  <div className="relative aspect-square w-full rounded-2xl bg-neutral-950 border border-neutral-800/80 overflow-hidden flex items-center justify-center p-1.5 shadow-sm group-hover:border-amber-500/30 transition-colors">
                    <img
                      src={app.iconUrl || '/zuzustore-logo.png'}
                      alt={app.name}
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                    {isPaid ? (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-neutral-950 font-black text-[9px] shadow-sm">
                        {app.pricing?.currency || 'UGX'}
                      </span>
                    ) : app.isOfficial && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-neutral-950" title="Verified Publisher" />
                    )}
                  </div>

                  {/* App Title */}
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 mt-2.5">
                    {app.name}
                  </h4>

                  {/* Developer Name */}
                  <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                    {devName}
                  </p>

                  {/* Rating & Size & Price */}
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-0.5 font-semibold text-neutral-200">
                      <span>{app.rating.toFixed(1)}</span>
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    </span>
                    <span>·</span>
                    <span className={isPaid ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                      {isPaid ? priceLabel : 'Free'}
                    </span>
                  </div>
                </div>

                {/* Direct Download Action Button */}
                <button
                  type="button"
                  onClick={(e) => handleDownloadClick(e, app)}
                  disabled={isCurrentlyDownloading}
                  className={`mt-2.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-bold text-neutral-950 transition-all flex items-center justify-center gap-1 shadow-xs active:scale-95 ${
                    isCurrentlyDownloading
                      ? 'bg-neutral-700 text-neutral-300'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400'
                  }`}
                >
                  {isCurrentlyDownloading ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Downloading</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      <span>{isPaid ? 'Buy APK' : 'Get APK'}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section id="catalog" className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Google Play Store Top Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        {/* Play Store Tabs: For You | Top Charts | Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => {
              setMainTab('for-you');
              if (activeSearch) handleSearchChange('');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              mainTab === 'for-you' && !activeSearch
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>For you</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab('top-charts');
              if (activeSearch) handleSearchChange('');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              mainTab === 'top-charts' && !activeSearch
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Top charts</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab('categories');
              if (activeSearch) handleSearchChange('');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              mainTab === 'categories' && !activeSearch
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories</span>
          </button>
        </div>

        {/* Real-time In-Page Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={activeSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search apps, anime, or packages..."
            className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-medium"
          />
          {activeSearch && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Search Results View */}
      {activeSearch.trim() ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs text-amber-300">
            <span>
              Showing results for <strong className="text-white font-bold">"{activeSearch}"</strong> ({searchResults.length} {searchResults.length === 1 ? 'app' : 'apps'} found)
            </span>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="text-neutral-400 hover:text-white font-semibold underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear search</span>
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 max-w-md mx-auto space-y-2">
              <Search className="w-8 h-8 text-neutral-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No applications found</h4>
              <p className="text-xs text-neutral-400">
                Try searching for another app name, developer name, or package ID (e.g. com.zuzu).
              </p>
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="mt-2 py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl"
              >
                View all apps
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {searchResults.map((app) => {
                const phoneRel = getPhoneRelease(app);
                const fileSize = phoneRel?.fileSize || '32 MB';
                const isCurrentlyDownloading = downloadingId === app.id;
                const devName = app.submittedBy?.name || app.developer?.name || 'Publisher';
                const isPaid = app.pricing && app.pricing.type === 'paid' && (app.pricing.price || 0) > 0;
                const priceLabel = isPaid ? `${app.pricing?.price.toLocaleString()} ${app.pricing?.currency || 'UGX'}` : 'Free';

                return (
                  <div
                    key={app.id}
                    onClick={() => onSelectApp(app)}
                    className="group bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-2xl p-3 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="relative aspect-square w-full rounded-2xl bg-neutral-950 border border-neutral-800/80 overflow-hidden flex items-center justify-center p-2 shadow-xs group-hover:border-amber-500/30">
                        <img
                          src={app.iconUrl || '/zuzustore-logo.png'}
                          alt={app.name}
                          className="w-full h-full object-contain rounded-xl"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/zuzustore-logo.png';
                          }}
                        />
                        {isPaid && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-neutral-950 font-black text-[9px] shadow-sm">
                            {app.pricing?.currency || 'UGX'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 mt-2.5">
                        {app.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                        {devName}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-0.5 font-semibold text-neutral-200">
                          <span>{app.rating.toFixed(1)}</span>
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        </span>
                        <span>·</span>
                        <span className={isPaid ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                          {isPaid ? priceLabel : 'Free'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadClick(e, app)}
                      disabled={isCurrentlyDownloading}
                      className={`mt-2.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-bold text-neutral-950 transition-all flex items-center justify-center gap-1 ${
                        isCurrentlyDownloading
                          ? 'bg-neutral-700 text-neutral-300'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      <span>{isCurrentlyDownloading ? 'Downloading' : (isPaid ? 'Buy APK' : 'Get APK')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Standard Play Store Tabs */
        <>
          {/* TAB 1: FOR YOU (Play Store Shelves Layout) */}
          {mainTab === 'for-you' && (
            <div className="space-y-8">
              {/* Shelf 1: Recommended For You (Curated in exact Super Admin display order) */}
              {curatedForYouApps.length > 0 && (
                <PlayStoreShelf
                  title="Recommended For You"
                  subtitle="Top featured apps curated for your Android device"
                  appsList={curatedForYouApps}
                  icon={Sparkles}
                />
              )}

              {/* Shelf 2: Popular & Trending Apps */}
              <PlayStoreShelf
                title="Popular & Trending Apps"
                subtitle="Most downloaded Android packages across Zuzu Store"
                appsList={popularApps}
                icon={Flame}
                onSeeAll={() => {
                  setMainTab('top-charts');
                  setChartType('trending');
                }}
              />

              {/* Shelf 2: Anime & Video Streaming */}
              {streamingAnimeApps.length > 0 && (
                <PlayStoreShelf
                  title="Anime & Streaming Apps"
                  subtitle="Fast media streaming players and anime packages"
                  appsList={streamingAnimeApps}
                  icon={Sparkles}
                  onSeeAll={() => {
                    setMainTab('categories');
                    setSelectedCategory('Streaming');
                  }}
                />
              )}

              {/* Shelf 3: Top Rated by Community */}
              <PlayStoreShelf
                title="Top Rated by Community"
                subtitle="Highest user reviews and ratings"
                appsList={topRatedApps}
                icon={Star}
                onSeeAll={() => {
                  setMainTab('top-charts');
                  setChartType('top-rated');
                }}
              />

              {/* Shelf 4: New Developer Releases */}
              {newDeveloperApps.length > 0 && (
                <PlayStoreShelf
                  title="New Developer Releases"
                  subtitle="Recently submitted and approved packages"
                  appsList={newDeveloperApps}
                  icon={Award}
                />
              )}

              {/* Shelf 5: Utilities & Tools */}
              {utilitiesToolsApps.length > 0 && (
                <PlayStoreShelf
                  title="Utilities & Productivity Tools"
                  subtitle="Essential tools and system packages"
                  appsList={utilitiesToolsApps}
                  icon={Package}
                  onSeeAll={() => {
                    setMainTab('categories');
                    setSelectedCategory('Utilities');
                  }}
                />
              )}
            </div>
          )}

          {/* TAB 2: TOP CHARTS (Google Play Store Ranked List 1, 2, 3...) */}
          {mainTab === 'top-charts' && (
            <div className="space-y-6">
              {/* Play Store Chart Filters: Top Free | Trending | Top Rated */}
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <button
                  type="button"
                  onClick={() => setChartType('top-free')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    chartType === 'top-free'
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Top Free Apps
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('trending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    chartType === 'trending'
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Trending
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('top-rated')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    chartType === 'top-rated'
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Top Rated
                </button>
              </div>

              {/* Top Charts Ranked List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {chartApps.map((app, index) => {
                  const phoneRel = getPhoneRelease(app);
                  const fileSize = phoneRel?.fileSize || '32 MB';
                  const isCurrentlyDownloading = downloadingId === app.id;
                  const rankNumber = index + 1;
                  const devName = app.submittedBy?.name || app.developer?.name || 'Publisher';
                  const isPaid = app.pricing && app.pricing.type === 'paid' && (app.pricing.price || 0) > 0;
                  const priceLabel = isPaid ? `${app.pricing?.price.toLocaleString()} ${app.pricing?.currency || 'UGX'}` : 'Free';

                  return (
                    <div
                      key={app.id}
                      onClick={() => onSelectApp(app)}
                      className="group bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-amber-500/40 rounded-2xl p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs hover:shadow-md"
                    >
                      {/* Left: Rank + Icon + Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Play Store Rank Number */}
                        <span className={`text-base font-black w-6 text-center tabular-nums shrink-0 ${
                          rankNumber === 1
                            ? 'text-amber-400'
                            : rankNumber === 2
                            ? 'text-neutral-300'
                            : rankNumber === 3
                            ? 'text-amber-600'
                            : 'text-neutral-500'
                        }`}>
                          {rankNumber}
                        </span>

                        {/* App Icon */}
                        <div className="w-13 h-13 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0 p-1 flex items-center justify-center">
                          <img
                            src={app.iconUrl || '/zuzustore-logo.png'}
                            alt={app.name}
                            className="w-full h-full object-contain rounded-xl"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/zuzustore-logo.png';
                            }}
                          />
                        </div>

                        {/* Text Metadata */}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                            {app.name}
                          </h4>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {app.category} · {devName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-0.5 font-semibold text-neutral-200">
                              <span>{app.rating.toFixed(1)}</span>
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            </span>
                            <span>·</span>
                            <span>{app.downloadsTotal.toLocaleString()} dl</span>
                            <span>·</span>
                            <span className={isPaid ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                              {isPaid ? priceLabel : 'Free'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action: Download Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenQR(app);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg hover:bg-neutral-700"
                          title="Scan QR"
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadClick(e, app)}
                          disabled={isCurrentlyDownloading}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold text-neutral-950 transition-all ${
                            isCurrentlyDownloading
                              ? 'bg-neutral-700 text-neutral-300'
                              : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95'
                          }`}
                        >
                          {isCurrentlyDownloading ? 'Streaming' : (isPaid ? 'Buy APK' : 'Install')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES BROWSER */}
          {mainTab === 'categories' && (
            <div className="space-y-6">
              {/* Category Chips Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Category Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {categoryBrowseApps.map((app) => {
                  const phoneRel = getPhoneRelease(app);
                  const fileSize = phoneRel?.fileSize || '32 MB';
                  const isCurrentlyDownloading = downloadingId === app.id;
                  const devName = app.submittedBy?.name || app.developer?.name || 'Publisher';
                  const isPaid = app.pricing && app.pricing.type === 'paid' && (app.pricing.price || 0) > 0;
                  const priceLabel = isPaid
                    ? `${app.pricing?.currency || 'UGX'} ${app.pricing?.price.toLocaleString()}`
                    : 'Free';

                  return (
                    <div
                      key={app.id}
                      onClick={() => onSelectApp(app)}
                      className="group bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-amber-500/40 rounded-2xl p-3 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                    >
                      <div>
                        <div className="relative aspect-square w-full rounded-2xl bg-neutral-950 border border-neutral-800/80 overflow-hidden flex items-center justify-center p-2 shadow-xs group-hover:border-amber-500/30">
                          <img
                            src={app.iconUrl || '/zuzustore-logo.png'}
                            alt={app.name}
                            className="w-full h-full object-contain rounded-xl"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/zuzustore-logo.png';
                            }}
                          />
                          <span
                            className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                              isPaid
                                ? 'bg-amber-500 text-neutral-950 font-black'
                                : 'bg-neutral-900/80 text-neutral-300 border border-neutral-700/60'
                            }`}
                          >
                            {isPaid ? priceLabel : 'Free'}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 mt-2.5">
                          {app.name}
                        </h4>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          {devName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-1">
                          <span className="flex items-center gap-0.5 font-semibold text-neutral-200">
                            <span>{app.rating.toFixed(1)}</span>
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          </span>
                          <span>·</span>
                          <span>{fileSize}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDownloadClick(e, app)}
                        disabled={isCurrentlyDownloading}
                        className={`mt-2.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-bold text-neutral-950 transition-all flex items-center justify-center gap-1 ${
                          isCurrentlyDownloading
                            ? 'bg-neutral-700 text-neutral-300'
                            : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400'
                        }`}
                      >
                        <Download className="w-3 h-3" />
                        <span>{isCurrentlyDownloading ? 'Downloading' : (isPaid ? 'Buy APK' : 'Get APK')}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin Quick Publisher Shortcut */}
      {admin && (
        <div className="pt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
          <span>Logged in as Super Admin ({admin.email})</span>
          <button
            type="button"
            onClick={onOpenUpload}
            className="py-1 px-3 bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 rounded-lg font-semibold cursor-pointer"
          >
            Open Publisher Console
          </button>
        </div>
      )}
    </section>
  );
};
