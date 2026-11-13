import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  CreditCard,
  Code2,
  Building2,
  CheckCircle2,
  X,
  Lock
} from 'lucide-react';

export type LegalTab = 'rights' | 'user-payment' | 'developer-payment';

export const AGREEMENTS_VERSION = '2026-11-v1';
export const AGREEMENTS_STORAGE_KEY = 'protector_tech_agreements_accepted_v1';

interface LegalAgreementsModalProps {
  isOpen: boolean;
  requireAcceptance?: boolean;
  initialTab?: LegalTab;
  onAccept?: () => void;
  onClose?: () => void;
}

export const LegalAgreementsModal: React.FC<LegalAgreementsModalProps> = ({
  isOpen,
  requireAcceptance = false,
  initialTab = 'rights',
  onAccept,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsChecked(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (requireAcceptance && !isChecked) return;
    if (onAccept) {
      onAccept();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="protector-legal-title"
    >
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl text-neutral-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-neutral-800 flex items-start justify-between gap-4 bg-neutral-950/60 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="protector-legal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                Protector Technologies — Terms, Conditions &amp; Payment Agreements
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                All rights reserved to Protector Technologies · Effective Version {AGREEMENTS_VERSION}
              </p>
            </div>
          </div>

          {!requireAcceptance && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close legal agreements"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Section Tabs */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-neutral-800 bg-neutral-950/30 flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('rights')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'rights'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Company Rights &amp; Terms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('user-payment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'user-payment'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>User Payment Agreement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('developer-payment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'developer-payment'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Developer Payment Agreement</span>
          </button>
        </div>

        {/* Scrollable Legal Text Body */}
        <div className="px-5 py-5 sm:px-6 overflow-y-auto space-y-5 text-xs sm:text-[13px] text-neutral-300 leading-relaxed flex-1">
          {activeTab === 'rights' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Exclusive Ownership &amp; Intellectual Property Rights</span>
                </div>
                <p className="text-neutral-300 text-xs leading-relaxed">
                  This website, marketplace platform (ZuzuStore), source code, visual assets, trademarks,
                  payment routing infrastructure, and distribution systems are wholly owned and operated by{' '}
                  <strong className="text-white">Protector Technologies</strong>. All rights, title, and
                  intellectual property in and to this website remain the exclusive property of{' '}
                  <strong className="text-white">Protector Technologies</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">1. Acceptance of Website Terms &amp; Conditions</h3>
                <p>
                  By accessing, browsing, downloading applications, purchasing paid software, or registering
                  as a developer on this website, you agree to be bound by these Terms &amp; Conditions and
                  applicable Payment Agreements of <strong className="text-white">Protector Technologies</strong>.
                  If you do not agree, you must discontinue use of the website immediately.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">2. Permitted Use &amp; Platform Security</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-neutral-300">
                  <li>
                    Users may browse and download authorized Android &amp; Smart TV APK packages solely for
                    lawful personal or business device installation.
                  </li>
                  <li>
                    Automated scraping, reverse-engineering, tampering with payment verification tokens,
                    distributing malware, or reselling paid packages without authorization is strictly prohibited.
                  </li>
                  <li>
                    Protector Technologies reserves the right to remove, suspend, or take down any listing,
                    developer account, or access token that violates platform safety or copyright laws.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">3. Limitation of Liability</h3>
                <p>
                  Third-party developer applications are published by their respective developers. Protector
                  Technologies conducts security review and hash verification but is not liable for indirect
                  or consequential damages arising from third-party application usage beyond the purchase price
                  paid for a defective or undelivered paid package.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'user-payment' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>User Payment &amp; Digital Purchase Agreement</span>
                </div>
                <p className="text-neutral-300 text-xs leading-relaxed">
                  Applies to all end-users purchasing paid Android or Smart TV applications on this
                  Protector Technologies website.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">1. Authorized Payment Methods &amp; Pricing</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    All paid application purchases are processed directly on the website through{' '}
                    <strong className="text-white">LivePay Uganda Mobile Money</strong> (MTN Mobile Money
                    and Airtel Money) or explicitly enabled platform checkout methods.
                  </li>
                  <li>
                    The full price in UGX (or stated currency) is displayed clearly prior to checkout.
                    Standard Mobile Money network operator charges may apply according to your carrier.
                  </li>
                  <li>
                    Never send manual off-platform payments outside the official website checkout prompt.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">2. Instant Digital Unlock &amp; Licensing</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Upon entering your Mobile Money PIN and payment confirmation, your transaction receipt
                    and direct APK download token unlock immediately in-browser.
                  </li>
                  <li>
                    Paid APK purchases grant a personal, non-exclusive, non-transferable license to install
                    and run the application and future developer updates for that listing.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">3. Refunds, Failed Delivery &amp; Disputes</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Because digital APK software is unlocked immediately upon payment confirmation, completed
                    purchases are generally final and non-refundable once the APK download is unlocked.
                  </li>
                  <li>
                    If payment is deducted without unlocking the APK, or if an application is proven to be
                    undelivered, broken, or malicious, contact Protector Technologies support with your
                    Transaction ID and LivePay reference for verification and resolution.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'developer-payment' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  <Code2 className="w-4 h-4 shrink-0" />
                  <span>Developer Payment, Revenue Split, Transfer &amp; Withdrawal Agreement</span>
                </div>
                <p className="text-neutral-300 text-xs leading-relaxed">
                  Binding financial agreement between registered Developers and{' '}
                  <strong className="text-white">Protector Technologies</strong> governing app sales,
                  app ownership transfers, wallet balances, and payouts.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">1. Paid App Sales Revenue Share (94% / 6%)</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    For every completed user purchase of a paid application, the owning Developer receives{' '}
                    <strong className="text-emerald-400">94%</strong> net earnings credited directly to
                    their Developer Wallet.
                  </li>
                  <li>
                    <strong className="text-white">Protector Technologies</strong> retains a{' '}
                    <strong className="text-amber-400">6% platform commission</strong> covering Mobile Money
                    gateway integration, APK hosting, security verification, and platform administration.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">2. App Ownership Sales &amp; Transfers (90% / 10%)</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Developers may sell and transfer full ownership rights of an approved application to
                    another registered developer directly through the website. All transfer payments must
                    occur inside the website (via LivePay Mobile Money or Developer Wallet balance).
                  </li>
                  <li>
                    Upon successful payment: <strong className="text-emerald-400">90%</strong> of the
                    transfer price is credited to the selling developer&apos;s wallet,{' '}
                    <strong className="text-amber-400">10%</strong> commission is paid to{' '}
                    <strong className="text-white">Protector Technologies</strong>, and full ownership,
                    release management, pricing control, and future revenue rights transfer immediately to
                    the buying developer.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">3. Withdrawals &amp; Transfer Charges</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    Minimum developer wallet withdrawal request is <strong className="text-white">1,000 UGX</strong>.
                  </li>
                  <li>
                    Standard withdrawal sending charges of{' '}
                    <strong className="text-amber-400">100 UGX per 1,000 UGX</strong> apply to all payouts
                    disbursed via LivePay Mobile Money (MTN / Airtel).
                  </li>
                  <li>
                    Protector Technologies may pause, audit, or withhold payouts if an app or transaction is
                    flagged for malware, unauthorized intellectual property, fraud, or user disputes.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Acceptance Controls */}
        <form
          onSubmit={handleConfirm}
          className="px-5 py-4 sm:px-6 border-t border-neutral-800 bg-neutral-950/80 space-y-3 shrink-0"
        >
          {requireAcceptance ? (
            <>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-amber-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-neutral-300 leading-relaxed">
                  I acknowledge that all rights to this website belong to{' '}
                  <strong className="text-white">Protector Technologies</strong>, and I have read and
                  agree to the <strong className="text-white">Terms &amp; Conditions</strong>,{' '}
                  <strong className="text-white">User Payment Agreement</strong>, and{' '}
                  <strong className="text-white">Developer Payment Agreement</strong>.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Agreement is required before using this website.</span>
                </div>

                <button
                  type="submit"
                  disabled={!isChecked}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept &amp; Enter Website</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-400">
                © {new Date().getFullYear()} Protector Technologies. All rights reserved.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
