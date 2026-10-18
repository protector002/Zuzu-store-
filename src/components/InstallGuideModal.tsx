import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Smartphone, Laptop } from 'lucide-react';
import { Platform } from '../types';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlatform?: Platform;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  defaultPlatform = 'Android',
}) => {
  const [activeTab, setActiveTab] = useState<Platform>(defaultPlatform);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-2xl text-neutral-100 max-h-[90vh] overflow-y-auto"
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

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700/60 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">APK Installation Guide</h3>
            <p className="text-xs text-neutral-400">Step-by-step instructions to install APKs on your phone or computer</p>
          </div>
        </div>

        {/* Platform Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-xl mb-6">
          {(['Android', 'Windows'] as Platform[]).map((plat) => (
            <button
              key={plat}
              onClick={() => setActiveTab(plat)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === plat
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {plat === 'Android' ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
              <span>{plat === 'Android' ? 'Android (.apk)' : 'Windows (.exe)'}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Android' && (
          <div className="space-y-4 text-sm text-neutral-300">
            <div className="p-3.5 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-xs text-cyan-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                All APK packages from Zuzu Store are direct, untouched binaries with verified SHA-256 signatures. No Google account or registration is required to download.
              </span>
            </div>

            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-400 text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-white">Download the .APK file</p>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Tap the &quot;Download APK&quot; button on any app card. Your browser will immediately download the installation file.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-400 text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-white">Open the downloaded file</p>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Swipe down your notification bar and tap the completed download, or open your phone&apos;s &quot;Files&quot; / &quot;Downloads&quot; app and tap the file.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-400 text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-white">Allow unknown apps (if prompted)</p>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    If Android prompts &quot;For your security, your phone is not allowed to install unknown apps from this source&quot;, tap <strong className="text-neutral-200">Settings</strong> and turn ON <strong className="text-neutral-200">&quot;Allow from this source&quot;</strong>.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-400 text-xs font-bold shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <p className="font-semibold text-white">Confirm Installation</p>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Tap <strong className="text-neutral-200">&quot;Install&quot;</strong>. In just a few seconds, the application will appear on your home screen and app drawer ready to launch!
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {activeTab === 'Windows' && (
          <div className="space-y-4 text-sm text-neutral-300">
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 text-cyan-400 text-xs font-bold shrink-0">
                  1
                </span>
                <div>
                  <p className="font-semibold text-white">Download the setup file</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Click &quot;Download Windows Package&quot; and save the installer to your PC.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 text-cyan-400 text-xs font-bold shrink-0">
                  2
                </span>
                <div>
                  <p className="font-semibold text-white">Launch the executable</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Double-click the installer file. If Windows SmartScreen appears, click <strong className="text-neutral-200">&quot;More info&quot;</strong> and select <strong className="text-neutral-200">&quot;Run anyway&quot;</strong>.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 text-cyan-400 text-xs font-bold shrink-0">
                  3
                </span>
                <div>
                  <p className="font-semibold text-white">Complete installation</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Follow the on-screen instructions to finish setup and launch the app.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-neutral-900 bg-white hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
