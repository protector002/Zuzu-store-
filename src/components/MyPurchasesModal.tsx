import React, { useEffect, useState } from 'react';
import {
  Download,
  ExternalLink,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  AlertCircle
} from 'lucide-react';
import { BuyerReceipt } from '../types';
import { lookupBuyerPurchases } from '../services/api';
import { getLocalReceiptBookmarks, saveLocalReceiptBookmark } from '../utils/appLinks';

interface MyPurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReceipt: (receipt: BuyerReceipt) => void;
  onDownloadReceiptApk: (receipt: BuyerReceipt) => void;
}

export const MyPurchasesModal: React.FC<MyPurchasesModalProps> = ({
  isOpen,
  onClose,
  onOpenReceipt,
  onDownloadReceiptApk
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remoteReceipts, setRemoteReceipts] = useState<BuyerReceipt[] | null>(null);
  const [localReceipts, setLocalReceipts] = useState<BuyerReceipt[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalReceipts(getLocalReceiptBookmarks());
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = queryInput.trim();
    if (!q || q.length < 4) {
      setErrorMessage('Enter the email address used at checkout or your transaction reference.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await lookupBuyerPurchases(q);
      const found = res.receipts || [];
      setRemoteReceipts(found);
      found.forEach((r) => saveLocalReceiptBookmark(r));
      setLocalReceipts(getLocalReceiptBookmarks());
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to look up purchases right now.');
    } finally {
      setIsSearching(false);
    }
  };

  const displayedReceipts = remoteReceipts !== null ? remoteReceipts : localReceipts;
  const showingSearchResults = remoteReceipts !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="My Purchases and Official Receipts"
    >
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">My Purchases &amp; Official Receipts</h2>
              <p className="text-xs text-neutral-400 truncate">
                Recover confirmed APK downloads &amp; receipts anytime using your email or payment reference
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
            aria-label="Close My Purchases"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lookup Bar */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-950/50 space-y-3 shrink-0">
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Enter checkout email or reference (e.g. ZUZU...)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-400 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                {isSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Find Receipts</span>
              </button>

              {showingSearchResults && (
                <button
                  type="button"
                  onClick={() => {
                    setRemoteReceipts(null);
                    setQueryInput('');
                    setErrorMessage(null);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 cursor-pointer whitespace-nowrap"
                >
                  Saved Local
                </button>
              )}
            </div>
          </form>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Receipt List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-neutral-300">
              {showingSearchResults ? 'Verified Storefront Matches' : 'Saved Receipts on This Device'}
            </span>
            <span className="font-mono tabular-nums">
              {displayedReceipts.length} {displayedReceipts.length === 1 ? 'receipt' : 'receipts'}
            </span>
          </div>

          {displayedReceipts.length === 0 ? (
            <div className="p-8 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
              <Receipt className="w-7 h-7 text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-neutral-300">
                {showingSearchResults
                  ? 'No confirmed purchases matched that email or reference'
                  : 'No saved receipts on this browser yet'}
              </p>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Enter your checkout email address or LivePay reference above to retrieve any confirmed purchase and unlock its APK download.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedReceipts.map((r) => (
                <div
                  key={r.saleId}
                  className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={r.appIcon || '/zuzustore-logo.png'}
                      alt={r.appName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-contain bg-neutral-900 border border-neutral-800 p-1 shrink-0"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-sm font-bold text-white truncate">{r.appName}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400">
                        <span className="text-amber-400 font-mono tabular-nums font-semibold">
                          {r.grossAmount > 0
                            ? `${r.grossAmount.toLocaleString()} ${r.currency}`
                            : 'FREE'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{r.reference}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {new Date(r.completedAt || r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(r)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownloadReceiptApk(r)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download APK</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Security Note */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 text-[11px] text-neutral-400 flex items-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Only confirmed paid or free completed transactions appear here. Pending payments stay locked.</span>
        </div>
      </div>
    </div>
  );
};
