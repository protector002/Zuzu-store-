import React from 'react';
import { ShieldCheck, Smartphone } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'store' | 'upload') => void;
  onOpenGuide: () => void;
  appsCount: number;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenGuide,
  appsCount,
}) => {
  return (
    <footer className="border-t border-neutral-900 bg-neutral-950 py-12 text-neutral-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-neutral-900">
          {/* Brand col with Logo */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/zuzustore-logo.png"
                alt="ZuzuStore"
                className="w-7 h-7 rounded-lg object-contain shadow-sm border border-cyan-400/40"
              />
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 text-sm tracking-tight">
                ZuzuStore
              </span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Direct Android APK distribution portal. Any user can download all applications freely with zero account requirements. Secure publisher backend for authorized administration.
            </p>
          </div>

          {/* Download & Links */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Navigation</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <a href="#catalog" className="hover:text-cyan-400 transition-colors">
                  Browse Catalog ({appsCount} {appsCount === 1 ? 'app' : 'apps'})
                </a>
              </li>
              <li>
                <button onClick={onOpenGuide} className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5">
                  <Smartphone className="w-3 h-3 text-cyan-400" />
                  <span>Android Installation Guide</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Admin & Publisher */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Publisher Console</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => onNavigate('upload')} className="hover:text-white transition-colors text-left">
                  Publisher Studio
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('upload')} className="hover:text-white transition-colors text-left">
                  Upload APK Package
                </button>
              </li>
              <li>
                <span className="text-neutral-500">Authorized Access Only</span>
              </li>
            </ul>
          </div>

          {/* Security & Verification */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Verification & Safety</h4>
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Malware Free & SHA-256 Verified</span>
              </div>
              <p className="text-neutral-400 leading-relaxed text-[10px]">
                Packages are cryptographically hashed and served directly with exact Android package-archive MIME type.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-400 text-[11px]">
          <p>© {new Date().getFullYear()} ZuzuStore. Direct Android application distribution.</p>
          <div className="flex items-center gap-4 text-neutral-300">
            <span>Direct APK Access</span>
            <span className="text-neutral-700">•</span>
            <span>No Account Needed to Download</span>
            <span className="text-neutral-700">•</span>
            <span>Zero Bloat</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
