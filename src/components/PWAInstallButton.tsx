import React from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {
    canInstall,
    isInstalled,
    showIOSInstructions,
    promptInstall,
    dismissIOSInstructions
  } = usePWAInstall();

  if (isInstalled || !canInstall) return null;

  return (
    <>
      <button
        type="button"
        onClick={promptInstall}
        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 hover:text-amber-200 font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        title="Install ZuzuStore Web App for instant access & offline browsing"
        aria-label="Install ZuzuStore App"
      >
        <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="hidden lg:inline">Install App</span>
        <span className="lg:hidden">App</span>
      </button>

      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-2xl text-neutral-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Install ZuzuStore</h3>
                  <p className="text-[11px] text-neutral-400">Add to your iPhone / iPad home screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissIOSInstructions}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-2.5 text-xs text-neutral-300 bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-black text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="flex items-center gap-1 flex-wrap">
                  Tap <Share className="w-3.5 h-3.5 text-amber-400 inline mx-0.5" /> <strong>Share</strong> in Safari toolbar
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-black text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1 flex-wrap">
                  Choose <PlusSquare className="w-3.5 h-3.5 text-amber-400 inline mx-0.5" /> <strong>Add to Home Screen</strong>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-black text-[10px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span>Tap <strong>Add</strong> for instant one-tap launch</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={dismissIOSInstructions}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
