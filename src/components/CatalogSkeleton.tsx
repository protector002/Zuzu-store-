import React from 'react';

export const CatalogSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 animate-pulse" aria-label="Loading ZuzuStore catalog">
      {/* Hero Skeleton */}
      <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="h-4 w-36 bg-neutral-800 rounded-lg" />
          <div className="h-8 sm:h-10 w-3/4 bg-neutral-800 rounded-xl" />
          <div className="h-4 w-full max-w-md bg-neutral-800/80 rounded-lg" />
          <div className="flex items-center gap-3 pt-2">
            <div className="h-11 w-44 bg-amber-500/20 border border-amber-500/30 rounded-xl" />
            <div className="h-11 w-28 bg-neutral-800 rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-5 hidden sm:flex justify-end">
          <div className="w-40 h-40 rounded-3xl bg-neutral-800/70 border border-neutral-800" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-neutral-800 rounded-xl" />
          <div className="h-9 w-28 bg-neutral-900 rounded-xl" />
          <div className="h-9 w-28 bg-neutral-900 rounded-xl" />
        </div>
        <div className="h-9 w-56 bg-neutral-900 rounded-xl hidden md:block" />
      </div>

      {/* Shelf Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-48 bg-neutral-800 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-3 space-y-3"
            >
              <div className="aspect-square w-full rounded-2xl bg-neutral-800/70" />
              <div className="h-3.5 w-3/4 bg-neutral-800 rounded" />
              <div className="h-3 w-1/2 bg-neutral-800/70 rounded" />
              <div className="h-8 w-full bg-neutral-800 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
