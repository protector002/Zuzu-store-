import React, { useState } from 'react';
import {
  Search,
  Download,
  Star,
  QrCode,
  Smartphone,
  Laptop,
  Check,
  TrendingUp,
  X,
  Package
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
  'Productivity',
  'Entertainment',
  'Utilities',
  'Tools',
  'Social',
  'Finance',
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<'All' | Platform>('All');
  const [sortBy, setSortBy] = useState<'downloads' | 'latest' | 'rating'>('downloads');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const activeSearch = searchQuery !== undefined ? searchQuery : internalSearch;

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    }
    setInternalSearch(val);
  };

  // Strictly filter for Android Phone apps (TV-only apps belong strictly to the Smart TV page)
  const phoneApps = filterPhoneApps(apps);

  // Filter apps in real-time
  const filteredApps = phoneApps
    .filter((app) => {
      const q = activeSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.packageId.toLowerCase().includes(q) ||
        (app.tagline && app.tagline.toLowerCase().includes(q)) ||
        (app.category && app.category.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All' || app.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesPlatform =
        selectedPlatform === 'All' ||
        app.supportedPlatforms.includes(selectedPlatform);

      return matchesSearch && matchesCategory && matchesPlatform;
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') {
        return (b.downloadsTotal || 0) - (a.downloadsTotal || 0);
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0; // latest / natural order
    });

  const handleDownloadClick = async (e: React.MouseEvent, app: StoreApp) => {
    e.stopPropagation();
    setDownloadingId(app.id);
    const phoneRel = getPhoneRelease(app);
    await onQuickDownload(app, phoneRel?.id);
    setTimeout(() => setDownloadingId(null), 3000);
  };

  return (
    <section id="catalog" className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Direct Distribution</span>
            <span>•</span>
            <span>No Account Required</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Explore All Applications
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl leading-relaxed">
            Download raw, verified APK installation files directly to your device with zero paywalls or registration requirements.
          </p>
        </div>

        {/* Real-time In-Page Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={activeSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search anime apps or package ID..."
            className="w-full pl-10 pr-9 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/20 transition-all font-medium"
          />
          {activeSearch && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Search Results Indicator */}
      {activeSearch.trim() && (
        <div className="flex items-center justify-between gap-3 mb-6 p-3 sm:p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-xs text-amber-300">
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              Showing real-time results for <strong className="text-white">"{activeSearch}"</strong> ({filteredApps.length} {filteredApps.length === 1 ? 'app' : 'apps'} found)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="text-neutral-400 hover:text-white font-semibold underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <X className="w-3 h-3" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Filter Row: Category Segmented Controls & Platform Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-neutral-800 text-amber-300 shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Sort:</span>
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
              <button
                onClick={() => setSortBy('downloads')}
                className={`px-2.5 py-1 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                  sortBy === 'downloads'
                    ? 'bg-neutral-800 text-amber-300 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Sort by Most Downloaded"
              >
                <TrendingUp className="w-3 h-3 text-amber-400" />
                <span>Popular</span>
              </button>
              <button
                onClick={() => setSortBy('latest')}
                className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                  sortBy === 'latest'
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setSortBy('rating')}
                className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                  sortBy === 'rating'
                    ? 'bg-neutral-800 text-amber-300 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Top Rated
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Platform:</span>
            {(['All', 'Android', 'Windows'] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat as any)}
                className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                  selectedPlatform === plat
                    ? 'bg-neutral-800 text-amber-300 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {plat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Apps */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-12 sm:py-16 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/40 p-6 sm:p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto text-amber-400 mb-3">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-base sm:text-lg text-white font-bold">
            {apps.length === 0
              ? 'No applications published yet'
              : activeSearch
              ? `No anime apps matching "${activeSearch}"`
              : 'No matching applications found'}
          </p>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {apps.length === 0
              ? admin
                ? 'The store catalog is ready. Upload and publish your first APK package.'
                : 'Direct Android application packages will appear here. Check back soon for fresh releases!'
              : activeSearch
              ? 'Try searching by a broader name or checking the exact package ID (e.g. com.zuzu).'
              : 'Try choosing a different category or platform filter.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {(apps.length > 0 || activeSearch) && (
              <button
                onClick={() => {
                  handleSearchChange('');
                  setSelectedCategory('All');
                  setSelectedPlatform('All');
                  setSortBy('downloads');
                }}
                className="px-4 py-2 text-xs font-bold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Clear All Filters
              </button>
            )}
            {admin && (
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 text-xs text-white font-semibold bg-gradient-to-r from-amber-500 to-red-600 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Publish APK</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredApps.map((app) => {
            const isCurrentlyDownloading = downloadingId === app.id;
            const phoneRel = getPhoneRelease(app);
            const fileSize = phoneRel?.fileSize || '32 MB';

            return (
              <div
                key={app.id}
                onClick={() => onSelectApp(app)}
                className="group relative bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-0.5 duration-200"
              >
                <div>
                  {/* Top line: Icon + Title + Version */}
                  <div className="flex items-start gap-3.5">
                    <img
                      src={app.iconUrl || '/zuzustore-logo.png'}
                      alt={app.name}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-contain border border-neutral-800 group-hover:border-amber-500/50 transition-colors shrink-0 shadow-md bg-neutral-950 p-1"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                          {app.name}
                        </h3>
                        {app.isOfficial && (
                          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/50 shrink-0">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {app.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Metadata strip */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 mt-3 pt-3 border-t border-neutral-800/60">
                    <span className="font-mono font-medium text-neutral-200">v{phoneRel?.version || app.currentVersion}</span>
                    <span className="text-neutral-600">•</span>
                    <span>{fileSize}</span>
                    <span className="text-neutral-600">•</span>
                    <span>{app.category}</span>
                    <span className="text-neutral-600">•</span>
                    <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{app.rating.toFixed(1)}</span>
                    </span>
                  </div>

                  {/* Package ID with Package Icon */}
                  <div className="mt-2 text-[11px] font-mono text-cyan-400/90 truncate flex items-center gap-1">
                    <Package className="w-3 h-3 shrink-0 text-cyan-400" />
                    <span className="truncate">{app.packageId}</span>
                  </div>
                </div>

                {/* Bottom Card Action */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-300 text-xs"
                    title={`${app.downloadsTotal.toLocaleString()} total downloads`}
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono font-bold text-white tabular-nums">
                      {app.downloadsTotal.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-neutral-400">dl</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQR(app);
                      }}
                      className="p-2 sm:p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title="Scan QR to download directly on mobile"
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                    </button>

                    <button
                      onClick={(e) => handleDownloadClick(e, app)}
                      disabled={isCurrentlyDownloading}
                      className={`px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white active:scale-95 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer ${
                        isCurrentlyDownloading
                          ? 'bg-neutral-700'
                          : 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500'
                      }`}
                    >
                      {isCurrentlyDownloading ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Streaming...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download APK</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
