import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Download,
  Smartphone,
  AlertCircle,
  Sparkles,
  Receipt,
  Clock,
  RefreshCw,
  Lock
} from 'lucide-react';
import { StoreApp, AppSaleTransaction } from '../types';
import {
  purchaseApp,
  checkAppPurchaseStatus,
  acceptPlatformAgreements
} from '../services/api';
import { AGREEMENTS_VERSION, LegalTab } from './LegalAgreementsModal';

interface PurchaseModalProps {
  app: StoreApp;
  onClose: () => void;
  onSuccess: (transaction: AppSaleTransaction, downloadToken: string) => void;
  onOpenLegal?: (tab: LegalTab) => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ app, onClose, onSuccess, onOpenLegal }) => {
  const priceConfig = app.pricing || { type: 'paid', price: 5000, currency: 'UGX' };
  const currency = priceConfig.currency || 'UGX';
  const price = priceConfig.price || 0;

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreedToPaymentTerms, setAgreedToPaymentTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingSale, setPendingSale] = useState<AppSaleTransaction | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [completedTransaction, setCompletedTransaction] = useState<AppSaleTransaction | null>(null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const hasTriggeredSuccessRef = useRef(false);

  const handleConfirmedSuccess = (tx: AppSaleTransaction, token: string) => {
    if (hasTriggeredSuccessRef.current) return;
    hasTriggeredSuccessRef.current = true;
    setPendingSale(null);
    setCompletedTransaction(tx);
    setDownloadToken(token);
    onSuccess(tx, token);
  };

  // Poll payment confirmation status while awaiting Mobile Money PIN entry
  useEffect(() => {
    if (!pendingSale || completedTransaction) return;

    let cancelled = false;

    const timerInterval = setInterval(() => {
      if (!cancelled) {
        setWaitSeconds((prev) => prev + 1);
      }
    }, 1000);

    const checkStatus = async () => {
      try {
        const res = await checkAppPurchaseStatus(app.id, pendingSale.id);
        if (cancelled) return;

        if (res.paymentConfirmed && res.status === 'completed' && res.transaction && res.downloadToken) {
          handleConfirmedSuccess(res.transaction, res.downloadToken);
        } else if (res.status === 'failed') {
          setPendingSale(null);
          setErrorMessage(
            res.message || 'Mobile Money payment failed or was cancelled. Download has not started.'
          );
        }
      } catch (_) {
        // Keep waiting on transient network error
      }
    };

    const pollInterval = setInterval(checkStatus, 3000);

    return () => {
      cancelled = true;
      clearInterval(timerInterval);
      clearInterval(pollInterval);
    };
  }, [pendingSale?.id, app.id, completedTransaction]);

  const handleManualStatusCheck = async () => {
    if (!pendingSale || isCheckingStatus) return;
    setIsCheckingStatus(true);
    setErrorMessage(null);
    try {
      const res = await checkAppPurchaseStatus(app.id, pendingSale.id);
      if (res.paymentConfirmed && res.status === 'completed' && res.transaction && res.downloadToken) {
        handleConfirmedSuccess(res.transaction, res.downloadToken);
      } else if (res.status === 'failed') {
        setPendingSale(null);
        setErrorMessage(
          res.message || 'Mobile Money payment was declined or failed. Download cannot start.'
        );
      } else {
        setErrorMessage(
          'Payment is still waiting for your Mobile Money PIN confirmation on your handset.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to verify payment status right now.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCancelPending = () => {
    setPendingSale(null);
    setWaitSeconds(0);
    setErrorMessage('Payment was cancelled before confirmation. Download was not started.');
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMessage('Please provide your name and email address for receipt and download access.');
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMessage('Please provide your Mobile Money phone number.');
      return;
    }

    if (!agreedToPaymentTerms) {
      setErrorMessage('Please agree to Protector Technologies User Payment Agreement before paying.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setWaitSeconds(0);

    try {
      acceptPlatformAgreements({
        role: 'buyer',
        version: AGREEMENTS_VERSION,
        email: customerEmail.trim()
      });

      const paymentMethodLabel =
        paymentMethod === 'mtn'
          ? `LivePay MTN Mobile Money (${phoneNumber})`
          : `LivePay Airtel Money (${phoneNumber})`;

      const res = await purchaseApp(app.id, {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        paymentMethod: paymentMethodLabel,
        phoneNumber: phoneNumber.trim(),
        currency
      });

      // ONLY unlock and start download when payment is genuinely confirmed completed!
      if (res.paymentConfirmed && res.status === 'completed' && res.downloadToken) {
        handleConfirmedSuccess(res.transaction, res.downloadToken);
      } else {
        // Payment prompt was sent — wait for user PIN confirmation BEFORE any download starts
        setPendingSale(res.transaction);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed. Download was not started.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-neutral-100 space-y-6 relative max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3.5">
            <img
              src={app.iconUrl || '/zuzustore-logo.png'}
              alt={app.name}
              className="w-12 h-12 rounded-2xl object-contain border border-neutral-800 bg-neutral-950 p-1 shrink-0"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/zuzustore-logo.png';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {completedTransaction
                    ? 'Payment Confirmed'
                    : pendingSale
                    ? 'Confirm Mobile Money PIN'
                    : `Buy ${app.name}`}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-neutral-950 rounded-full shadow">
                  Premium APK
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Developer: {app.submittedBy?.name || app.developer?.name || 'Publisher'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STATE 1: Payment Confirmed & Download Unlocked */}
        {completedTransaction && downloadToken ? (
          <div className="space-y-5 animate-fade-in">
            <div className="p-5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Payment Successful!</h4>
              <p className="text-xs text-emerald-200/90 leading-relaxed max-w-sm mx-auto">
                Thank you, <strong>{completedTransaction.customerName}</strong>! Your payment for{' '}
                <strong>{app.name}</strong> is confirmed and APK download has started.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>Transaction ID</span>
                </span>
                <span className="font-mono text-neutral-200">{completedTransaction.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Total Amount Paid</span>
                <span className="font-bold text-white text-sm">
                  {completedTransaction.grossAmount.toLocaleString()} {completedTransaction.currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>Payment Method</span>
                <span className="text-neutral-300">{completedTransaction.paymentMethod}</span>
              </div>
              {completedTransaction.livepayReference && (
                <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                  <span>LivePay Ref</span>
                  <span className="font-mono text-amber-400 font-bold">{completedTransaction.livepayReference}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>Date &amp; Time</span>
                <span className="text-neutral-300">
                  {new Date(completedTransaction.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={`/api/apps/${app.id}/download?token=${downloadToken}`}
                download
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download {app.name} APK Now</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : pendingSale ? (
          /* STATE 2: Waiting for LivePay PIN Confirmation (Download Strictly Locked!) */
          <div className="space-y-5 animate-fade-in">
            <div className="p-5 bg-amber-950/35 border border-amber-500/40 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-base font-bold text-white">Waiting for Payment Confirmation</h4>
              <p className="text-xs text-amber-100/90 leading-relaxed max-w-sm mx-auto">
                A LivePay Mobile Money prompt for{' '}
                <strong>
                  {pendingSale.grossAmount.toLocaleString()} {pendingSale.currency}
                </strong>{' '}
                has been sent to{' '}
                <strong className="font-mono text-amber-300">{pendingSale.phoneNumber || phoneNumber}</strong>.
              </p>
              <p className="text-[11px] text-neutral-300 leading-relaxed max-w-sm mx-auto">
                Please enter your Mobile Money PIN on your phone to approve the payment. Your APK download is{' '}
                <strong className="text-amber-300">locked</strong> and will start automatically once payment is confirmed.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Status</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                  Locked Until Paid ({waitSeconds}s)
                </span>
              </div>
              {pendingSale.livepayReference && (
                <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                  <span>LivePay Reference</span>
                  <span className="font-mono text-neutral-200">{pendingSale.livepayReference}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>Transaction ID</span>
                <span className="font-mono text-neutral-300">{pendingSale.id}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleManualStatusCheck}
                disabled={isCheckingStatus}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                <span>{isCheckingStatus ? 'Checking LivePay...' : "I've Entered My PIN — Check Status"}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelPending}
                className="w-full sm:w-auto py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* STATE 3: Payment Form */
          <form onSubmit={handlePay} className="space-y-5">
            {/* Price Box */}
            <div className="p-4 bg-gradient-to-r from-amber-950/40 via-neutral-950 to-neutral-950 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Application Price
                </span>
                <div className="text-2xl font-black text-amber-300 mt-0.5">
                  {price.toLocaleString()} <span className="text-base text-amber-400/80">{currency}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pay First to Unlock</span>
                </span>
                <p className="text-[10px] text-neutral-500 mt-1">One-time payment • Lifetime updates</p>
              </div>
            </div>

            {/* Buyer Contact Information */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-neutral-300">Buyer Information</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl py-2.5 px-3 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl py-2.5 px-3 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-neutral-300">Select Mobile Money Network</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mtn')}
                  className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    paymentMethod === 'mtn'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold shadow-md ring-1 ring-amber-500/50'
                      : 'bg-neutral-950 hover:bg-neutral-800/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold">MTN Mobile Money</span>
                  <span className="text-[10px] text-amber-400/80 font-mono">Instant LivePay Prompt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('airtel')}
                  className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    paymentMethod === 'airtel'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold shadow-md ring-1 ring-rose-500/50'
                      : 'bg-neutral-950 hover:bg-neutral-800/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-rose-400" />
                  <span className="text-xs font-bold">Airtel Money</span>
                  <span className="text-[10px] text-rose-400/80 font-mono">Instant LivePay Prompt</span>
                </button>
              </div>

              <div className="pt-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-semibold text-neutral-300">
                    {paymentMethod === 'mtn' ? 'MTN' : 'Airtel'} Phone Number
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    LivePay: LP260805074398
                  </span>
                </div>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0772 123 456"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 outline-none font-mono"
                />
                <p className="text-[10px] text-amber-300/80 leading-tight">
                  LivePay will push a Mobile Money prompt to your handset. Download begins only after you enter your PIN and payment is confirmed.
                </p>
              </div>
            </div>

            {/* Platform Guarantee & LivePay Mobile Money Notice */}
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 text-[11px] text-neutral-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Processed securely by <strong>Protector Technologies</strong> via <strong>LivePay Uganda Mobile Money</strong> (Account: LP260805074398). APK download remains locked until payment confirmation succeeds.
              </span>
            </div>

            {/* Required User Payment Agreement Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToPaymentTerms}
                onChange={(e) => setAgreedToPaymentTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-amber-500 cursor-pointer shrink-0"
              />
              <span className="text-[11px] text-neutral-300 leading-relaxed">
                I agree to{' '}
                {onOpenLegal ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenLegal('user-payment');
                    }}
                    className="text-amber-400 font-semibold hover:underline cursor-pointer"
                  >
                    Protector Technologies&apos; User Payment Agreement &amp; Terms
                  </button>
                ) : (
                  <strong className="text-white">Protector Technologies&apos; User Payment Agreement &amp; Terms</strong>
                )}{' '}
                (instant digital APK unlock upon PIN confirmation; purchases are final once unlocked).
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isProcessing || !agreedToPaymentTerms}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    <span>Sending Prompt...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay {price.toLocaleString()} {currency} via LivePay</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
