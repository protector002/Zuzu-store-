import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Printer,
  Receipt,
  ShieldCheck,
  Smartphone,
  Tv,
  AlertCircle
} from 'lucide-react';
import { BuyerReceipt, StoreApp } from '../types';
import { fetchBuyerReceipt } from '../services/api';
import { getReceiptShareUrl, saveLocalReceiptBookmark } from '../utils/appLinks';

interface ReceiptPageProps {
  saleId: string;
  token: string;
  apps: StoreApp[];
  onBackToStore: () => void;
  onOpenAppDetail: (app: StoreApp) => void;
  onTriggerApkDownload: (receipt: BuyerReceipt) => void;
  onOpenMyPurchases: () => void;
}

export const ReceiptPage: React.FC<ReceiptPageProps> = ({
  saleId,
  token,
  apps,
  onBackToStore,
  onOpenAppDetail,
  onTriggerApkDownload,
  onOpenMyPurchases
}) => {
  const [receipt, setReceipt] = useState<BuyerReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    if (!saleId || !token) {
      setLoading(false);
      setErrorMessage('Receipt verification token is missing. Look up your purchase in My Purchases.');
      return;
    }

    fetchBuyerReceipt(saleId, token)
      .then((verified) => {
        if (!active) return;
        setReceipt(verified);
        saveLocalReceiptBookmark(verified);
      })
      .catch((err: any) => {
        if (!active) return;
        setErrorMessage(err.message || 'Unable to verify this payment receipt.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [saleId, token]);

  const handleCopyReceiptLink = async () => {
    if (!receipt) return;
    const shareUrl = getReceiptShareUrl(receipt.saleId, receipt.downloadToken);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (_) {}
  };

  const handleOpenAppPage = () => {
    if (!receipt) return;
    const matched = apps.find((a) => a.id === receipt.appId || a.slug === receipt.appId);
    if (matched) {
      onOpenAppDetail(matched);
    } else if (receipt.appUrl) {
      window.location.href = receipt.appUrl;
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-neutral-300">Verifying official receipt...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !receipt) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to ZuzuStore</span>
        </button>

        <div className="bg-neutral-900 border border-rose-800/60 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-white">Receipt Unavailable</h1>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {errorMessage || 'Payment confirmation could not be verified for this receipt link.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenMyPurchases}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Find Purchase by Email or Ref
            </button>
            <button
              type="button"
              onClick={onBackToStore}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Return to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to ZuzuStore</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyReceiptLink}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedLink ? 'Receipt Link Copied' : 'Copy Receipt Link'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-400" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Main Receipt Document Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Receipt Banner */}
        <div className="p-6 border-b border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Payment Confirmed · Official Digital Receipt</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Protector Technologies
            </h1>
            <p className="text-xs text-neutral-400">
              ZuzuStore Direct Android &amp; Smart TV Distribution
            </p>
          </div>

          <div className="sm:text-right">
            <div className="text-[11px] text-neutral-400">Amount Paid</div>
            <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
              {receipt.grossAmount > 0
                ? `${receipt.grossAmount.toLocaleString()} ${receipt.currency}`
                : 'FREE'}
            </div>
          </div>
        </div>

        {/* App Summary */}
        <div className="p-6 border-b border-neutral-800 flex items-center gap-4 bg-neutral-950/40">
          <img
            src={receipt.appIcon || '/zuzustore-logo.png'}
            alt={receipt.appName}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-xl object-contain bg-neutral-950 border border-neutral-800 p-1 shrink-0"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/zuzustore-logo.png';
            }}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base font-bold text-white truncate">{receipt.appName}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="inline-flex items-center gap-1">
                {receipt.edition === 'tv' ? (
                  <Tv className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{receipt.edition === 'tv' ? 'Smart TV Edition' : 'Android Phone Edition'}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">v{receipt.appVersion || '1.0.0'}</span>
            </div>
          </div>
        </div>

        {/* Structured Details */}
        <div className="p-6 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-4 py-1.5 border-b border-neutral-800/70">
            <span className="text-neutral-400">Receipt Reference</span>
            <span className="font-mono tabular-nums text-white font-semibold">{receipt.reference}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1.5 border-b border-neutral-800/70">
            <span className="text-neutral-400">Transaction ID</span>
            <span className="font-mono tabular-nums text-neutral-300">{receipt.saleId}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1.5 border-b border-neutral-800/70">
            <span className="text-neutral-400">Buyer Name</span>
            <span className="text-white font-medium">{receipt.customerName}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1.5 border-b border-neutral-800/70">
            <span className="text-neutral-400">Buyer Email</span>
            <span className="text-neutral-200 font-mono">{receipt.customerEmail}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1.5 border-b border-neutral-800/70">
            <span className="text-neutral-400">Payment Method</span>
            <span className="text-neutral-200">{receipt.paymentMethod}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1.5">
            <span className="text-neutral-400">Confirmed Timestamp</span>
            <span className="text-neutral-300 font-mono tabular-nums">
              {new Date(receipt.completedAt || receipt.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Download & Storefront CTAs */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-950/60 space-y-3 print:hidden">
          <button
            type="button"
            onClick={() => onTriggerApkDownload(receipt)}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-lg shadow-amber-950/30"
          >
            <Download className="w-4 h-4" />
            <span>Download Verified APK Now</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleOpenAppPage}
              className="py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Open App Page</span>
            </button>

            <button
              type="button"
              onClick={onOpenMyPurchases}
              className="py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>All My Purchases</span>
            </button>
          </div>
        </div>

        {/* Footer Legal Note */}
        <div className="px-6 py-4 border-t border-neutral-800/80 bg-neutral-950 flex items-center gap-2 text-[11px] text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Save or bookmark this receipt URL anytime to re-download your verified APK package without third-party email links.
          </span>
        </div>
      </div>
    </div>
  );
};
