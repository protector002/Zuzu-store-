import React, { useState } from 'react';
import { X, Lock, ShieldCheck, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { adminLogin } from '../services/api';
import { AdminUser } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (admin: AdminUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await adminLogin(email.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        setIsLoading(false);
        setSuccess(false);
        onLoginSuccess(res.admin);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-neutral-100"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <img
            src="/zuzustore-logo.png"
            alt="ZuzuStore"
            className="w-11 h-11 rounded-xl object-contain shadow-md"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Publisher Login</h2>
            <p className="text-xs text-neutral-400">Enter your administrator credentials to publish</p>
          </div>
        </div>

        {/* Public Notice */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300 flex items-start gap-2.5 mb-5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="text-white font-medium">Public access notice:</span> Regular visitors can download all APKs freely without logging in. Sign in is only needed for the administrator to publish and manage APK packages.
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Authenticated successfully. Opening Publisher Portal...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter administrator email"
              autoComplete="username"
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Admin Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter administrator password"
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-3 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-cyan-950/40 active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Publisher Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
