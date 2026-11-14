import React from 'react';
import { ShieldCheck, Smartphone, Lock, UploadCloud, Layers, Tv, Code2, Receipt } from 'lucide-react';
import { AdminUser, DeveloperUser } from '../types';
import { LegalTab } from './LegalAgreementsModal';

interface FooterProps {
  onNavigate: (view: 'store' | 'upload' | 'tv' | 'developer_console') => void;
  onOpenGuide: () => void;
  appsCount: number;
  admin?: AdminUser | null;
  developer?: DeveloperUser | null;
  onOpenDeveloperPortal?: () => void;
  onOpenMyPurchases?: () => void;
  onSecretAdminTrigger?: () => void;
  onOpenLegal?: (tab: LegalTab) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenGuide,
  appsCount,
  admin,
  developer,
  onOpenDeveloperPortal,
  onOpenMyPurchases,
  onSecretAdminTrigger,
  onOpenLegal,
}) => {
  return (
    <footer className="border-t border-neutral-900 bg-neutral-950 py-12 text-neutral-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-neutral-900">
          {/* Brand col with Logo */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/public/assets/aistudio/file_00000000212c8208b64f5bd04e8c4ee8_95799501.png"
                alt="ZuzuStore"
                className="w-8 h-8 rounded-lg object-contain shadow-sm border border-amber-400/50"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/zuzustore-logo.png';
                }}
              />
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-red-500 text-sm tracking-tight">
                ZuzuStore
              </span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Direct Android &amp; Smart TV APK distribution portal. Fast, clean, direct package downloads with zero accounts or registrations required.
            </p>
          </div>

          {/* Download & Links */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Navigation</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button
                  onClick={() => onNavigate('tv')}
                  className="hover:text-amber-400 transition-colors text-left flex items-center gap-1.5 text-neutral-200 cursor-pointer"
                >
                  <Tv className="w-3 h-3 text-red-500" />
                  <span>Smart TV Page</span>
                </button>
              </li>
              {onOpenDeveloperPortal && (
                <li>
                  <button
                    onClick={onOpenDeveloperPortal}
                    className="hover:text-amber-300 transition-colors text-left flex items-center gap-1.5 text-amber-400 font-semibold cursor-pointer"
                  >
                    <Code2 className="w-3 h-3 text-amber-400" />
                    <span>{developer ? 'Developer Console' : 'Become a Developer (Get Console)'}</span>
                  </button>
                </li>
              )}
              <li>
                <a href="#catalog" onClick={() => onNavigate('store')} className="hover:text-cyan-400 transition-colors">
                  Browse Catalog ({appsCount} {appsCount === 1 ? 'app' : 'apps'})
                </a>
              </li>
              <li>
                <button onClick={onOpenGuide} className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5 cursor-pointer">
                  <Smartphone className="w-3 h-3 text-cyan-400" />
                  <span>Android Installation Guide</span>
                </button>
              </li>
              {onOpenMyPurchases && (
                <li>
                  <button
                    onClick={onOpenMyPurchases}
                    className="hover:text-emerald-300 transition-colors text-left flex items-center gap-1.5 text-emerald-400 font-semibold cursor-pointer"
                  >
                    <Receipt className="w-3 h-3 text-emerald-400" />
                    <span>My Purchases &amp; Receipts</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Conditional Admin & Publisher OR Public Specs */}
          <div className="space-y-2">
            {admin ? (
              <>
                <h4 className="text-white font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-cyan-400">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Publisher Console</span>
                </h4>
                <ul className="space-y-1.5 text-[11px]">
                  <li>
                    <button onClick={() => onNavigate('upload')} className="hover:text-white transition-colors text-left font-medium text-neutral-200">
                      Publisher Studio
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onNavigate('upload')} className="hover:text-white transition-colors text-left">
                      Upload New APK Package
                    </button>
                  </li>
                  <li>
                    <span className="text-emerald-400 text-[10px]">Logged in as {admin.name || 'Admin'}</span>
                  </li>
                </ul>
              </>
            ) : (
              <>
                <h4 className="text-white font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Platform Specs</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] text-neutral-400">
                  <li>Android 8.0+ to Android 15.0+</li>
                  <li>Pure .APK package archives</li>
                  <li>Direct high-speed streaming</li>
                  <li>Instant QR code installs</li>
                </ul>
              </>
            )}
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

        {/* Bottom copyright & Protector Technologies legal links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-neutral-400 text-[11px]">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <p>
              © {new Date().getFullYear()}{' '}
              <strong className="text-neutral-200 font-semibold">Protector Technologies</strong>. All rights reserved.
            </p>
            {/* Discreet secret administrator trigger */}
            <button
              onClick={onSecretAdminTrigger}
              className="text-neutral-700 hover:text-neutral-400 transition-colors cursor-pointer p-0.5 rounded opacity-40 hover:opacity-100"
              title="Authorized Publisher Access"
              aria-label="Authorized Access"
            >
              <Lock className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-neutral-300">
            {onOpenLegal ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenLegal('rights')}
                  className="hover:text-amber-400 hover:underline transition-colors cursor-pointer"
                >
                  Terms &amp; Company Rights
                </button>
                <span className="text-neutral-700">·</span>
                <button
                  type="button"
                  onClick={() => onOpenLegal('user-payment')}
                  className="hover:text-amber-400 hover:underline transition-colors cursor-pointer"
                >
                  User Payment Agreement
                </button>
                <span className="text-neutral-700">·</span>
                <button
                  type="button"
                  onClick={() => onOpenLegal('developer-payment')}
                  className="hover:text-amber-400 hover:underline transition-colors cursor-pointer"
                >
                  Developer Payment Agreement
                </button>
              </>
            ) : (
              <>
                <span>Direct APK Access</span>
                <span className="text-neutral-700">·</span>
                <span>No Account Needed to Download</span>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
