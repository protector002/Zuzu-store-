import React from 'react';
import {
  Smartphone,
  ShieldCheck,
  Zap,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface CompanionStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadClient: () => void;
}

export const CompanionStoreModal: React.FC<CompanionStoreModalProps> = ({
  isOpen,
  onClose,
  onDownloadClient,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="companion-modal-title"
    >
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-neutral-100 overflow-hidden space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Neon background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Modal Top Bar */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center p-2.5 shadow-lg shadow-cyan-950/50 shrink-0">
              <Smartphone className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="companion-modal-title" className="text-lg font-bold text-white">
                  Zuzu Store Companion
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-bold uppercase tracking-wider">
                  Official APK
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Enable 100% automated background installs & uninstalls like Google Play
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Why this is needed explanation box */}
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Why Install the Companion App?</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Due to Android's web browser security sandbox, websites cannot silently install or delete files in the background. The <strong>Zuzu Store Companion App</strong> grants your phone the same OS-level package installer privileges as Google Play Store and Samsung Store.
          </p>
        </div>

        {/* Feature Matrix Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-800/50 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Zero-Tap Installs</h4>
            <p className="text-[11px] text-neutral-400 leading-normal">
              Direct background installation without opening file managers or prompts.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-rose-950 border border-rose-800/50 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">1-Click Uninstall</h4>
            <p className="text-[11px] text-neutral-400 leading-normal">
              Manage installed apps and cleanly remove packages with one tap.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Automatic Updates</h4>
            <p className="text-[11px] text-neutral-400 leading-normal">
              Notifies you and updates apps silently whenever publishers release new versions.
            </p>
          </div>
        </div>

        {/* 3 Step Setup Guidance */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simple 20-Second Setup</span>
          </h4>
          <ol className="text-xs text-neutral-300 space-y-2 list-decimal list-inside leading-relaxed bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800">
            <li>Download and install <strong>ZuzuStoreClient.apk</strong> (4.2 MB).</li>
            <li>When prompted, toggle ON <strong>"Allow from this source"</strong> (standard Android permission).</li>
            <li>Return to this website—all future downloads install and update automatically!</li>
          </ol>
        </div>

        {/* Bottom Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
          <div className="text-[11px] text-neutral-400 font-mono">
            Size: 4.2 MB • v2.4.0 • Android 8.0+
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
            >
              Maybe Later
            </button>

            <button
              onClick={() => {
                onDownloadClient();
                onClose();
              }}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 rounded-xl shadow-lg shadow-red-950/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Zuzu Client APK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
