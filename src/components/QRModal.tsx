import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, Check, Copy } from 'lucide-react';
import { StoreApp, AppRelease } from '../types';
import { getDownloadUrl } from '../services/api';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: StoreApp;
  release?: AppRelease;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, app, release }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const activeRelease = release || app.releases[0];
  const downloadPath = getDownloadUrl(app.id, activeRelease?.id);
  const fullDownloadUrl = typeof window !== 'undefined' ? `${window.location.origin}${downloadPath}` : downloadPath;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(fullDownloadUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen, fullDownloadUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullDownloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100"
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

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700/60">
            <Smartphone className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Scan to Download on Phone</h3>
            <p className="text-xs text-neutral-400">Point your phone camera to download {app.name} APK</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-5 bg-white rounded-xl my-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code to download ${app.name} APK`}
              className="w-56 h-56 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-neutral-500 text-xs">
              Generating secure QR...
            </div>
          )}
          <span className="text-[11px] font-semibold text-neutral-800 mt-2">
            Direct Android APK Download Link
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Version: v{activeRelease?.version || app.currentVersion}</span>
            <span>Size: {activeRelease?.fileSize || '34 MB'}</span>
          </div>

          <div className="flex items-center gap-2 p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
            <input
              type="text"
              readOnly
              value={fullDownloadUrl}
              className="bg-transparent text-neutral-300 flex-1 outline-none truncate font-mono text-[11px]"
            />
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 text-center mt-4">
          No sign up or account required. Opens straight to the file download stream on any mobile browser.
        </p>
      </div>
    </div>
  );
};
