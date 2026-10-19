import React, { useState } from 'react';
import { Search, Download, Star, QrCode, Smartphone, Laptop, Check } from 'lucide-react';
import { StoreApp, AppCategory, Platform, AdminUser } from '../types';

interface AppCatalogProps {
  apps: StoreApp[];
  onSelectApp: (app: StoreApp) => void;
  onQuickDownload: (app: StoreApp) => void;
  onOpenQR: (app: StoreApp) => void;
  onOpenUpload: () => void;
  admin?: AdminUser | null;
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<'All' | Platform>('All');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter apps
  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || app.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesPlatform =
      selectedPlatform === 'All' || app.supportedPlatforms.includes(selectedPlatform);

    return matchesSearch && matchesCategory && matchesPlatform;
  });

  const handleDownloadClick = async (e: React.MouseEvent, app: StoreApp) => {
    e.stopPropagation();
    setDownloadingId(app.id);
    await onQuickDownload(app);
    setTimeout(() => setDownloadingId(null), 3000);
  };

  return (
    <section id="catalog" className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Direct Distribution</span>
            <span>•</span>
            <span>No Account Required</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Explore All Applications
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-xl">
            Download raw, verified APK installation files directly to your device with zero paywalls or registration requirements.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search APKs, packages, names..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Filter Row: Category Segmented Controls & Platform Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400 shrink-0">
          <span className="hidden sm:inline">Platform:</span>
          {(['All', 'Android', 'Windows'] as const).map((plat) => (
            <button
              key={plat}
              onClick={() => setSelectedPlatform(plat)}
              className={`px-2.5 py-1 rounded transition-colors text-xs ${
                selectedPlatform === plat
                  ? 'bg-neutral-800 text-cyan-300 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {plat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Apps */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/30 p-6">
          <p className="text-base text-neutral-300 font-semibold">
            {apps.length === 0 ? 'No applications published yet' : 'No matching applications found'}
          </p>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {apps.length === 0
              ? admin
                ? 'The store catalog is ready. Upload and publish your first APK package.'
                : 'Direct Android application packages will appear here. Check back soon for fresh releases!'
              : 'Try clearing your search query or choosing a different category filter.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {apps.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedPlatform('All');
                }}
                className="px-4 py-2 text-xs text-neutral-300 hover:text-white bg-neutral-800 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
            {admin && (
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 text-xs text-white font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Publish APK</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => {
            const isCurrentlyDownloading = downloadingId === app.id;
            const latestRelease = app.releases[0];
            const fileSize = latestRelease?.fileSize || '32 MB';

            return (
              <div
                key={app.id}
                onClick={() => onSelectApp(app)}
                className="group relative bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-0.5 duration-200"
              >
                <div>
                  {/* Top line: Icon + Title + Version */}
                  <div className="flex items-start gap-4">
                    <img
                      src={app.iconUrl || '/zuzustore-logo.png'}
                      alt={app.name}
                      className="w-14 h-14 rounded-xl object-contain border border-neutral-800 group-hover:border-cyan-500/40 transition-colors shrink-0 shadow-md bg-neutral-950 p-1"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                          {app.name}
                        </h3>
                        {app.isOfficial && (
                          <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50 shrink-0">
                            Official
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {app.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Metadata strip */}
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-3.5 pt-3 border-t border-neutral-800/60">
                    <span className="font-mono font-medium text-neutral-200">v{app.currentVersion}</span>
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

                  {/* Package ID */}
                  <div className="mt-2 text-[11px] font-mono text-neutral-500 truncate">
                    {app.packageId}
                  </div>
                </div>

                {/* Bottom Card Action */}
                <div className="mt-5 pt-3.5 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-400 tabular-nums font-mono">
                    {app.downloadsTotal.toLocaleString()} dl
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQR(app);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                      title="Scan QR to download directly on mobile"
                    >
                      <QrCode className="w-4 h-4 text-cyan-400" />
                    </button>

                    <button
                      onClick={(e) => handleDownloadClick(e, app)}
                      disabled={isCurrentlyDownloading}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 active:scale-95 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      {isCurrentlyDownloading ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Downloading...</span>
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
