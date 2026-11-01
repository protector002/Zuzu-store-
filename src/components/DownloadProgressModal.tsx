import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  FolderDown,
  Trash2,
  Zap,
  Sparkles
} from 'lucide-react';
import { DownloadProgressState } from '../types';
import {
  triggerAndroidInstall,
  triggerAndroidUninstall,
  recordAppInstalled,
  isAndroidDevice
} from '../utils/androidBridge';

interface DownloadProgressModalProps {
  progress: DownloadProgressState;
  onClose: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onSaveAgain?: () => void;
  onOpenCompanionModal?: () => void;
  onTriggerUninstall?: (packageId: string) => void;
}

export const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  progress,
  onClose,
  onCancel,
  onRetry,
  onSaveAgain,
  onOpenCompanionModal,
  onTriggerUninstall,
}) => {
  const [uninstallNotice, setUninstallNotice] = useState<string | null>(null);

  if (!progress.isOpen) return null;

  const isCompleted = progress.status === 'completed';
  const isError = progress.status === 'error';
  const isConnecting = progress.status === 'connecting';
  const isVerifying = progress.status === 'verifying';
  const isDownloading = progress.status === 'downloading';

  const handleLaunchInstall = () => {
    if (progress.blobUrl) {
      triggerAndroidInstall(progress.blobUrl, progress.fileName);
      if (progress.packageId) {
        recordAppInstalled(progress.packageId, progress.appName, progress.version, progress.fileName);
      }
    } else if (onSaveAgain) {
      onSaveAgain();
    }
  };

  const handleUninstall = () => {
    if (!progress.packageId) return;
    const res = triggerAndroidUninstall(progress.packageId, progress.appName);
    setUninstallNotice(res.message);
    if (onTriggerUninstall) {
      onTriggerUninstall(progress.packageId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
    >
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-neutral-100 overflow-hidden space-y-6">
        {/* Glow effect matching brand colors */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Modal Top Bar */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={progress.appIcon || '/zuzustore-logo.png'}
                alt={progress.appName}
                className="w-12 h-12 rounded-xl object-contain border border-neutral-800 shadow-md bg-neutral-950 p-1"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/zuzustore-logo.png';
                }}
              />
              {isCompleted && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center shadow">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 id="download-modal-title" className="text-base sm:text-lg font-bold text-white truncate">
                  {progress.appName}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-semibold shrink-0">
                  v{progress.version}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono truncate mt-0.5">
                {progress.fileName} {progress.fileSize ? `• ${progress.fileSize}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={isCompleted || isError ? onClose : onCancel || onClose}
            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors shrink-0 cursor-pointer"
            title={isCompleted ? 'Close' : 'Cancel download'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress & Visual Indicator Zone */}
        <div className="space-y-4">
          {/* Header Status & Percentage */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {isConnecting && (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Connecting to download server...
                </span>
              )}
              {isDownloading && (
                <span className="text-amber-300 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-amber-400 animate-bounce" />
                  Downloading APK directly...
                </span>
              )}
              {isVerifying && (
                <span className="text-red-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-red-400 animate-pulse" />
                  Finalizing package &amp; preparing installer...
                </span>
              )}
              {isCompleted && (
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Download Complete • Ready to Install
                </span>
              )}
              {isError && (
                <span className="text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Download Interrupted
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white tabular-nums">
                {progress.percent}%
              </span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden p-0.5 border border-neutral-800 relative">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : isError
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-red-600 animate-pulse'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, progress.percent))}%` }}
            />
          </div>

          {/* Live Download Statistics Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-500 block uppercase font-medium">Downloaded</span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {progress.downloadedMbFormatted}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-500 block uppercase font-medium">Remaining</span>
              <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums">
                {isCompleted ? '0 MB' : progress.remainingMbFormatted}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-500 block uppercase font-medium">Speed</span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {isCompleted ? 'Finished' : progress.speedFormatted}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-500 block uppercase font-medium">Time Left</span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {isCompleted ? '0s' : progress.timeRemainingFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Success Guidance & 1-Tap OS Actions */}
        {isCompleted && (
          <div className="space-y-3 animate-fade-in">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Immediate Android System Handshake</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/60 text-emerald-200">
                  Ready
                </span>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                Tap <strong>"Launch Installer"</strong> below to open Android's native system prompt directly on your phone.
              </p>

              {/* 1-Tap Action Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleLaunchInstall}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Launch Installer Now</span>
                </button>

                {progress.packageId && (
                  <button
                    onClick={handleUninstall}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Trigger Android system uninstaller dialog"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Uninstall App</span>
                  </button>
                )}
              </div>
            </div>

            {/* Uninstall notice display */}
            {uninstallNotice && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs text-amber-200 flex items-center gap-2 animate-fade-in">
                <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{uninstallNotice}</span>
              </div>
            )}

            {/* Companion Promo Strip */}
            {onOpenCompanionModal && (
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-300 min-w-0">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">Want fully automatic installs with zero taps?</span>
                </div>
                <button
                  onClick={onOpenCompanionModal}
                  className="text-cyan-400 hover:text-cyan-300 font-bold shrink-0 underline text-[11px] cursor-pointer"
                >
                  Get Zuzu Client
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Details Screen */}
        {isError && (
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/50 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Download Notice</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {progress.errorMessage || 'The download stream encountered an interruption. Please try again.'}
            </p>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Download</span>
            </button>
          )}

          {isCompleted && onSaveAgain && (
            <button
              onClick={onSaveAgain}
              className="px-4 py-2.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Save another copy to downloads folder"
            >
              <FolderDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save Again</span>
            </button>
          )}

          <button
            onClick={isCompleted || isError ? onClose : onCancel || onClose}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              isCompleted
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            {isCompleted ? 'Done' : isError ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

