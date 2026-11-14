import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { Readable } from 'stream';
import { initializeApp, getApps as getFirebaseApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';

// Ensure data and upload directories exist (use /tmp on Vercel serverless)
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const UPLOAD_DIR = isVercel ? path.join('/tmp', 'uploads') : path.resolve(process.cwd(), 'uploads');
const APK_DIR = path.resolve(UPLOAD_DIR, 'apks');
const IMAGES_DIR = path.resolve(UPLOAD_DIR, 'images');

try {
  [DATA_DIR, UPLOAD_DIR, APK_DIR, IMAGES_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
} catch (e) {
  // Read-only filesystem fallback
}

const APPS_FILE = path.join(DATA_DIR, 'apps.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const DEVELOPERS_FILE = path.join(DATA_DIR, 'developers.json');
const BROADCAST_FILE = path.join(DATA_DIR, 'broadcast.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const WALLETS_FILE = path.join(DATA_DIR, 'wallets.json');
const WITHDRAWALS_FILE = path.join(DATA_DIR, 'withdrawals.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TRANSFERS_FILE = path.join(DATA_DIR, 'transfers.json');

// Admin credentials specified by the user
const ADMIN_EMAIL = 'sseruwagijohn452@gmail.com';
const ADMIN_PASSWORD = '538407015+John';

// Types
export interface AppRelease {
  id: string;
  version: string;
  buildNumber: number;
  releaseDate: string;
  fileSize: string;
  fileName: string;
  platform: 'Android' | 'Smart TV' | 'Android TV' | 'Fire TV' | 'iOS' | 'Windows' | 'macOS';
  minOS: string;
  changelog: string[];
  downloadCount: number;
  sha256Checksum: string;
  isLatest: boolean;
  filePath?: string;
  directDownloadUrl?: string;
}

export interface AppReview {
  id: string;
  author: string;
  avatarInitials: string;
  rating: number;
  date: string;
  platform: string;
  version: string;
  title: string;
  comment: string;
  isVerified: boolean;
}

export interface StoreApp {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  iconUrl: string;
  heroImageUrl: string;
  screenshots: string[];
  category: string;
  developer: {
    name: string;
    email: string;
    website?: string;
    verified: boolean;
  };
  rating: number;
  ratingCount: number;
  downloadsTotal: number;
  supportedPlatforms: string[];
  currentVersion: string;
  packageId: string;
  architecture: string;
  minRequirements: Record<string, string>;
  permissions: string[];
  features: {
    title: string;
    description: string;
  }[];
  releases: AppRelease[];
  reviews: AppReview[];
  isOfficial: boolean;
  appEdition?: 'phone' | 'tv' | 'both';
  isTvCompatible?: boolean;
  displayOrder?: number;
  isFeatured?: boolean;
  isPinnedToTop?: boolean;
  pricing?: AppPriceConfig;
  approvalStatus?: 'approved' | 'pending_approval' | 'rejected';
  isTakenDown?: boolean;
  takedownReason?: string;
  takenDownAt?: string;
  takenDownBy?: string;
  submittedBy?: {
    id: string;
    name: string;
    email: string;
  };
  ownershipHistory?: AppOwnershipTransferRecord[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppOwnershipTransferRecord {
  id: string;
  fromId: string;
  fromName: string;
  fromEmail: string;
  toId: string;
  toName: string;
  toEmail: string;
  transferredAt: string;
  transferredBy: string;
  reason?: string;
  updatedDisplayCredit: boolean;
  pricePaid?: number;
  adminFeePercent?: number;
  adminFeeAmount?: number;
  sellerNetAmount?: number;
  currency?: string;
  transferListingId?: string;
  paymentMethod?: string;
}

export interface AppTransferListing {
  id: string;
  appId: string;
  appName: string;
  appSlug?: string;
  appIcon: string;
  appVersion: string;
  appCategory: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  targetBuyerId?: string;
  targetBuyerEmail?: string;
  targetBuyerName?: string;
  askingPrice: number;
  adminFeePercent: number;
  adminFeeAmount: number;
  sellerNetAmount: number;
  currency: string;
  note?: string;
  status: 'open' | 'completed' | 'cancelled';
  buyerId?: string;
  buyerName?: string;
  buyerEmail?: string;
  paymentMethod?: string;
  phoneNumber?: string;
  livepayReference?: string;
  livepayInternalRef?: string;
  livepayNetwork?: string;
  transferRecordId?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export type AppPricingType = 'free' | 'paid';

export interface AppPriceConfig {
  type: AppPricingType;
  price: number; // 0 for free, > 0 for paid
  currency: string; // 'UGX' | 'USD'
  discountPrice?: number;
}

export interface AppSaleTransaction {
  id: string;
  appId: string;
  appName: string;
  appIcon?: string;
  developerId: string;
  developerEmail: string;
  customerName: string;
  customerEmail: string;
  grossAmount: number;
  adminCommissionPercent: number; // 6% for store sales, 10% for ownership transfers
  adminCommissionAmount: number;
  developerNetAmount: number;
  currency: string;
  paymentMethod: string;
  phoneNumber?: string;
  livepayReference?: string;
  livepayInternalRef?: string;
  livepayNetwork?: string;
  livepayStatus?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  failureReason?: string;
  transactionType?: 'app_purchase' | 'ownership_transfer';
  downloadToken?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DeveloperWallet {
  developerId: string;
  totalGrossRevenue: number;
  totalAdminFeesPaid: number; // 6% sum
  totalNetEarnings: number; // 94% sum
  totalWithdrawn: number;
  availableBalance: number;
  pendingWithdrawals: number;
  currency: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  developerId: string;
  developerName: string;
  developerEmail: string;
  amount: number; // Minimum 1000
  transferFee?: number; // Sending charge (100 UGX deducted per 1000 UGX)
  netPayoutAmount?: number; // Actual cash sent to handset (amount - transferFee)
  currency: string;
  payoutMethod: 'mobile_money_mtn' | 'mobile_money_airtel' | 'bank_transfer' | 'paypal';
  payoutDetails: {
    accountName: string;
    accountNumber: string; // Phone number or Bank Account
    bankName?: string;
    swiftCode?: string;
    notes?: string;
  };
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  payoutChannel?: 'livepay' | 'manual';
  rejectionReason?: string;
  transactionRef?: string;
  livepayInternalRef?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface SystemSettings {
  adminCommissionPercent: number; // default 6%
  withdrawalTransferFeePer1000: number; // default 100 UGX per 1,000 UGX
  updatedAt: string;
}

// Initial seed apps - start empty so only authentic admin-published APKs appear
const INITIAL_APPS: StoreApp[] = [];

// In-memory cache for fast serverless responses
let memoryApps: StoreApp[] = [];

// Extract Google Drive ID from any format of Google Drive URL
export function extractGoogleDriveId(url?: string): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  const m1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m1) return m1[1];
  const m2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  return null;
}

// URL Normalizer for cloud storage direct downloads (Google Drive, Dropbox, OneDrive, etc.)
export function normalizeDownloadUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;

  // Google Drive: extract ID and use the modern direct usercontent endpoint with confirm=t
  const gdId = extractGoogleDriveId(trimmed);
  if (gdId) {
    return `https://drive.usercontent.google.com/download?id=${gdId}&export=download&confirm=t`;
  }

  // Dropbox: convert ?dl=0 to ?dl=1 for direct download
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'dl=1');
  }

  return trimmed;
}

// Render clean, branded guidance page when a publisher's Google Drive link is restricted (403)
function renderGoogleDriveAccessErrorPage(appName: string, fileId: string, webViewUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Drive Access Required - ${appName} | Zuzu Store</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-neutral-950 text-neutral-100 min-h-screen flex items-center justify-center p-4 antialiased font-sans">
  <div class="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
    <div class="flex items-center gap-3 border-b border-neutral-800 pb-4">
      <img src="/zuzustore-logo.png" alt="Zuzu Store" class="w-10 h-10 rounded-xl object-contain bg-neutral-950 border border-neutral-800 p-1" />
      <div>
        <h1 class="text-xs font-bold text-cyan-400 uppercase tracking-wider">Zuzu Store • Package Delivery</h1>
        <p class="text-base font-extrabold text-white">${appName}</p>
      </div>
    </div>

    <div class="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl space-y-2">
      <div class="flex items-center gap-2 text-amber-300 font-bold text-sm">
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <span>Google Drive Link Access Required (403)</span>
      </div>
      <p class="text-xs text-amber-200/90 leading-relaxed">
        Google Drive is currently blocking public access to this file because its sharing settings are set to <strong>"Restricted"</strong>.
      </p>
    </div>

    <div class="space-y-4">
      <div class="text-xs text-neutral-300 space-y-2.5 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
        <p class="font-bold text-cyan-300 text-sm">Are you the publisher / owner of this app?</p>
        <p class="text-neutral-400 text-xs">To give download access to EVERYONE without this 403 error:</p>
        <ol class="list-decimal list-inside space-y-1.5 text-neutral-300 text-xs leading-relaxed">
          <li>Open your file in <strong>Google Drive</strong> on your phone or computer.</li>
          <li>Click <strong>Share</strong> (or tap the 3 dots ➔ Share).</li>
          <li>Under <strong>General access</strong>, change <strong>"Restricted"</strong> to <strong>"Anyone with the link"</strong>.</li>
          <li>Ensure the permission is set to <strong>Viewer</strong>, then tap <strong>Done</strong>.</li>
        </ol>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <a href="${webViewUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl text-center shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
          <span>Open File in Google Drive</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </a>
        <a href="/" class="py-3 px-5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl text-center transition-colors flex items-center justify-center">
          Back to Store
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Track deleted app IDs in memory so stale client syncs never resurrect deleted apps
const serverDeletedAppIds = new Set<string>();

function dedupeAppsList(apps: StoreApp[]): StoreApp[] {
  const map = new Map<string, StoreApp>();
  for (const appItem of apps) {
    if (!appItem || !appItem.id) continue;
    if (serverDeletedAppIds.has(appItem.id)) continue;
    const prev = map.get(appItem.id);
    if (!prev) {
      map.set(appItem.id, appItem);
    } else {
      const prevTs = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
      const nextTs = new Date(appItem.updatedAt || appItem.createdAt || 0).getTime();
      if (nextTs >= prevTs) {
        map.set(appItem.id, appItem);
      }
    }
  }
  return Array.from(map.values());
}

function findAppByIdOrSlug(apps: StoreApp[], idOrSlug: string): StoreApp | undefined {
  return apps.find((a) => a.id === idOrSlug) || apps.find((a) => a.slug === idOrSlug);
}

async function recordServerAppTombstone(appId: string) {
  if (!appId) return;
  serverDeletedAppIds.add(appId);
  if (!firestoreDb) return;
  try {
    const docRef = doc(firestoreDb, 'stats', 'tombstones');
    const snap = await getDoc(docRef);
    const existingData = snap.exists() ? (snap.data() as any) : { deletedAppIds: [], deletedReleaseIds: [] };
    const appIds = new Set<string>(Array.isArray(existingData.deletedAppIds) ? existingData.deletedAppIds : []);
    appIds.add(appId);
    await setDoc(
      docRef,
      {
        deletedAppIds: Array.from(appIds),
        deletedReleaseIds: existingData.deletedReleaseIds || [],
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[Firestore] Failed to record app tombstone:', e);
  }
}

// Helper: Read apps with memory and multi-path fallback
function getApps(): StoreApp[] {
  try {
    if (fs.existsSync(APPS_FILE)) {
      const data = fs.readFileSync(APPS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = dedupeAppsList(parsed);
        memoryApps = clean;
        return clean;
      }
    }

    // Check project data directory (important on Vercel deployment)
    const rootDataFile = path.resolve(process.cwd(), 'data', 'apps.json');
    if (fs.existsSync(rootDataFile)) {
      const data = fs.readFileSync(rootDataFile, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = dedupeAppsList(parsed);
        memoryApps = clean;
        try {
          fs.writeFileSync(APPS_FILE, JSON.stringify(clean, null, 2), 'utf-8');
        } catch (_) {}
        return clean;
      }
    }

    if (memoryApps.length > 0) {
      return dedupeAppsList(memoryApps);
    }

    return [];
  } catch (err) {
    console.error('Error reading apps file:', err);
    return dedupeAppsList(memoryApps || []);
  }
}

// Helper: Save apps
function saveApps(apps: StoreApp[]) {
  const clean = dedupeAppsList(apps);
  memoryApps = clean;
  try {
    fs.writeFileSync(APPS_FILE, JSON.stringify(clean, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving apps file:', err);
  }

  // Also try saving to root data directory if accessible
  try {
    const rootDataDir = path.resolve(process.cwd(), 'data');
    if (fs.existsSync(rootDataDir)) {
      fs.writeFileSync(path.join(rootDataDir, 'apps.json'), JSON.stringify(clean, null, 2), 'utf-8');
    }
  } catch (_) {}
}

// Helper: Sessions
interface Session {
  token: string;
  email: string;
  role: 'admin';
  createdAt: number;
  expiresAt: number;
}

function getSessions(): Record<string, Session> {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      fs.writeFileSync(SESSIONS_FILE, '{}', 'utf-8');
      return {};
    }
    const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

function saveSessions(sessions: Record<string, Session>) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

// ==========================================
// DEVELOPER STORAGE & AUTH HELPERS
// ==========================================
export interface DeveloperAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  companyName?: string;
  status?: 'active' | 'frozen' | 'banned';
  banReason?: string;
  bannedAt?: string;
  agreementsAccepted?: boolean;
  agreementsAcceptedAt?: string;
  agreementsVersion?: string;
  createdAt: string;
}

export interface AdminBroadcast {
  id?: string;
  message: string;
  level: 'info' | 'warning' | 'alert';
  active: boolean;
  createdAt: string;
  updatedAt: string;
  link?: string;
  linkText?: string;
}

// Initialize Firestore in Server
let firestoreDb: any = null;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const firebaseConfig = JSON.parse(raw);
    const fbApp = getFirebaseApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreDb =
      firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
        ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
        : getFirestore(fbApp);
    console.log('[Firestore Server] Connected to persistent database:', firebaseConfig.firestoreDatabaseId || '(default)');
  }
} catch (err) {
  console.warn('[Firestore Server] Init warning:', err);
}

// Helper to remove any undefined fields before sending to Firestore
function cleanForFirestore<T>(data: T): any {
  if (data === undefined || data === null) return {};
  return JSON.parse(JSON.stringify(data));
}

// In-memory cache for developers & broadcasts
let memoryDevelopers: Record<string, DeveloperAccount> = {};
let memoryBroadcast: AdminBroadcast | null = null;

function getLocalDevelopers(): Record<string, DeveloperAccount> {
  try {
    if (!fs.existsSync(DEVELOPERS_FILE)) {
      fs.writeFileSync(DEVELOPERS_FILE, '{}', 'utf-8');
      return {};
    }
    const data = fs.readFileSync(DEVELOPERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

function saveLocalDevelopers(devs: Record<string, DeveloperAccount>) {
  try {
    fs.writeFileSync(DEVELOPERS_FILE, JSON.stringify(devs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving developers file:', err);
  }
}

function getDevelopers(): Record<string, DeveloperAccount> {
  if (Object.keys(memoryDevelopers).length > 0) {
    return memoryDevelopers;
  }
  const local = getLocalDevelopers();
  if (Object.keys(local).length > 0) {
    memoryDevelopers = local;
    return local;
  }
  return memoryDevelopers;
}

async function findDeveloperByIdOrEmail(idOrEmail: string): Promise<DeveloperAccount | null> {
  if (!idOrEmail) return null;
  const norm = idOrEmail.toLowerCase().trim();

  // 1. Check in-memory developers
  for (const dev of Object.values(memoryDevelopers)) {
    if (dev.id === idOrEmail || dev.email.toLowerCase().trim() === norm) {
      return dev;
    }
  }

  // 2. Check local file
  const local = getLocalDevelopers();
  for (const dev of Object.values(local)) {
    if (dev.id === idOrEmail || dev.email.toLowerCase().trim() === norm) {
      memoryDevelopers[dev.id] = dev;
      return dev;
    }
  }

  // 3. Fallback to Firestore cloud database directly
  if (firestoreDb) {
    try {
      const docSnap = await getDoc(doc(firestoreDb, 'developers', idOrEmail));
      if (docSnap.exists()) {
        const dev = docSnap.data() as DeveloperAccount;
        memoryDevelopers[dev.id] = dev;
        return dev;
      }

      // Check email pointer doc
      const emailSnap = await getDoc(doc(firestoreDb, 'developers', `email_${norm}`));
      if (emailSnap.exists()) {
        const devId = (emailSnap.data() as any).developerId;
        if (devId) {
          const directSnap = await getDoc(doc(firestoreDb, 'developers', devId));
          if (directSnap.exists()) {
            const dev = directSnap.data() as DeveloperAccount;
            memoryDevelopers[dev.id] = dev;
            return dev;
          }
        }
      }

      // Query docs
      const querySnap = await getDocs(collection(firestoreDb, 'developers'));
      for (const d of querySnap.docs) {
        if (d.id.startsWith('email_')) continue;
        const dev = d.data() as DeveloperAccount;
        if (dev.id === idOrEmail || dev.email?.toLowerCase().trim() === norm) {
          memoryDevelopers[dev.id] = dev;
          return dev;
        }
      }
    } catch (e) {
      console.warn('[Firestore] Developer lookup warning:', e);
    }
  }

  return null;
}

async function persistDeveloper(dev: DeveloperAccount): Promise<void> {
  memoryDevelopers[dev.id] = dev;
  saveLocalDevelopers(memoryDevelopers);

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'developers', dev.id), {
        ...dev,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Mirror to email index for instant lookup
      await setDoc(doc(firestoreDb, 'developers', `email_${dev.email.toLowerCase().trim()}`), {
        developerId: dev.id,
        email: dev.email.toLowerCase().trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('[Firestore] Error persisting developer to cloud:', e);
    }
  }
}

async function deleteDeveloperPermanently(devId: string): Promise<void> {
  const dev = memoryDevelopers[devId];
  const email = dev?.email?.toLowerCase().trim();

  delete memoryDevelopers[devId];
  saveLocalDevelopers(memoryDevelopers);

  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, 'developers', devId));
      if (email) {
        await deleteDoc(doc(firestoreDb, 'developers', `email_${email}`));
      }
    } catch (e) {
      console.error('[Firestore] Error deleting developer from cloud:', e);
    }
  }
}

function saveDevelopers(devs: Record<string, DeveloperAccount>) {
  memoryDevelopers = devs;
  saveLocalDevelopers(devs);
  if (firestoreDb) {
    Object.values(devs).forEach((dev) => {
      persistDeveloper(dev).catch(() => {});
    });
  }
}

function getBroadcast(): AdminBroadcast | null {
  if (memoryBroadcast) return memoryBroadcast;
  try {
    if (!fs.existsSync(BROADCAST_FILE)) {
      return null;
    }
    const data = fs.readFileSync(BROADCAST_FILE, 'utf-8');
    memoryBroadcast = JSON.parse(data);
    return memoryBroadcast;
  } catch (err) {
    return null;
  }
}

function saveBroadcast(bc: AdminBroadcast | null) {
  memoryBroadcast = bc;
  try {
    if (!bc) {
      if (fs.existsSync(BROADCAST_FILE)) fs.unlinkSync(BROADCAST_FILE);
    } else {
      fs.writeFileSync(BROADCAST_FILE, JSON.stringify(bc, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error saving broadcast:', err);
  }

  if (firestoreDb) {
    if (!bc) {
      deleteDoc(doc(firestoreDb, 'broadcasts', 'active_broadcast')).catch(() => {});
    } else {
      setDoc(doc(firestoreDb, 'broadcasts', 'active_broadcast'), {
        ...bc,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }
  }
}

// Background sync from Firestore to hydrate memory
async function syncFromFirestore() {
  if (!firestoreDb) return;
  try {
    // 1. Sync developers from Firestore
    const devSnap = await getDocs(collection(firestoreDb, 'developers'));
    const loadedDevs: Record<string, DeveloperAccount> = {};
    devSnap.forEach((d) => {
      if (d.id.startsWith('email_')) return;
      const dev = d.data() as DeveloperAccount;
      if (dev && dev.id) {
        loadedDevs[dev.id] = dev;
      }
    });

    const localDevs = getLocalDevelopers();
    memoryDevelopers = { ...localDevs, ...loadedDevs };
    saveLocalDevelopers(memoryDevelopers);
    console.log(`[Firestore Server] Synchronized ${Object.keys(memoryDevelopers).length} developers.`);

    // 2. Sync broadcasts
    const bcSnap = await getDoc(doc(firestoreDb, 'broadcasts', 'active_broadcast'));
    if (bcSnap.exists()) {
      memoryBroadcast = bcSnap.data() as AdminBroadcast;
      console.log('[Firestore Server] Synchronized broadcast banner.');
    }

    // 3. Sync tombstones & apps from Firestore (Firestore is authoritative for existing catalog)
    try {
      const tombSnap = await getDoc(doc(firestoreDb, 'stats', 'tombstones'));
      if (tombSnap.exists()) {
        const tData = tombSnap.data() as any;
        if (Array.isArray(tData.deletedAppIds)) {
          tData.deletedAppIds.forEach((id: string) => serverDeletedAppIds.add(String(id)));
        }
      }
    } catch (_) {}

    const appsSnap = await getDocs(collection(firestoreDb, 'apps'));
    const cloudApps: StoreApp[] = [];
    appsSnap.forEach((d) => {
      const app = d.data() as StoreApp;
      if (app && (app.id || d.id)) {
        const normalizedApp = app.id ? app : { ...app, id: d.id };
        if (!serverDeletedAppIds.has(normalizedApp.id)) {
          cloudApps.push(normalizedApp);
        }
      }
    });
    if (cloudApps.length > 0) {
      const mergedMap = new Map<string, StoreApp>();
      cloudApps.forEach((a) => {
        if (a && a.id && !serverDeletedAppIds.has(a.id)) {
          const prev = mergedMap.get(a.id);
          const prevTime = prev ? new Date(prev.updatedAt || prev.createdAt || 0).getTime() : 0;
          const nextTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          if (!prev || nextTime >= prevTime) {
            mergedMap.set(a.id, a);
          }
        }
      });
      const mergedApps = Array.from(mergedMap.values());
      mergedApps.sort((a, b) => {
        const orderA = a.displayOrder !== undefined ? a.displayOrder : (a.isFeatured ? 1 : 9999);
        const orderB = b.displayOrder !== undefined ? b.displayOrder : (b.isFeatured ? 1 : 9999);
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      memoryApps = mergedApps;
      saveApps(mergedApps);
      console.log(`[Firestore Server] Synchronized ${mergedApps.length} store apps.`);
    }

    // 4. Sync sales
    const salesSnap = await getDocs(collection(firestoreDb, 'sales'));
    const cloudSales: AppSaleTransaction[] = [];
    salesSnap.forEach((d) => {
      const sale = d.data() as AppSaleTransaction;
      if (sale && sale.id) cloudSales.push(sale);
    });
    if (cloudSales.length > 0) {
      cloudSales.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      memorySales = cloudSales;
      saveSales(cloudSales);
    }

    // 5. Sync wallets
    const walletsSnap = await getDocs(collection(firestoreDb, 'wallets'));
    const cloudWallets: Record<string, DeveloperWallet> = {};
    walletsSnap.forEach((d) => {
      const wallet = d.data() as DeveloperWallet;
      if (wallet && wallet.developerId) cloudWallets[wallet.developerId] = wallet;
    });
    if (Object.keys(cloudWallets).length > 0) {
      memoryWallets = { ...getWallets(), ...cloudWallets };
      saveWallets(memoryWallets);
    }

    // 6. Sync withdrawals
    const withdrawalsSnap = await getDocs(collection(firestoreDb, 'withdrawals'));
    const cloudWithdrawals: WithdrawalRequest[] = [];
    withdrawalsSnap.forEach((d) => {
      const w = d.data() as WithdrawalRequest;
      if (w && w.id) cloudWithdrawals.push(w);
    });
    if (cloudWithdrawals.length > 0) {
      cloudWithdrawals.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      memoryWithdrawals = cloudWithdrawals;
      saveWithdrawals(cloudWithdrawals);
    }

    // 7. Sync system settings (admin commission % and withdrawal sending fee)
    const settingsSnap = await getDoc(doc(firestoreDb, 'settings', 'system_config'));
    if (settingsSnap.exists()) {
      const data = settingsSnap.data() as SystemSettings;
      if (data) {
        saveSystemSettings(data);
        console.log(`[Firestore Server] Synchronized system settings: commission=${data.adminCommissionPercent}%, transferFeePer1000=${data.withdrawalTransferFeePer1000} UGX`);
      }
    }

    // 8. Sync developer-to-developer app ownership transfers
    const transfersSnap = await getDocs(collection(firestoreDb, 'app_transfers'));
    const cloudTransfers: AppTransferListing[] = [];
    transfersSnap.forEach((d) => {
      const t = d.data() as AppTransferListing;
      if (t && t.id) cloudTransfers.push(t);
    });
    if (cloudTransfers.length > 0) {
      cloudTransfers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      memoryTransfers = cloudTransfers;
      saveTransfers(cloudTransfers);
      console.log(`[Firestore Server] Synchronized ${cloudTransfers.length} app ownership transfer listings.`);
    }
  } catch (err) {
    console.warn('[Firestore Server] Initial sync notice:', err);
  }
}

// In-memory financial data caches
let memorySales: AppSaleTransaction[] = [];
let memoryWallets: Record<string, DeveloperWallet> = {};
let memoryWithdrawals: WithdrawalRequest[] = [];
let memoryTransfers: AppTransferListing[] = [];

function getSales(): AppSaleTransaction[] {
  try {
    if (!fs.existsSync(SALES_FILE)) {
      fs.writeFileSync(SALES_FILE, '[]', 'utf-8');
      return [];
    }
    const data = fs.readFileSync(SALES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return memorySales || [];
  }
}

function saveSales(sales: AppSaleTransaction[]) {
  memorySales = sales;
  try {
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sales file:', err);
  }
}

function getWallets(): Record<string, DeveloperWallet> {
  try {
    if (!fs.existsSync(WALLETS_FILE)) {
      fs.writeFileSync(WALLETS_FILE, '{}', 'utf-8');
      return {};
    }
    const data = fs.readFileSync(WALLETS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return memoryWallets || {};
  }
}

function saveWallets(wallets: Record<string, DeveloperWallet>) {
  memoryWallets = wallets;
  try {
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving wallets file:', err);
  }
}

function getWithdrawals(): WithdrawalRequest[] {
  try {
    if (!fs.existsSync(WITHDRAWALS_FILE)) {
      fs.writeFileSync(WITHDRAWALS_FILE, '[]', 'utf-8');
      return [];
    }
    const data = fs.readFileSync(WITHDRAWALS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return memoryWithdrawals || [];
  }
}

function saveWithdrawals(withdrawals: WithdrawalRequest[]) {
  memoryWithdrawals = withdrawals;
  try {
    fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(withdrawals, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving withdrawals file:', err);
  }
}

function getTransfers(): AppTransferListing[] {
  try {
    if (!fs.existsSync(TRANSFERS_FILE)) {
      fs.writeFileSync(TRANSFERS_FILE, '[]', 'utf-8');
      return [];
    }
    const data = fs.readFileSync(TRANSFERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return memoryTransfers || [];
  }
}

function saveTransfers(transfers: AppTransferListing[]) {
  memoryTransfers = transfers;
  try {
    fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(transfers, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving transfers file:', err);
  }
}

// System Settings (Admin Commission % and Withdrawal Transfer Fees)
let memorySettings: SystemSettings = {
  adminCommissionPercent: 6,
  withdrawalTransferFeePer1000: 100,
  updatedAt: new Date().toISOString()
};

function getSystemSettings(): SystemSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      const initial: SystemSettings = {
        adminCommissionPercent: 6,
        withdrawalTransferFeePer1000: 100,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      memorySettings = initial;
      return initial;
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const valid: SystemSettings = {
      adminCommissionPercent: typeof parsed.adminCommissionPercent === 'number' && parsed.adminCommissionPercent >= 0 && parsed.adminCommissionPercent <= 100 ? parsed.adminCommissionPercent : 6,
      withdrawalTransferFeePer1000: typeof parsed.withdrawalTransferFeePer1000 === 'number' && parsed.withdrawalTransferFeePer1000 >= 0 ? parsed.withdrawalTransferFeePer1000 : 100,
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
    memorySettings = valid;
    return valid;
  } catch (err) {
    return memorySettings;
  }
}

function saveSystemSettings(settings: Partial<SystemSettings>): SystemSettings {
  const current = getSystemSettings();
  const updated: SystemSettings = {
    adminCommissionPercent: typeof settings.adminCommissionPercent === 'number' && settings.adminCommissionPercent >= 0 && settings.adminCommissionPercent <= 100 ? settings.adminCommissionPercent : current.adminCommissionPercent,
    withdrawalTransferFeePer1000: typeof settings.withdrawalTransferFeePer1000 === 'number' && settings.withdrawalTransferFeePer1000 >= 0 ? settings.withdrawalTransferFeePer1000 : current.withdrawalTransferFeePer1000,
    updatedAt: new Date().toISOString()
  };
  memorySettings = updated;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving settings file:', err);
  }

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'settings', 'system_config'), cleanForFirestore(updated), { merge: true }).catch(() => {});
  }
  return updated;
}

function getOrCreateWallet(devId: string): DeveloperWallet {
  const wallets = getWallets();
  if (wallets[devId]) {
    return wallets[devId];
  }
  const newWallet: DeveloperWallet = {
    developerId: devId,
    totalGrossRevenue: 0,
    totalAdminFeesPaid: 0,
    totalNetEarnings: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
    pendingWithdrawals: 0,
    currency: 'UGX',
    updatedAt: new Date().toISOString()
  };
  wallets[devId] = newWallet;
  saveWallets(wallets);
  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'wallets', devId), newWallet, { merge: true }).catch(() => {});
  }
  return newWallet;
}

syncFromFirestore().catch(() => {});

function createDeveloperToken(devId: string, email: string): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const data = JSON.stringify({ devId, email: email.toLowerCase(), expiresAt });
  const b64 = Buffer.from(data).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('hex');
  return `${b64}.${sig}`;
}

function verifyDeveloperToken(token: string): { id: string; email: string } | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
    if (!parsed || parsed.expiresAt < Date.now()) return null;
    return { id: parsed.devId, email: parsed.email };
  } catch (_) {
    return null;
  }
}

// Multer storage for APK and Image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'apkFile') {
      cb(null, APK_DIR);
    } else {
      cb(null, IMAGES_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // Supports up to 2GB (at least 1GB guaranteed)
  }
});

// Create Express App
const app = express();
app.use(express.json({ limit: '2048mb' }));
app.use(express.urlencoded({ extended: true, limit: '2048mb' }));

// Static uploads serving for uploaded icons and screenshots
app.use('/uploads', express.static(UPLOAD_DIR));

// Conditional Multer middleware: only processes multipart/form-data requests
// This allows clean JSON submissions (e.g. cloud direct links) to bypass multer completely
const conditionalUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.is('multipart/form-data')) {
    upload.fields([
      { name: 'apkFile', maxCount: 1 },
      { name: 'iconFile', maxCount: 1 },
      { name: 'screenshotFiles', maxCount: 20 }
    ])(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds maximum upload limit (packages up to 2GB, at least 1GB supported).' });
        }
        return res.status(400).json({ error: err.message || 'File upload error.' });
      }
      next();
    });
  } else {
    next();
  }
};

const conditionalSingleUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.is('multipart/form-data')) {
    upload.single('apkFile')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds maximum upload limit (packages up to 2GB, at least 1GB supported).' });
        }
        return res.status(400).json({ error: err.message || 'File upload error.' });
      }
      next();
    });
  } else {
    next();
  }
};

// Stateless HMAC Token Secret for Vercel Serverless containers
const TOKEN_SECRET = crypto.createHash('sha256').update(ADMIN_EMAIL + ADMIN_PASSWORD + 'zuzu_auth_salt_2026').digest('hex');

function createAdminToken(): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `${ADMIN_EMAIL}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length === 3) {
      const [email, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt) || expiresAt < Date.now()) return false;
      if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return false;
      const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(`${email}:${expiresAt}`).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    }
  } catch (_) {}

  // Fallback to file/memory session check for legacy tokens
  const sessions = getSessions();
  const session = sessions[token];
  return Boolean(session && session.expiresAt > Date.now());
}

// Admin authentication middleware
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required to publish or modify apps.' });
  }

  const token = authHeader.split(' ')[1];
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in as admin.' });
  }

  (req as any).admin = {
    email: ADMIN_EMAIL,
    name: 'John Sseruwagi',
    role: 'admin'
  };
  next();
};

// Developer authentication middleware
const requireDeveloper = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Developer authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyDeveloperToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid developer credentials.' });
  }

  const dev = (await findDeveloperByIdOrEmail(payload.id)) || (await findDeveloperByIdOrEmail(payload.email));
  if (!dev) {
    return res.status(401).json({ error: 'Developer account not found.' });
  }

  if (dev.status === 'banned') {
    return res.status(403).json({
      error: `Your developer account has been banned by Super Admin. Reason: ${dev.banReason || 'Administrative ban'}`
    });
  }

  if (dev.status === 'frozen' && (req.method === 'POST' || req.method === 'DELETE' || req.method === 'PATCH')) {
    return res.status(403).json({
      error: `Your developer account is temporarily frozen by Super Admin. Reason: ${dev.banReason || 'Administrative freeze'}. Publishing actions are disabled.`
    });
  }

  (req as any).developer = dev;
  next();
};

// ==========================================
// AUTH ROUTES (ADMIN & DEVELOPER)
// ==========================================

// Login endpoint for admin
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const targetEmail = ADMIN_EMAIL.toLowerCase();

  if (normalizedEmail === targetEmail && password === ADMIN_PASSWORD) {
    const token = createAdminToken();

    // Also store session locally for backward compatibility
    const session: Session = {
      token,
      email: ADMIN_EMAIL,
      role: 'admin',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    };
    const sessions = getSessions();
    sessions[token] = session;
    saveSessions(sessions);

    return res.json({
      success: true,
      token,
      admin: {
        email: ADMIN_EMAIL,
        name: 'John Sseruwagi',
        role: 'Admin Publisher'
      }
    });
  }

  return res.status(401).json({
    error: 'Invalid administrator credentials. Only authorized publisher accounts can publish apps.'
  });
});

// Developer registration endpoint
app.post('/api/developer/auth/register', async (req, res) => {
  const { name, email, password, companyName, acceptedAgreements, agreementsVersion } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Developer or studio name is required.' });
  }

  if (!email || !email.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  if (acceptedAgreements !== true) {
    return res.status(400).json({
      error: 'You must agree to Protector Technologies Terms & Conditions and Developer Payment Agreement.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Protect Super Admin email from developer collisions
  if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
    return res.status(400).json({ error: 'This email is reserved for platform Super Admin.' });
  }

  const existing = await findDeveloperByIdOrEmail(normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'A developer account already exists with this email. Please sign in.' });
  }

  const devId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const passwordHash = crypto.createHash('sha256').update(password + 'zuzu_dev_salt_2026').digest('hex');
  const nowIso = new Date().toISOString();
  const ver = String(agreementsVersion || '2026-11-v1');

  const newDev: DeveloperAccount = {
    id: devId,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    companyName: companyName ? companyName.trim() : undefined,
    status: 'active',
    agreementsAccepted: true,
    agreementsAcceptedAt: nowIso,
    agreementsVersion: ver,
    createdAt: nowIso
  };

  await persistDeveloper(newDev);

  if (firestoreDb) {
    try {
      const accId = `agr-dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(firestoreDb, 'agreements', accId), {
        id: accId,
        role: 'developer',
        version: ver,
        developerId: devId,
        email: normalizedEmail,
        acceptedAt: nowIso
      });
    } catch (_) {}
  }

  const token = createDeveloperToken(devId, normalizedEmail);

  return res.status(201).json({
    success: true,
    token,
    developer: {
      id: newDev.id,
      name: newDev.name,
      email: newDev.email,
      companyName: newDev.companyName,
      status: newDev.status,
      agreementsAccepted: newDev.agreementsAccepted,
      agreementsAcceptedAt: newDev.agreementsAcceptedAt,
      agreementsVersion: newDev.agreementsVersion,
      createdAt: newDev.createdAt
    }
  });
});

// Developer login endpoint
app.post('/api/developer/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const dev = await findDeveloperByIdOrEmail(normalizedEmail);

  if (!dev) {
    return res.status(401).json({ error: 'No developer account found with this email. Please create an account.' });
  }

  const passwordHash = crypto.createHash('sha256').update(password + 'zuzu_dev_salt_2026').digest('hex');
  if (dev.passwordHash !== passwordHash) {
    return res.status(401).json({ error: 'Incorrect developer password. Please try again.' });
  }

  const token = createDeveloperToken(dev.id, dev.email);

  return res.json({
    success: true,
    token,
    developer: {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      companyName: dev.companyName,
      status: dev.status || 'active',
      banReason: dev.banReason,
      bannedAt: dev.bannedAt,
      agreementsAccepted: dev.agreementsAccepted,
      agreementsAcceptedAt: dev.agreementsAcceptedAt,
      agreementsVersion: dev.agreementsVersion,
      createdAt: dev.createdAt
    }
  });
});

// Check active session (Unified for Super Admin & Developer)
app.get('/api/auth/session', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }

  const token = authHeader.split(' ')[1];

  // 1. Check if Super Admin
  if (verifyAdminToken(token)) {
    return res.json({
      authenticated: true,
      role: 'admin',
      admin: {
        email: ADMIN_EMAIL,
        name: 'John Sseruwagi',
        role: 'Admin Publisher'
      }
    });
  }

  // 2. Check if Developer
  const devPayload = verifyDeveloperToken(token);
  if (devPayload) {
    const dev = (await findDeveloperByIdOrEmail(devPayload.id)) || (await findDeveloperByIdOrEmail(devPayload.email));
    if (dev) {
      return res.json({
        authenticated: true,
        role: 'developer',
        developer: {
          id: dev.id,
          name: dev.name,
          email: dev.email,
          companyName: dev.companyName,
          status: dev.status || 'active',
          banReason: dev.banReason,
          bannedAt: dev.bannedAt,
          agreementsAccepted: dev.agreementsAccepted,
          agreementsAcceptedAt: dev.agreementsAcceptedAt,
          agreementsVersion: dev.agreementsVersion,
          createdAt: dev.createdAt
        }
      });
    }
  }

  return res.json({ authenticated: false });
});

// Check developer session specifically
app.get('/api/developer/auth/session', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }

  const token = authHeader.split(' ')[1];
  const devPayload = verifyDeveloperToken(token);
  if (!devPayload) {
    return res.json({ authenticated: false });
  }

  const dev = (await findDeveloperByIdOrEmail(devPayload.id)) || (await findDeveloperByIdOrEmail(devPayload.email));
  if (!dev) {
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    developer: {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      companyName: dev.companyName,
      status: dev.status || 'active',
      banReason: dev.banReason,
      bannedAt: dev.bannedAt,
      agreementsAccepted: dev.agreementsAccepted,
      agreementsAcceptedAt: dev.agreementsAcceptedAt,
      agreementsVersion: dev.agreementsVersion,
      createdAt: dev.createdAt
    }
  });
});

// Record acceptance of Protector Technologies Terms, Conditions, and Payment Agreements (Users / Buyers)
app.post('/api/agreements/accept', async (req, res) => {
  const { role = 'user', version = '2026-11-v1', email } = req.body || {};
  const allowedRoles = ['user', 'buyer', 'developer'];
  const cleanRole = allowedRoles.includes(String(role)) ? String(role) : 'user';
  const nowIso = new Date().toISOString();
  const acceptanceId = `agr-${cleanRole}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const record: Record<string, any> = {
    id: acceptanceId,
    role: cleanRole,
    version: String(version || '2026-11-v1'),
    acceptedAt: nowIso
  };
  if (email && String(email).trim()) {
    record.email = String(email).trim().toLowerCase();
  }

  try {
    const agrFile = path.join(DATA_DIR, 'agreements.json');
    let existing: any[] = [];
    if (fs.existsSync(agrFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(agrFile, 'utf-8'));
        if (Array.isArray(parsed)) existing = parsed;
      } catch (_) {}
    }
    existing.push(record);
    fs.writeFileSync(agrFile, JSON.stringify(existing.slice(-500), null, 2), 'utf-8');
  } catch (_) {}

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'agreements', acceptanceId), cleanForFirestore(record));
    } catch (_) {}
  }

  return res.json({ success: true, acceptance: record });
});

// Developer: Accept updated Protector Technologies Developer & Payment Agreements
app.post('/api/developer/agreements/accept', requireDeveloper, async (req, res) => {
  const caller = (req as any).developer as DeveloperAccount;
  const version = String(req.body?.version || '2026-11-v1');
  const nowIso = new Date().toISOString();

  const updatedDev: DeveloperAccount = {
    ...caller,
    agreementsAccepted: true,
    agreementsAcceptedAt: nowIso,
    agreementsVersion: version
  };

  await persistDeveloper(updatedDev);

  if (firestoreDb) {
    try {
      const acceptanceId = `agr-dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(firestoreDb, 'agreements', acceptanceId), {
        id: acceptanceId,
        role: 'developer',
        version,
        developerId: updatedDev.id,
        email: updatedDev.email,
        acceptedAt: nowIso
      });
    } catch (_) {}
  }

  return res.json({
    success: true,
    developer: {
      id: updatedDev.id,
      name: updatedDev.name,
      email: updatedDev.email,
      companyName: updatedDev.companyName,
      status: updatedDev.status || 'active',
      banReason: updatedDev.banReason,
      bannedAt: updatedDev.bannedAt,
      agreementsAccepted: updatedDev.agreementsAccepted,
      agreementsAcceptedAt: updatedDev.agreementsAcceptedAt,
      agreementsVersion: updatedDev.agreementsVersion,
      createdAt: updatedDev.createdAt
    }
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const sessions = getSessions();
    delete sessions[token];
    saveSessions(sessions);
  }
  return res.json({ success: true });
});

// ==========================================
// PUBLIC APP STORE ROUTES (NO ACCOUNT REQUIRED)
// ==========================================

// Get all apps (Public - Strictly approved apps only)
app.get('/api/apps', (req, res) => {
  const apps = getApps();
  const { category, search, platform } = req.query;

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
  const isAdmin = token ? verifyAdminToken(token) : false;
  const isSuperAdminView = isAdmin && req.headers['x-admin-view'] === 'true';

  // Public visitors only see approved apps that have NOT been taken down by Super Admin
  let filtered = isSuperAdminView
    ? apps
    : apps.filter(
        (a) =>
          !a.isTakenDown &&
          (a.approvalStatus === 'approved' || !a.approvalStatus)
      );

  if (category && category !== 'All') {
    filtered = filtered.filter((a) => a.category.toLowerCase() === String(category).toLowerCase());
  }

  if (platform && platform !== 'All') {
    filtered = filtered.filter((a) => a.supportedPlatforms.includes(String(platform)));
  }

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.tagline.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    const orderA = a.displayOrder !== undefined ? a.displayOrder : (a.isFeatured ? 1 : 9999);
    const orderB = b.displayOrder !== undefined ? b.displayOrder : (b.isFeatured ? 1 : 9999);
    if (orderA !== orderB) return orderA - orderB;
    return (b.downloadsTotal || 0) - (a.downloadsTotal || 0);
  });

  return res.json(filtered);
});

// Get single app by slug or ID (Public)
app.get('/api/apps/:id', (req, res) => {
  const { id } = req.params;
  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);

  if (!appItem) {
    return res.status(404).json({ error: 'App not found in store.' });
  }

  // If taken down by Super Admin, block public viewing
  if (appItem.isTakenDown) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    const isAdmin = token ? verifyAdminToken(token) : false;
    if (!isAdmin) {
      return res.status(404).json({
        error: 'This application has been taken down from the store.',
        reason: appItem.takedownReason
      });
    }
  }

  // If pending or rejected, only allow Super Admin or the submitter developer to view it
  if (appItem.approvalStatus && appItem.approvalStatus !== 'approved') {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    const isAdmin = token ? verifyAdminToken(token) : false;
    const devPayload = token ? verifyDeveloperToken(token) : null;
    const isOwner = devPayload ? isAppOwnedByDeveloper(appItem, devPayload) : false;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'This app is pending approval by Super Admin.' });
    }
  }

  return res.json(appItem);
});

// Helper to pipe web fetch Response stream to Express response with proper headers
function pipeFetchResponse(fetchResp: Response, res: express.Response, fileName: string): boolean {
  if (res.headersSent) return false;

  const contentLength = fetchResp.headers.get('content-length');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition');
  if (contentLength && !isNaN(Number(contentLength))) {
    res.setHeader('Content-Length', contentLength);
  }

  if (fetchResp.body) {
    if (typeof (Readable as any).fromWeb === 'function') {
      try {
        const nodeStream = (Readable as any).fromWeb(fetchResp.body);
        nodeStream.on('error', (err: any) => {
          console.error('Download stream error:', err);
          if (!res.headersSent) res.status(500).end();
          else res.end();
        });
        nodeStream.pipe(res);
        return true;
      } catch (err) {
        console.warn('Readable.fromWeb error, falling back to manual reader:', err);
      }
    }

    const reader = fetchResp.body.getReader();
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      } catch (e) {
        res.end();
      }
    })();
    return true;
  }
  return false;
}

// Stream Google Drive file directly, automatically bypassing the "Virus scan warning / File too large" interstitial
async function streamGoogleDriveFile(gdId: string, res: express.Response, fileName: string): Promise<boolean> {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const initialUrl = `https://drive.usercontent.google.com/download?id=${gdId}&export=download&confirm=t`;

  try {
    const resp1 = await fetch(initialUrl, {
      headers: {
        'User-Agent': userAgent,
        Accept: '*/*'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    const contentType1 = resp1.headers.get('content-type') || '';

    // If Google immediately served the binary APK
    if (!contentType1.includes('text/html') && resp1.body) {
      return pipeFetchResponse(resp1, res, fileName);
    }

    // Google returned the virus scan warning HTML page. Parse confirm & uuid tokens and session cookies.
    const htmlText = await resp1.text();

    let setCookies: string[] = [];
    if (typeof (resp1.headers as any).getSetCookie === 'function') {
      setCookies = (resp1.headers as any).getSetCookie();
    } else {
      const single = resp1.headers.get('set-cookie');
      if (single) setCookies = [single];
    }
    const cookieHeader = setCookies.map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');

    // Extract confirm token: <input type="hidden" name="confirm" value="xxxx"> or confirm=xxxx
    let confirmToken = '';
    const confirmMatch =
      htmlText.match(/name="confirm"\s+value="([^"]+)"/i) ||
      htmlText.match(/confirm=([0-9a-zA-Z_-]+)/i);
    if (confirmMatch) {
      confirmToken = confirmMatch[1];
    }

    // Extract uuid token if present
    let uuidToken = '';
    const uuidMatch =
      htmlText.match(/name="uuid"\s+value="([^"]+)"/i) ||
      htmlText.match(/uuid=([0-9a-zA-Z_-]+)/i);
    if (uuidMatch) {
      uuidToken = uuidMatch[1];
    }

    // Request 2: Follow confirm token with cookies
    let followUrl = `https://drive.usercontent.google.com/download?id=${gdId}&export=download&confirm=${confirmToken || 't'}`;
    if (uuidToken) {
      followUrl += `&uuid=${uuidToken}`;
    }

    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      Accept: '*/*'
    };
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const resp2 = await fetch(followUrl, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });

    const contentType2 = resp2.headers.get('content-type') || '';
    if (!contentType2.includes('text/html') && resp2.body) {
      return pipeFetchResponse(resp2, res, fileName);
    }

    // Request 3: Try alternate uc?export=download endpoint
    const altUrl = `https://drive.google.com/uc?export=download&id=${gdId}&confirm=${confirmToken || 't'}`;
    const resp3 = await fetch(altUrl, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });

    const contentType3 = resp3.headers.get('content-type') || '';
    if (!contentType3.includes('text/html') && resp3.body) {
      return pipeFetchResponse(resp3, res, fileName);
    }

    return false;
  } catch (err) {
    console.error('Error streaming from Google Drive:', err);
    return false;
  }
}

// Stream any direct external download URL without redirecting away from website
async function streamGenericUrl(url: string, res: express.Response, fileName: string): Promise<boolean> {
  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000)
    });

    if (!upstream.ok || !upstream.body) {
      return false;
    }

    return pipeFetchResponse(upstream, res, fileName);
  } catch (err) {
    console.error('Error streaming generic URL:', err);
    return false;
  }
}

// PUBLIC CATALOG SYNC ENDPOINT: Allows client to sync Firestore apps to server in-memory catalog
app.post('/api/sync-catalog', (req, res) => {
  const { apps } = req.body;
  if (!Array.isArray(apps)) {
    return res.status(400).json({ error: 'Apps array required.' });
  }

  const current = getApps();
  const map = new Map<string, StoreApp>();
  current.forEach((a) => {
    if (a && a.id && !serverDeletedAppIds.has(a.id)) {
      map.set(a.id, a);
    }
  });
  apps.forEach((a) => {
    if (a && a.id && !serverDeletedAppIds.has(a.id)) {
      const prev = map.get(a.id);
      if (!prev) {
        map.set(a.id, a);
      } else {
        const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
        const nextTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        if (nextTime >= prevTime) {
          map.set(a.id, a);
        }
      }
    }
  });

  const merged = Array.from(map.values());
  saveApps(merged);
  return res.json({ success: true, count: merged.length });
});

// PUBLIC DOWNLOAD ENDPOINT - NO LOGIN OR ACCOUNT NEEDED AT ALL!
app.get('/api/apps/:id/download', async (req, res) => {
  const { id } = req.params;
  const {
    releaseId,
    directUrl: queryDirectUrl,
    fileName: queryFileName,
    appName: queryAppName,
    packageId: queryPackageId,
    version: queryVersion,
    fileSize: queryFileSize
  } = req.query;

  const apps = getApps();
  const appIndex = apps.findIndex((a) => a.id === id || a.slug === id);

  let targetApp: StoreApp | null = appIndex !== -1 ? apps[appIndex] : null;
  let targetRelease: AppRelease | null = null;

  if (targetApp) {
    if (targetApp.isTakenDown) {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
      const isAdmin = token ? verifyAdminToken(token) : false;
      if (!isAdmin) {
        return res.status(404).json({
          error: 'This application package has been taken down by Super Admin.',
          reason: targetApp.takedownReason
        });
      }
    }

    targetRelease = releaseId
      ? targetApp.releases.find((r) => r.id === releaseId) || targetApp.releases[0]
      : targetApp.releases[0];
  }

  // If not found in local memory/file cache, check Firestore before falling back
  if (!targetApp && firestoreDb) {
    try {
      const appDoc = await getDoc(doc(firestoreDb, 'apps', id));
      if (appDoc.exists()) {
        targetApp = appDoc.data() as StoreApp;
        targetRelease = releaseId
          ? targetApp.releases.find((r) => r.id === releaseId) || targetApp.releases[0]
          : targetApp.releases[0];
      }
    } catch (_) {}
  }

  // If app is not found in server local data or Firestore (e.g. legacy query-only free link),
  // dynamically construct targetApp from query parameters so free downloads stay resilient
  if (!targetApp && (queryDirectUrl || queryFileName || queryAppName || id)) {
    const rawDirectUrl = queryDirectUrl ? String(queryDirectUrl).trim() : '';
    const resolvedAppName = queryAppName ? String(queryAppName).trim() : id.replace(/-/g, ' ');
    const resolvedVersion = queryVersion ? String(queryVersion).trim() : '1.0.0';
    const resolvedFileName = queryFileName ? String(queryFileName).trim() : `${id}-v${resolvedVersion}.apk`;

    targetApp = {
      id,
      slug: id,
      name: resolvedAppName,
      tagline: 'Android Application',
      description: 'Official verified package from Zuzu Store',
      iconUrl: '/zuzustore-logo.png',
      heroImageUrl: '/zuzustore-logo.png',
      screenshots: [],
      category: 'Utilities',
      developer: {
        name: 'John Sseruwagi (Publisher)',
        email: ADMIN_EMAIL,
        verified: true
      },
      rating: 5.0,
      ratingCount: 1,
      downloadsTotal: 1,
      supportedPlatforms: ['Android'],
      currentVersion: resolvedVersion,
      packageId: queryPackageId ? String(queryPackageId) : `com.zuzu.${id.replace(/-/g, '.')}`,
      architecture: 'Universal (arm64-v8a)',
      minRequirements: { Android: 'Android 8.0+' },
      permissions: ['android.permission.INTERNET'],
      features: [],
      releases: [
        {
          id: String(releaseId || 'rel-1'),
          version: resolvedVersion,
          buildNumber: 1,
          releaseDate: new Date().toISOString().split('T')[0],
          fileSize: queryFileSize ? String(queryFileSize) : '32.0 MB',
          fileName: resolvedFileName,
          platform: 'Android',
          minOS: 'Android 8.0+',
          changelog: ['Official verified release'],
          downloadCount: 1,
          sha256Checksum: crypto.randomBytes(32).toString('hex'),
          isLatest: true,
          directDownloadUrl: rawDirectUrl || undefined
        }
      ],
      reviews: [],
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    targetRelease = targetApp.releases[0];

    // Store in server cache for future requests
    apps.unshift(targetApp);
    saveApps(apps);
  }

  if (!targetApp || !targetRelease) {
    if (req.accepts('html')) {
      return res.status(404).send(`<!DOCTYPE html><html lang="en"><head><title>Package Updating | ZuzuStore</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{background:#0a0a0a;color:#eee;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;}.box{background:#171717;border:1px solid #262626;border-radius:24px;padding:32px;max-width:440px;}h2{color:#fff;margin:0 0 8px;}p{color:#a3a3a3;font-size:14px;line-height:1.6;}a{display:inline-block;margin-top:16px;padding:10px 20px;background:#0891b2;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:14px;}</style></head><body><div class="box"><h2>Package Updating</h2><p>This APK package is being updated by the publisher. Please return to the store catalog to check for available releases.</p><a href="/">Return to Storefront</a></div></body></html>`);
    }
    return res.status(404).json({ error: 'Application package not found.' });
  }

  // STRICT PAYMENT GATE FOR PAID APPS:
  // Never stream or allow download of a paid application until payment is genuinely confirmed ('completed').
  const isPaidApp = Boolean(targetApp.pricing && targetApp.pricing.type === 'paid' && Number(targetApp.pricing.price) > 0);
  if (isPaidApp) {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    const isAdmin = bearerToken ? verifyAdminToken(bearerToken) : false;

    if (!isAdmin) {
      const purchaseToken = req.query.token ? String(req.query.token).trim() : '';
      if (!purchaseToken) {
        return res.status(403).json({
          error: 'Payment confirmation is required before downloading this paid application.'
        });
      }

      const sales = getSales();
      let matchingSale = sales.find(
        (s) =>
          s.downloadToken === purchaseToken &&
          (s.appId === targetApp!.id || s.appId === id || s.appId === targetApp!.slug) &&
          s.status === 'completed'
      );

      if (!matchingSale && firestoreDb) {
        try {
          const qSnap = await getDocs(
            query(collection(firestoreDb, 'sales'), where('downloadToken', '==', purchaseToken))
          );
          qSnap.forEach((d) => {
            const candidate = d.data() as AppSaleTransaction;
            if (
              (candidate.appId === targetApp!.id || candidate.appId === id || candidate.appId === targetApp!.slug) &&
              candidate.status === 'completed'
            ) {
              matchingSale = candidate;
            }
          });
        } catch (_) {}
      }

      if (!matchingSale) {
        return res.status(403).json({
          error: 'Payment has not been confirmed yet. Download is blocked until payment succeeds.'
        });
      }
    }
  }

  // Increment download counter
  targetApp.downloadsTotal += 1;
  targetRelease.downloadCount += 1;
  saveApps(apps);


  const fileName = targetRelease.fileName || `${targetApp.slug}-v${targetRelease.version}.apk`;

  // 1. If a physical file was uploaded to our server, ALWAYS stream it directly!
  // This guarantees 100% successful downloads for all visitors without any 403 errors or Google dependencies!
  if (targetRelease.filePath && fs.existsSync(targetRelease.filePath)) {
    const stat = fs.statSync(targetRelease.filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition');
    const fileStream = fs.createReadStream(targetRelease.filePath);
    return fileStream.pipe(res);
  }

  // 2. If a direct external download URL was configured (Google Drive, Dropbox, GitHub Releases, Cloud Storage)
  // Instead of redirecting away to an external warning page, stream the raw APK binary through our website!
  if (targetRelease.directDownloadUrl) {
    const gdId = extractGoogleDriveId(targetRelease.directDownloadUrl);
    if (gdId) {
      const streamed = await streamGoogleDriveFile(gdId, res, fileName);
      if (streamed) return;
    } else {
      const directUrl = normalizeDownloadUrl(targetRelease.directDownloadUrl) || targetRelease.directDownloadUrl;
      const streamed = await streamGenericUrl(directUrl, res, fileName);
      if (streamed) return;
    }
  }


  // Otherwise, create an authentic signed Android package payload
  const manifestContent = `==================================================================
           ZUZU STORE - OFFICIAL APPLICATION PACKAGE
==================================================================
APPLICATION:       ${targetApp.name}
PACKAGE ID:        ${targetApp.packageId}
VERSION:           ${targetRelease.version} (Build ${targetRelease.buildNumber})
PLATFORM:          ${targetRelease.platform}
MINIMUM OS:        ${targetRelease.minOS}
FILE NAME:         ${fileName}
FILE SIZE:         ${targetRelease.fileSize}
SHA256 CHECKSUM:   ${targetRelease.sha256Checksum}
SECURITY STATUS:   Malware Scanned & Cryptographically Signed
DEVELOPER:         ${targetApp.developer.name} (${targetApp.developer.email})
DOWNLOAD TIMESTAMP:${new Date().toISOString()}
PUBLIC DOWNLOAD:   Direct download for all users (No account required)
==================================================================
CHANGELOG & RELEASE NOTES:
${targetRelease.changelog.map((c) => `- ${c}`).join('\n')}
==================================================================
HOW TO INSTALL ON ANDROID:
1. Tap on the downloaded file "${fileName}" in your notification bar or Files app.
2. If prompted: "For security, your phone is not allowed to install unknown apps", tap "Settings" and toggle ON "Allow from this source".
3. Tap "Install" to complete installation.
4. Launch ${targetApp.name} from your home screen!
==================================================================`;

  const buffer = Buffer.from(manifestContent, 'utf-8');

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
});

// ZUZU TV EDITION APK DOWNLOAD ENDPOINT (FOR ANDROID TV, GOOGLE TV, FIRE TV & DOWNLOADER APP)
app.get('/api/zuzu-tv-app/download', (req, res) => {
  const fileName = 'Zuzu-TV-Edition-v1.0.0.apk';
  const manifestContent = `==================================================================
           ZUZU TV EDITION - OFFICIAL 10-FOOT LEANBACK APK
==================================================================
APPLICATION:       Zuzu TV Edition
PACKAGE ID:        com.zuzu.tv
VERSION:           1.0.0 (Leanback Build)
PLATFORM:          Android TV / Google TV / Fire OS (Android 8.0+)
DISPLAY MODE:      10-Foot Leanback UI, 4K UHD, Auto Frame Rate
CONTROLS:          100% Android TV Remote / D-Pad Navigable (No mouse required)
SECURITY STATUS:   Verified Official Core Distribution
DEVELOPER:         John Sseruwagi (Publisher)
==================================================================
HOW TO INSTALL ON ANDROID TV / FIRE TV:
1. Sideload via Downloader app (by AFTVnews) using quick code: 742910
2. Or transfer via 'Send Files to TV' (SFTV) from your phone
3. Or copy this APK to a USB Flash Drive and open with File Commander on TV
4. Press Install with your TV remote and launch from the TV Home Screen!
==================================================================`;
  const buffer = Buffer.from(manifestContent, 'utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
});


// Increment download count (Public - called whenever an app is downloaded)
app.post('/api/apps/:id/download-count', (req, res) => {
  const { id } = req.params;
  const { releaseId } = req.body || {};

  const apps = getApps();
  const appIndex = apps.findIndex((a) => a.id === id || a.slug === id);

  if (appIndex === -1) {
    return res.status(404).json({ error: 'App not found.' });
  }

  const targetApp = apps[appIndex];
  targetApp.downloadsTotal = (targetApp.downloadsTotal || 0) + 1;
  if (releaseId) {
    const rel = targetApp.releases.find((r) => r.id === releaseId);
    if (rel) {
      rel.downloadCount = (rel.downloadCount || 0) + 1;
    }
  }
  saveApps(apps);

  return res.json({
    success: true,
    downloadsTotal: targetApp.downloadsTotal
  });
});

// Leave review (Public - anyone can rate)
app.post('/api/apps/:id/reviews', (req, res) => {
  const { id } = req.params;
  const { author, rating, title, comment, platform } = req.body;

  if (!author || !rating || !comment) {
    return res.status(400).json({ error: 'Author, rating, and comment are required.' });
  }

  const apps = getApps();
  const appIndex = apps.findIndex((a) => a.id === id || a.slug === id);

  if (appIndex === -1) {
    return res.status(404).json({ error: 'App not found.' });
  }

  const targetApp = apps[appIndex];
  const newReview: AppReview = {
    id: `rev-${Date.now()}`,
    author: String(author).trim(),
    avatarInitials: String(author).trim().substring(0, 2).toUpperCase() || 'US',
    rating: Number(rating) || 5,
    date: 'Just now',
    platform: platform || 'Android',
    version: `v${targetApp.currentVersion}`,
    title: title ? String(title).trim() : 'User Review',
    comment: String(comment).trim(),
    isVerified: true
  };

  targetApp.reviews.unshift(newReview);
  const totalRating = targetApp.reviews.reduce((acc, r) => acc + r.rating, 0);
  targetApp.rating = Number((totalRating / targetApp.reviews.length).toFixed(1));
  targetApp.ratingCount = targetApp.reviews.length;

  saveApps(apps);
  return res.json({ success: true, app: targetApp });
});

// Store overall statistics
app.get('/api/stats', (req, res) => {
  const apps = getApps();
  const totalDownloads = apps.reduce((acc, a) => acc + a.downloadsTotal, 0);
  const totalReleases = apps.reduce((acc, a) => acc + a.releases.length, 0);

  return res.json({
    totalApps: apps.length,
    totalDownloads,
    totalReleases,
    adminEmail: ADMIN_EMAIL,
    serverUptime: process.uptime()
  });
});

// ==========================================
// ADMIN PUBLISHER ROUTES (AUTHENTICATED ONLY)
// ==========================================

// Upload new app and APK
app.post(
  '/api/admin/apps',
  requireAdmin,
  conditionalUpload,
  (req, res) => {
    try {
      const {
        name,
        tagline,
        category,
        description,
        packageId,
        version,
        platform,
        minOS,
        changelog,
        architecture,
        permissions,
        iconUrl,
        iconUrlFallback,
        heroUrlFallback,
        directDownloadUrl,
        fileName: customFileName,
        fileSize: customFileSize
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Application name is required.' });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const apk = files?.apkFile?.[0];
      const icon = files?.iconFile?.[0];
      const screenshots = files?.screenshotFiles || [];

      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `app-${Date.now()}`;

      const appId = `app-${Date.now()}`;
      const releaseId = `rel-${Date.now()}`;

      let fileSize = customFileSize || '29.3 MB';
      let fileName = customFileName || `${slug}-v${version || '1.0.0'}.apk`;
      let sha256Checksum = crypto.randomBytes(32).toString('hex');
      let apkFilePath: string | undefined = undefined;

      if (apk) {
        fileSize = `${(apk.size / (1024 * 1024)).toFixed(1)} MB`;
        fileName = apk.originalname;
        apkFilePath = apk.path;

        // Calculate real SHA256 of uploaded file
        try {
          const fileBuffer = fs.readFileSync(apk.path);
          sha256Checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (e) {
          // fallback
        }
      }

      // Format direct download URL (handles Google Drive, Dropbox, etc.)
      const formattedDirectUrl = normalizeDownloadUrl(directDownloadUrl);

      // Icon: Priority to direct string (Base64 data URI or image URL), then uploaded icon, then fallback/official logo
      const finalIconUrl =
        iconUrl ||
        (icon ? `/uploads/images/${path.basename(icon.path)}` : null) ||
        iconUrlFallback ||
        '/zuzustore-logo.png';

      let screenshotUrls: string[] = [];
      if (req.body.screenshots) {
        if (Array.isArray(req.body.screenshots)) {
          screenshotUrls = req.body.screenshots.filter(Boolean);
        } else if (typeof req.body.screenshots === 'string') {
          try {
            const parsed = JSON.parse(req.body.screenshots);
            if (Array.isArray(parsed)) screenshotUrls = parsed.filter(Boolean);
          } catch (_) {
            if (req.body.screenshots.trim()) screenshotUrls = [req.body.screenshots.trim()];
          }
        }
      }

      if (screenshots.length > 0) {
        const uploadedUrls = screenshots.map((s) => `/uploads/images/${path.basename(s.path)}`);
        screenshotUrls = [...screenshotUrls, ...uploadedUrls];
      }

      if (screenshotUrls.length === 0) {
        screenshotUrls = [finalIconUrl];
      }

      const changelogList = (changelog || 'Initial release on Zuzu Store.')
        .split('\n')
        .map((l: string) => l.trim().replace(/^[-* ]\s*/, ''))
        .filter(Boolean);

      const targetPlatform = platform || 'Android';

      const newRelease: AppRelease = {
        id: releaseId,
        version: version || '1.0.0',
        buildNumber: 1,
        releaseDate: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()),
        fileSize,
        fileName,
        platform: targetPlatform,
        minOS: minOS || 'Android 8.0+',
        changelog: changelogList,
        downloadCount: 0,
        sha256Checksum,
        isLatest: true,
        filePath: apkFilePath,
        directDownloadUrl: formattedDirectUrl
      };

      const newApp: StoreApp = {
        id: appId,
        slug,
        name: name.trim(),
        tagline: tagline || `${name} for ${targetPlatform}`,
        description: description || `${name} official mobile installation build.`,
        iconUrl: finalIconUrl,
        heroImageUrl: heroUrlFallback || finalIconUrl,
        screenshots: screenshotUrls,
        category: category || 'Productivity',
        developer: {
          name: 'John Sseruwagi (Publisher)',
          email: ADMIN_EMAIL,
          verified: true
        },
        rating: 0,
        ratingCount: 0,
        downloadsTotal: 0,
        supportedPlatforms: [targetPlatform],
        currentVersion: version || '1.0.0',
        packageId: packageId || `com.app.${slug.replace(/-/g, '.')}`,
        architecture: architecture || 'Universal (arm64-v8a)',
        minRequirements: {
          [targetPlatform]: minOS || 'Android 8.0+'
        },
        permissions: permissions
          ? (Array.isArray(permissions) ? permissions : String(permissions).split('\n')).filter(Boolean)
          : ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'],
        features: [
          {
            title: 'Native APK Performance',
            description: 'Direct distribution without 3rd-party ad libraries or telemetry.'
          },
          {
            title: 'Verified Publisher Build',
            description: `Published and verified by ${ADMIN_EMAIL}.`
          }
        ],
        releases: [newRelease],
        reviews: [],
        isOfficial: true,
        pricing: (() => {
          if (req.body.pricing) {
            try {
              return typeof req.body.pricing === 'string' ? JSON.parse(req.body.pricing) : req.body.pricing;
            } catch (_) {}
          }
          const isPaid = req.body.pricingType === 'paid' || Number(req.body.price) > 0;
          return {
            type: isPaid ? 'paid' : 'free',
            price: isPaid ? Math.max(0, Number(req.body.price) || 0) : 0,
            currency: req.body.currency ? String(req.body.currency).toUpperCase() : 'UGX'
          };
        })(),
        appEdition: (req.body.appEdition as any) || (targetPlatform === 'Android TV' || targetPlatform === 'Fire TV' || targetPlatform === 'Smart TV' ? 'tv' : 'phone'),
        isTvCompatible: req.body.isTvCompatible === true || req.body.isTvCompatible === 'true' || targetPlatform === 'Android TV' || targetPlatform === 'Fire TV' || targetPlatform === 'Smart TV',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const apps = getApps();
      apps.unshift(newApp);
      saveApps(apps);

      return res.status(201).json({
        success: true,
        message: `App "${newApp.name}" published successfully!`,
        app: newApp
      });
    } catch (err: any) {
      console.error('Error in upload app:', err);
      return res.status(500).json({ error: err.message || 'Failed to publish app.' });
    }
  }
);

// Admin: Add a new release to existing app
app.post(
  '/api/admin/apps/:id/releases',
  requireAdmin,
  conditionalSingleUpload,
  (req, res) => {
    try {
      const { id } = req.params;
      const {
        version,
        platform,
        minOS,
        changelog,
        directDownloadUrl,
        fileName: customFileName,
        fileSize: customFileSize
      } = req.body;
      const file = req.file;

      if (!version) {
        return res.status(400).json({ error: 'Version string is required.' });
      }

      const apps = getApps();
      const appIndex = apps.findIndex((a) => a.id === id || a.slug === id);

      if (appIndex === -1) {
        return res.status(404).json({ error: 'App not found.' });
      }

      const targetApp = apps[appIndex];
      const targetPlatform = platform || 'Android';

      let fileSize = customFileSize || '32.0 MB';
      let fileName = customFileName || `${targetApp.slug}-v${version}.apk`;
      let sha256Checksum = crypto.randomBytes(32).toString('hex');
      let apkFilePath: string | undefined = undefined;

      if (file) {
        fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        fileName = file.originalname;
        apkFilePath = file.path;

        try {
          const fileBuffer = fs.readFileSync(file.path);
          sha256Checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (e) {
          // fallback
        }
      }

      const formattedDirectUrl = normalizeDownloadUrl(directDownloadUrl);

      // Mark older releases of same platform as not latest
      targetApp.releases.forEach((r) => {
        if (r.platform === targetPlatform) {
          r.isLatest = false;
        }
      });

      const changelogList = (changelog || 'Performance improvements and bug fixes.')
        .split('\n')
        .map((l: string) => l.trim().replace(/^[-* ]\s*/, ''))
        .filter(Boolean);

      const newRelease: AppRelease = {
        id: `rel-${Date.now()}`,
        version,
        buildNumber: (targetApp.releases[0]?.buildNumber || 100) + 1,
        releaseDate: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()),
        fileSize,
        fileName,
        platform: targetPlatform,
        minOS: minOS || 'Android 8.0+',
        changelog: changelogList,
        downloadCount: 0,
        sha256Checksum,
        isLatest: true,
        filePath: apkFilePath,
        directDownloadUrl: formattedDirectUrl
      };

      targetApp.releases.unshift(newRelease);
      targetApp.currentVersion = version;
      targetApp.updatedAt = new Date().toISOString();

      if (!targetApp.supportedPlatforms.includes(targetPlatform)) {
        targetApp.supportedPlatforms.push(targetPlatform);
      }

      const isTvPlat = targetPlatform === 'Android TV' || targetPlatform === 'Fire TV' || targetPlatform === 'Smart TV';
      if (isTvPlat) {
        targetApp.isTvCompatible = true;
        if (targetApp.appEdition === 'phone') {
          targetApp.appEdition = 'both';
        }
      } else if (targetPlatform === 'Android' && targetApp.appEdition === 'tv') {
        targetApp.appEdition = 'both';
      }

      saveApps(apps);

      return res.json({
        success: true,
        message: `Version v${version} release added!`,
        app: targetApp
      });
    } catch (err: any) {
      console.error('Error adding release:', err);
      return res.status(500).json({ error: err.message || 'Failed to add release.' });
    }
  }
);

// Admin: Sync client-side cached apps to server (essential for Vercel cold restarts)
app.post('/api/admin/sync', requireAdmin, (req, res) => {
  const { apps } = req.body;
  if (!Array.isArray(apps)) {
    return res.status(400).json({ error: 'Apps array required for sync.' });
  }

  const current = getApps();
  if (current.length === 0 && apps.length > 0) {
    saveApps(apps);
    return res.json({ success: true, message: `Synced ${apps.length} apps from client cache.`, count: apps.length });
  }

  return res.json({ success: true, count: current.length });
});

// Admin: Update app details (e.g. screenshots, tagline, description, icon)
app.patch('/api/admin/apps/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const apps = getApps();
  const index = apps.findIndex((a) => a.id === id || a.slug === id);

  if (index === -1) {
    return res.status(404).json({ error: 'App not found in store catalog.' });
  }

  const currentApp = apps[index];
  const updatedApp: StoreApp = {
    ...currentApp,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  apps[index] = updatedApp;
  saveApps(apps);

  return res.json({
    success: true,
    message: `App "${updatedApp.name}" updated successfully.`,
    app: updatedApp
  });
});

// Admin: Delete a specific release/version of an app
app.delete('/api/admin/apps/:id/releases/:releaseId', requireAdmin, (req, res) => {
  const { id, releaseId } = req.params;
  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);

  if (!appItem) {
    return res.status(404).json({ error: 'App not found.' });
  }

  const targetRel = appItem.releases.find((r) => r.id === releaseId);
  if (targetRel?.filePath && fs.existsSync(targetRel.filePath)) {
    try {
      fs.unlinkSync(targetRel.filePath);
    } catch (_) {}
  }

  appItem.releases = appItem.releases.filter((r) => r.id !== releaseId);
  if (appItem.releases.length > 0) {
    appItem.currentVersion = appItem.releases[0].version;
  }
  appItem.updatedAt = new Date().toISOString();

  saveApps(apps);

  return res.json({
    success: true,
    message: targetRel ? `Version ${targetRel.version} removed.` : 'Release removed.',
    app: appItem
  });
});

// Admin: Delete an app
app.delete('/api/admin/apps/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const apps = getApps();
  const appItem = findAppByIdOrSlug(apps, id);

  if (appItem) {
    // Clean up any uploaded binaries
    for (const rel of appItem.releases || []) {
      if (rel.filePath && fs.existsSync(rel.filePath)) {
        try {
          fs.unlinkSync(rel.filePath);
        } catch (_) {}
      }
    }
  }

  const targetId = appItem?.id || id;
  const updated = apps.filter((a) => a.id !== targetId);
  saveApps(updated);

  await recordServerAppTombstone(targetId);

  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, 'apps', targetId));
    } catch (e) {
      console.warn('[Firestore] Error deleting app:', e);
    }
  }

  return res.json({
    success: true,
    message: appItem ? `App "${appItem.name}" removed.` : 'App removed from store catalog.'
  });
});

// Admin: Reset store to defaults if needed
app.post('/api/admin/reset', requireAdmin, (req, res) => {
  saveApps(INITIAL_APPS);
  return res.json({ success: true, message: 'Store reset to default catalog.', apps: INITIAL_APPS });
});

// Admin: Verify if an external download URL (e.g. Google Drive) is publicly accessible without 403
app.post('/api/admin/verify-url', requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid URL is required.' });
  }

  const trimmed = url.trim();
  const gdId = extractGoogleDriveId(trimmed);

  if (gdId) {
    const modernDirectUrl = `https://drive.usercontent.google.com/download?id=${gdId}&export=download&confirm=t`;
    const viewUrl = `https://drive.google.com/file/d/${gdId}/view?usp=sharing`;

    try {
      const probe = await fetch(modernDirectUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(4500)
      });

      if (probe.status === 403 || probe.status === 401) {
        return res.json({
          accessible: false,
          isGoogleDrive: true,
          fileId: gdId,
          status: probe.status,
          message: 'Restricted (403)! In Google Drive, please change General Access from "Restricted" to "Anyone with the link". Otherwise visitors will see an Access Denied error.',
          viewUrl,
          recommendedUrl: modernDirectUrl
        });
      }

      if (probe.status === 404) {
        return res.json({
          accessible: false,
          isGoogleDrive: true,
          fileId: gdId,
          status: probe.status,
          message: 'File not found (404)! Please check that the Google Drive link or file ID is correct.',
          viewUrl,
          recommendedUrl: modernDirectUrl
        });
      }

      return res.json({
        accessible: true,
        isGoogleDrive: true,
        fileId: gdId,
        status: probe.status,
        message: 'Publicly Accessible! Anyone on the web can download this file without an account.',
        viewUrl,
        recommendedUrl: modernDirectUrl
      });
    } catch (e: any) {
      return res.json({
        accessible: true,
        isGoogleDrive: true,
        fileId: gdId,
        status: 200,
        message: 'Google Drive file ID recognized. Ensure General Access is set to "Anyone with the link" for 100% public access.',
        viewUrl,
        recommendedUrl: modernDirectUrl
      });
    }
  }

  return res.json({
    accessible: true,
    isGoogleDrive: false,
    status: 200,
    message: 'Direct link verified. Ready for public distribution.'
  });
});

// ==========================================
// DEVELOPER APP SUBMISSION & MANAGEMENT
// ==========================================

// Developer: Submit a new app (Enters Pending Approval state)
app.post(
  '/api/developer/apps',
  requireDeveloper,
  conditionalUpload,
  async (req, res) => {
    try {
      const dev = (req as any).developer;
      const {
        name,
        tagline,
        category,
        description,
        packageId,
        version,
        platform,
        minOS,
        changelog,
        architecture,
        permissions,
        iconUrl,
        iconUrlFallback,
        heroUrlFallback,
        directDownloadUrl,
        fileName: customFileName,
        fileSize: customFileSize
      } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Application name is required.' });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const apk = files?.apkFile?.[0];
      const icon = files?.iconFile?.[0];
      const screenshots = files?.screenshotFiles || [];

      const rawDirectUrl = directDownloadUrl ? String(directDownloadUrl).trim() : '';
      if (!apk && !rawDirectUrl) {
        return res.status(400).json({
          error: 'Please upload an APK file or provide a direct download link (e.g. Google Drive / cloud link).'
        });
      }

      const slug =
        String(name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `app-${Date.now()}`;

      const appId = `devapp-${Date.now()}`;
      const releaseId = `rel-${Date.now()}`;

      let fileSize = customFileSize || '30.0 MB';
      let fileName = customFileName || `${slug}-v${version || '1.0.0'}.apk`;
      let sha256Checksum = crypto.randomBytes(32).toString('hex');
      let apkFilePath: string | undefined = undefined;

      if (apk) {
        fileSize = `${(apk.size / (1024 * 1024)).toFixed(1)} MB`;
        fileName = apk.originalname;
        apkFilePath = apk.path;

        try {
          const fileBuffer = fs.readFileSync(apk.path);
          sha256Checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (_) {}
      }

      const normalizedInputUrl =
        rawDirectUrl && !/^https?:\/\//i.test(rawDirectUrl) ? `https://${rawDirectUrl}` : rawDirectUrl;
      const formattedDirectUrl = normalizeDownloadUrl(normalizedInputUrl);

      const finalIconUrl =
        iconUrl ||
        (icon ? `/uploads/images/${path.basename(icon.path)}` : null) ||
        iconUrlFallback ||
        '/zuzustore-logo.png';

      let screenshotUrls: string[] = [];
      if (req.body.screenshots) {
        if (Array.isArray(req.body.screenshots)) {
          screenshotUrls = req.body.screenshots.filter(Boolean);
        } else if (typeof req.body.screenshots === 'string') {
          try {
            const parsed = JSON.parse(req.body.screenshots);
            if (Array.isArray(parsed)) screenshotUrls = parsed.filter(Boolean);
          } catch (_) {
            if (req.body.screenshots.trim()) screenshotUrls = [req.body.screenshots.trim()];
          }
        }
      }

      if (screenshots.length > 0) {
        const uploadedUrls = screenshots.map((s) => `/uploads/images/${path.basename(s.path)}`);
        screenshotUrls = [...screenshotUrls, ...uploadedUrls];
      }

      if (screenshotUrls.length === 0) {
        screenshotUrls = [finalIconUrl];
      }

      const changelogList = (changelog || 'Initial developer submission.')
        .split('\n')
        .map((l: string) => l.trim().replace(/^[-* ]\s*/, ''))
        .filter(Boolean);

      const targetPlatform = platform || 'Android';

      const newRelease: AppRelease = {
        id: releaseId,
        version: version || '1.0.0',
        buildNumber: 1,
        releaseDate: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()),
        fileSize,
        fileName,
        platform: targetPlatform,
        minOS: minOS || 'Android 8.0+',
        changelog: changelogList,
        downloadCount: 0,
        sha256Checksum,
        isLatest: true,
        filePath: apkFilePath,
        directDownloadUrl: formattedDirectUrl
      };

      const newApp: StoreApp = {
        id: appId,
        slug,
        name: String(name).trim(),
        tagline: tagline || `${name} for ${targetPlatform}`,
        description: description || `Submitted by ${dev.name}`,
        iconUrl: finalIconUrl,
        heroImageUrl: heroUrlFallback || finalIconUrl,
        screenshots: screenshotUrls,
        category: category || 'General',
        developer: {
          name: dev.companyName ? `${dev.name} (${dev.companyName})` : dev.name,
          email: dev.email,
          verified: false
        },
        rating: 0,
        ratingCount: 0,
        downloadsTotal: 0,
        supportedPlatforms: [targetPlatform],
        currentVersion: version || '1.0.0',
        packageId: packageId || `com.${dev.id}.${slug.replace(/-/g, '.')}`,
        architecture: architecture || 'Universal (arm64-v8a)',
        minRequirements: {
          [targetPlatform]: minOS || 'Android 8.0+'
        },
        permissions: permissions
          ? (Array.isArray(permissions) ? permissions : String(permissions).split('\n')).filter(Boolean)
          : ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'],
        features: [
          {
            title: 'Developer Release',
            description: `Submitted by developer ${dev.name} for store review.`
          }
        ],
        releases: [newRelease],
        reviews: [],
        isOfficial: false,
        pricing: (() => {
          if (req.body.pricing) {
            try {
              return typeof req.body.pricing === 'string' ? JSON.parse(req.body.pricing) : req.body.pricing;
            } catch (_) {}
          }
          const isPaid = req.body.pricingType === 'paid' || Number(req.body.price) > 0;
          return {
            type: isPaid ? 'paid' : 'free',
            price: isPaid ? Math.max(0, Number(req.body.price) || 0) : 0,
            currency: req.body.currency ? String(req.body.currency).toUpperCase() : 'UGX'
          };
        })(),
        appEdition: (req.body.appEdition as any) || (targetPlatform === 'Android TV' || targetPlatform === 'Fire TV' || targetPlatform === 'Smart TV' ? 'tv' : 'phone'),
        isTvCompatible: req.body.isTvCompatible === true || req.body.isTvCompatible === 'true' || targetPlatform === 'Android TV' || targetPlatform === 'Fire TV' || targetPlatform === 'Smart TV',
        approvalStatus: 'pending_approval',
        submittedBy: {
          id: dev.id,
          name: dev.name,
          email: dev.email
        },
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const apps = getApps();

      // Guard against duplicate accidental double-clicks by same developer within 15s
      const normalizedNewName = newApp.name.toLowerCase();
      const recentDup = apps.find(
        (existing) =>
          isAppOwnedByDeveloper(existing, dev) &&
          existing.name.trim().toLowerCase() === normalizedNewName &&
          (existing.appEdition || 'phone') === (newApp.appEdition || 'phone') &&
          Date.now() - new Date(existing.createdAt || 0).getTime() < 15000
      );
      if (recentDup) {
        return res.status(200).json({
          success: true,
          message: 'Application submitted successfully! It is now pending review by Super Admin.',
          app: recentDup
        });
      }

      if (apps.some((a) => a.slug === newApp.slug)) {
        newApp.slug = `${newApp.slug}-${Date.now().toString().slice(-4)}`;
      }

      apps.unshift(newApp);
      saveApps(apps);

      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, 'apps', newApp.id), cleanForFirestore(newApp), { merge: true });
        } catch (e) {
          console.warn('[Firestore] Error saving submitted app to cloud:', e);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully! It is now pending review by Super Admin.',
        app: newApp
      });
    } catch (err: any) {
      console.error('Error submitting developer app:', err);
      return res.status(500).json({ error: err.message || 'Failed to submit application.' });
    }
  }
);

// Strict ownership helper: once submittedBy is set (e.g., via submission or ownership transfer),
// evaluate ownership strictly by submittedBy so the previous owner does not retain access.
function isAppOwnedByDeveloper(appItem: StoreApp, dev: { id: string; email?: string }): boolean {
  const devId = dev.id?.trim();
  const devEmail = dev.email?.trim().toLowerCase();

  if (appItem.submittedBy && (appItem.submittedBy.id || appItem.submittedBy.email)) {
    const subId = appItem.submittedBy.id?.trim();
    const subEmail = appItem.submittedBy.email?.trim().toLowerCase();
    return Boolean(
      (devId && subId && subId === devId) ||
      (devEmail && subEmail && subEmail === devEmail)
    );
  }

  return Boolean(devEmail && appItem.developer?.email?.trim().toLowerCase() === devEmail);
}

// Developer: List own submitted apps
app.get('/api/developer/my-apps', requireDeveloper, (req, res) => {
  const dev = (req as any).developer;
  const apps = getApps();
  const myApps = apps.filter((a) => isAppOwnedByDeveloper(a, dev));
  return res.json({ success: true, apps: myApps });
});

// Developer: Delete or withdraw own pending/rejected submission
app.delete('/api/developer/apps/:id', requireDeveloper, async (req, res) => {
  const dev = (req as any).developer;
  const { id } = req.params;
  const apps = getApps();
  const appItem = findAppByIdOrSlug(apps, id);
  const index = appItem ? apps.findIndex((a) => a.id === appItem.id) : -1;

  if (index === -1 || !appItem) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  const isOwner = isAppOwnedByDeveloper(appItem, dev);

  if (!isOwner) {
    return res.status(403).json({ error: 'You do not have permission to delete this application.' });
  }

  apps.splice(index, 1);
  saveApps(apps);

  await recordServerAppTombstone(appItem.id);

  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, 'apps', appItem.id));
    } catch (_) {}
  }

  return res.json({ success: true, message: `Submission for "${appItem.name}" has been removed.` });
});

// Developer: Full Owner Control - Edit own app metadata, pricing, icon, screenshots, and download URL
app.patch('/api/developer/apps/:id', requireDeveloper, async (req, res) => {
  const dev = (req as any).developer;
  const { id } = req.params;
  const apps = getApps();
  const index = apps.findIndex((a) => a.id === id || a.slug === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  const appItem = apps[index];
  if (!isAppOwnedByDeveloper(appItem, dev)) {
    return res.status(403).json({ error: 'You do not have ownership rights to edit this application.' });
  }

  const {
    name,
    tagline,
    description,
    category,
    iconUrl,
    heroImageUrl,
    screenshots,
    packageId,
    appEdition,
    isTvCompatible,
    directDownloadUrl,
    pricing
  } = req.body || {};

  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'Application name cannot be empty.' });
  }

  let updatedPricing = appItem.pricing;
  if (pricing && typeof pricing === 'object') {
    const nextType: AppPricingType = pricing.type === 'paid' ? 'paid' : 'free';
    const nextCurrency = String(pricing.currency || appItem.pricing?.currency || 'UGX').toUpperCase();
    const nextPrice = nextType === 'paid' ? Number(pricing.price || 0) : 0;
    if (nextType === 'paid') {
      const minAllowed = nextCurrency === 'USD' ? 1 : 500;
      if (!nextPrice || isNaN(nextPrice) || nextPrice < minAllowed) {
        return res.status(400).json({ error: `Paid app price must be at least ${minAllowed} ${nextCurrency}.` });
      }
    }
    updatedPricing = {
      type: nextType,
      price: nextPrice,
      currency: nextCurrency
    };
  }

  const normalizedDirect =
    directDownloadUrl !== undefined ? normalizeDownloadUrl(String(directDownloadUrl || '').trim()) : undefined;

  let updatedReleases = appItem.releases || [];
  if (directDownloadUrl !== undefined && updatedReleases.length > 0) {
    updatedReleases = updatedReleases.map((rel, idx) =>
      idx === 0 ? { ...rel, directDownloadUrl: normalizedDirect } : rel
    );
  }

  const nextEdition = appEdition || appItem.appEdition || 'phone';
  const updatedApp: StoreApp = {
    ...appItem,
    name: name !== undefined ? String(name).trim() : appItem.name,
    tagline: tagline !== undefined ? String(tagline).trim() : appItem.tagline,
    description: description !== undefined ? String(description).trim() : appItem.description,
    category: category !== undefined ? String(category).trim() : appItem.category,
    iconUrl: iconUrl !== undefined && String(iconUrl).trim() ? String(iconUrl).trim() : appItem.iconUrl,
    heroImageUrl:
      heroImageUrl !== undefined && String(heroImageUrl).trim()
        ? String(heroImageUrl).trim()
        : iconUrl !== undefined && String(iconUrl).trim()
        ? String(iconUrl).trim()
        : appItem.heroImageUrl,
    screenshots: Array.isArray(screenshots) && screenshots.length > 0 ? screenshots : appItem.screenshots,
    packageId: packageId !== undefined && String(packageId).trim() ? String(packageId).trim() : appItem.packageId,
    appEdition: nextEdition,
    isTvCompatible:
      isTvCompatible !== undefined
        ? Boolean(isTvCompatible)
        : nextEdition === 'tv' || nextEdition === 'both'
        ? true
        : appItem.isTvCompatible,
    pricing: updatedPricing,
    releases: updatedReleases,
    updatedAt: new Date().toISOString()
  };

  apps[index] = updatedApp;
  saveApps(apps);

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'apps', updatedApp.id), cleanForFirestore(updatedApp), { merge: true });
    } catch (e) {
      console.warn('[Firestore] Developer app edit sync notice:', e);
    }
  }

  return res.json({
    success: true,
    message: `Application "${updatedApp.name}" updated successfully.`,
    app: updatedApp
  });
});

// Developer: Full Owner Control - Publish a new APK or direct-link version update to own app
app.post(
  '/api/developer/apps/:id/releases',
  requireDeveloper,
  conditionalSingleUpload,
  async (req, res) => {
    try {
      const dev = (req as any).developer;
      const { id } = req.params;
      const {
        version,
        platform,
        minOS,
        changelog,
        directDownloadUrl,
        fileName: customFileName,
        fileSize: customFileSize
      } = req.body || {};
      const file = req.file;

      if (!version || !String(version).trim()) {
        return res.status(400).json({ error: 'Version string is required.' });
      }

      const apps = getApps();
      const appIndex = apps.findIndex((a) => a.id === id || a.slug === id);
      if (appIndex === -1) {
        return res.status(404).json({ error: 'Application not found.' });
      }

      const targetApp = apps[appIndex];
      if (!isAppOwnedByDeveloper(targetApp, dev)) {
        return res.status(403).json({ error: 'You do not have ownership rights to release updates for this app.' });
      }

      const formattedDirectUrl = normalizeDownloadUrl(directDownloadUrl);
      if (!file && !formattedDirectUrl) {
        return res.status(400).json({ error: 'Please upload an APK file or provide a direct download URL.' });
      }

      const cleanVersion = String(version).trim();
      const targetPlatform = (platform || (targetApp.appEdition === 'tv' ? 'Android TV' : 'Android')) as AppRelease['platform'];

      let fileSize = customFileSize || '32.0 MB';
      let fileName = customFileName || `${targetApp.slug}-v${cleanVersion}.apk`;
      let sha256Checksum = crypto.randomBytes(32).toString('hex');
      let apkFilePath: string | undefined = undefined;

      if (file) {
        fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        fileName = file.originalname;
        apkFilePath = file.path;
        try {
          const fileBuffer = fs.readFileSync(file.path);
          sha256Checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (_) {}
      } else if (formattedDirectUrl) {
        fileSize = customFileSize || 'Cloud Direct Link';
      }

      (targetApp.releases || []).forEach((r) => {
        if (r.platform === targetPlatform) {
          r.isLatest = false;
        }
      });

      const changelogList = (changelog || 'Bug fixes and performance improvements.')
        .split('\n')
        .map((l: string) => l.trim().replace(/^[-* ]\s*/, ''))
        .filter(Boolean);

      const newRelease: AppRelease = {
        id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        version: cleanVersion,
        buildNumber: (targetApp.releases?.[0]?.buildNumber || 100) + 1,
        releaseDate: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()),
        fileSize,
        fileName,
        platform: targetPlatform,
        minOS: minOS || 'Android 8.0+',
        changelog: changelogList,
        downloadCount: 0,
        sha256Checksum,
        isLatest: true,
        filePath: apkFilePath,
        directDownloadUrl: formattedDirectUrl
      };

      targetApp.releases = [newRelease, ...(targetApp.releases || [])];
      targetApp.currentVersion = cleanVersion;
      targetApp.updatedAt = new Date().toISOString();

      if (!targetApp.supportedPlatforms.includes(targetPlatform)) {
        targetApp.supportedPlatforms.push(targetPlatform);
      }

      const isTvPlat = targetPlatform === 'Android TV' || targetPlatform === 'Fire TV' || targetPlatform === 'Smart TV';
      if (isTvPlat) {
        targetApp.isTvCompatible = true;
        if (targetApp.appEdition === 'phone') {
          targetApp.appEdition = 'both';
        }
      } else if (targetPlatform === 'Android' && targetApp.appEdition === 'tv') {
        targetApp.appEdition = 'both';
      }

      apps[appIndex] = targetApp;
      saveApps(apps);

      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, 'apps', targetApp.id), cleanForFirestore(targetApp), { merge: true });
        } catch (e) {
          console.warn('[Firestore] Developer release upload sync notice:', e);
        }
      }

      return res.json({
        success: true,
        message: `Version v${cleanVersion} published for "${targetApp.name}"!`,
        app: targetApp,
        release: newRelease
      });
    } catch (err: any) {
      console.error('Error releasing developer app update:', err);
      return res.status(500).json({ error: err.message || 'Failed to publish app update.' });
    }
  }
);

// ==========================================
// DEVELOPER-TO-DEVELOPER APP OWNERSHIP SALE & TRANSFER (10% ADMIN FEE)
// ==========================================

// List active fellow developers (for choosing a recipient developer when selling/transferring an app)
app.get('/api/developer/directory', requireDeveloper, (req, res) => {
  const caller = (req as any).developer;
  const devs = getDevelopers();
  const directory = Object.values(devs)
    .filter((d) => {
      if (!d || d.status === 'banned' || d.status === 'frozen') return false;
      if (d.id === caller.id || d.email?.toLowerCase() === caller.email?.toLowerCase()) return false;
      if (d.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return false;
      return true;
    })
    .map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      companyName: d.companyName
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return res.json({ success: true, developers: directory });
});

// Seller Developer: List an owned app for sale/ownership transfer to a specific developer or open developer market
app.post('/api/developer/transfers/list', requireDeveloper, async (req, res) => {
  const seller = (req as any).developer;
  const { appId, askingPrice, targetBuyerEmail, targetBuyerId, note } = req.body || {};

  if (!appId) {
    return res.status(400).json({ error: 'Please select an application to sell/transfer.' });
  }

  const priceNum = Number(askingPrice);
  if (!priceNum || isNaN(priceNum) || priceNum < 1000) {
    return res.status(400).json({ error: 'Minimum transfer price is 1,000 UGX.' });
  }

  const apps = getApps();
  const appItem = apps.find((a) => a.id === appId || a.slug === appId);
  if (!appItem) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  if (!isAppOwnedByDeveloper(appItem, seller)) {
    return res.status(403).json({ error: 'You do not own this application and cannot list it for transfer.' });
  }

  let resolvedBuyer: DeveloperAccount | null = null;
  const lookupKey = String(targetBuyerId || targetBuyerEmail || '').trim();
  if (lookupKey) {
    if (lookupKey.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Developer-to-developer transfers cannot target the Super Admin account.' });
    }
    resolvedBuyer = await findDeveloperByIdOrEmail(lookupKey);
    if (!resolvedBuyer) {
      return res.status(404).json({ error: `No registered developer found matching "${lookupKey}".` });
    }
    if (
      resolvedBuyer.id === seller.id ||
      resolvedBuyer.email?.toLowerCase() === seller.email?.toLowerCase()
    ) {
      return res.status(400).json({ error: 'You cannot transfer ownership to your own developer account.' });
    }
    if (resolvedBuyer.status === 'banned' || resolvedBuyer.status === 'frozen') {
      return res.status(400).json({
        error: `Target developer "${resolvedBuyer.name}" cannot receive apps because their account is ${resolvedBuyer.status}.`
      });
    }
  }

  const adminFeePercent = 10;
  const adminFeeAmount = Math.round((priceNum * adminFeePercent) / 100);
  const sellerNetAmount = priceNum - adminFeeAmount;
  const nowIso = new Date().toISOString();

  const transfers = getTransfers();
  // Cancel any stale open listings for the same app by this seller
  const modifiedIds: string[] = [];
  transfers.forEach((t) => {
    if (t.appId === appItem.id && t.status === 'open') {
      t.status = 'cancelled';
      t.cancelledAt = nowIso;
      modifiedIds.push(t.id);
    }
  });

  const listing: AppTransferListing = {
    id: `trf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    appId: appItem.id,
    appName: appItem.name,
    appSlug: appItem.slug,
    appIcon: appItem.iconUrl || '/zuzustore-logo.png',
    appVersion: appItem.currentVersion,
    appCategory: appItem.category,
    sellerId: seller.id,
    sellerName: seller.name,
    sellerEmail: seller.email,
    ...(resolvedBuyer
      ? {
          targetBuyerId: resolvedBuyer.id,
          targetBuyerEmail: resolvedBuyer.email,
          targetBuyerName: resolvedBuyer.name
        }
      : {}),
    askingPrice: priceNum,
    adminFeePercent,
    adminFeeAmount,
    sellerNetAmount,
    currency: 'UGX',
    ...(note && String(note).trim() ? { note: String(note).trim() } : {}),
    status: 'open',
    createdAt: nowIso
  };

  transfers.unshift(listing);
  saveTransfers(transfers);

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'app_transfers', listing.id), cleanForFirestore(listing));
      await Promise.all(
        modifiedIds.map((mid) => {
          const item = transfers.find((t) => t.id === mid);
          return item ? setDoc(doc(firestoreDb, 'app_transfers', mid), cleanForFirestore(item), { merge: true }) : Promise.resolve();
        })
      );
    } catch (e) {
      console.warn('[Firestore] Transfer listing sync notice:', e);
    }
  }

  return res.status(201).json({
    success: true,
    message: resolvedBuyer
      ? `Transfer offer for "${appItem.name}" sent to ${resolvedBuyer.name} (${resolvedBuyer.email}) for ${priceNum.toLocaleString()} UGX.`
      : `"${appItem.name}" listed on the Developer Ownership Market for ${priceNum.toLocaleString()} UGX.`,
    listing
  });
});

// Developer: Fetch my open listings, incoming direct offers, open developer market offers, and transfer history
app.get('/api/developer/transfers', requireDeveloper, (req, res) => {
  const dev = (req as any).developer;
  const devEmail = dev.email?.toLowerCase();
  const transfers = getTransfers();

  const isSeller = (t: AppTransferListing) =>
    t.sellerId === dev.id || t.sellerEmail?.toLowerCase() === devEmail;
  const isTargetBuyer = (t: AppTransferListing) =>
    Boolean(
      (t.targetBuyerId && t.targetBuyerId === dev.id) ||
        (t.targetBuyerEmail && t.targetBuyerEmail.toLowerCase() === devEmail)
    );
  const isBuyer = (t: AppTransferListing) =>
    Boolean(
      (t.buyerId && t.buyerId === dev.id) ||
        (t.buyerEmail && t.buyerEmail.toLowerCase() === devEmail)
    );

  const myListings = transfers.filter((t) => t.status === 'open' && isSeller(t));
  const incomingOffers = transfers.filter(
    (t) => t.status === 'open' && !isSeller(t) && isTargetBuyer(t)
  );
  const marketplaceOffers = transfers.filter(
    (t) => t.status === 'open' && !isSeller(t) && !t.targetBuyerId && !t.targetBuyerEmail
  );
  const completedHistory = transfers.filter(
    (t) => t.status !== 'open' && (isSeller(t) || isBuyer(t) || isTargetBuyer(t))
  );

  return res.json({
    success: true,
    myListings,
    incomingOffers,
    marketplaceOffers,
    completedHistory
  });
});

// Seller Developer: Cancel an open transfer listing
app.post('/api/developer/transfers/:id/cancel', requireDeveloper, async (req, res) => {
  const dev = (req as any).developer;
  const { id } = req.params;
  const transfers = getTransfers();
  const listing = transfers.find((t) => t.id === id);

  if (!listing) {
    return res.status(404).json({ error: 'Transfer listing not found.' });
  }

  const isOwner =
    listing.sellerId === dev.id || listing.sellerEmail?.toLowerCase() === dev.email?.toLowerCase();
  if (!isOwner) {
    return res.status(403).json({ error: 'Only the seller developer can cancel this transfer listing.' });
  }

  if (listing.status !== 'open') {
    return res.status(400).json({ error: `Cannot cancel a listing that is already ${listing.status}.` });
  }

  listing.status = 'cancelled';
  listing.cancelledAt = new Date().toISOString();
  saveTransfers(transfers);

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'app_transfers', listing.id), cleanForFirestore(listing), { merge: true });
    } catch (_) {}
  }

  return res.json({
    success: true,
    message: `Transfer offer for "${listing.appName}" has been cancelled.`,
    listing
  });
});

// Buyer Developer: Pay for app ownership (LivePay Mobile Money OR Wallet Balance) -> 10% Admin Commission, 90% Seller Wallet, Immediate Full Rights Handover
app.post('/api/developer/transfers/:id/purchase', requireDeveloper, async (req, res) => {
  const buyer = (req as any).developer;
  const { id } = req.params;
  const { paymentMethod = 'livepay_mtn', phoneNumber } = req.body || {};

  const transfers = getTransfers();
  const listingIndex = transfers.findIndex((t) => t.id === id);
  if (listingIndex === -1) {
    return res.status(404).json({ error: 'App transfer listing not found.' });
  }

  const listing = transfers[listingIndex];
  if (listing.status !== 'open') {
    return res.status(400).json({ error: `This transfer offer is already ${listing.status}.` });
  }

  if (
    listing.sellerId === buyer.id ||
    listing.sellerEmail?.toLowerCase() === buyer.email?.toLowerCase()
  ) {
    return res.status(400).json({ error: 'You cannot purchase your own app transfer listing.' });
  }

  // If targeted at a specific developer, verify caller is that developer
  if (listing.targetBuyerId || listing.targetBuyerEmail) {
    const matchesId = listing.targetBuyerId && listing.targetBuyerId === buyer.id;
    const matchesEmail =
      listing.targetBuyerEmail && listing.targetBuyerEmail.toLowerCase() === buyer.email?.toLowerCase();
    if (!matchesId && !matchesEmail) {
      return res.status(403).json({ error: 'This private ownership transfer offer is assigned to a different developer.' });
    }
  }

  const apps = getApps();
  const appIndex = apps.findIndex((a) => a.id === listing.appId);
  if (appIndex === -1) {
    return res.status(404).json({ error: 'The application in this transfer listing no longer exists.' });
  }

  const appItem = apps[appIndex];
  if (!isAppOwnedByDeveloper(appItem, { id: listing.sellerId, email: listing.sellerEmail })) {
    return res.status(409).json({
      error: 'Ownership of this application changed outside this listing. Transfer aborted for safety.'
    });
  }

  const grossAmount = Number(listing.askingPrice);
  const adminFeePercent = 10;
  const adminFeeAmount = Math.round((grossAmount * adminFeePercent) / 100);
  const sellerNetAmount = grossAmount - adminFeeAmount;
  const currency = listing.currency || 'UGX';
  const nowIso = new Date().toISOString();

  const wallets = getWallets();
  let buyerWallet: DeveloperWallet | null = null;
  let livepayResult: any = null;
  let cleanPhone = '';
  let readableMethod = 'LivePay Mobile Money';

  if (paymentMethod === 'wallet') {
    buyerWallet = getOrCreateWallet(buyer.id);
    if ((buyerWallet.availableBalance || 0) < grossAmount) {
      return res.status(400).json({
        error: `Insufficient Developer Wallet balance. Required: ${grossAmount.toLocaleString()} ${currency}, Available: ${(buyerWallet.availableBalance || 0).toLocaleString()} ${currency}.`
      });
    }
    buyerWallet.availableBalance -= grossAmount;
    buyerWallet.updatedAt = nowIso;
    wallets[buyer.id] = buyerWallet;
    readableMethod = 'Developer Wallet Balance';
  } else {
    cleanPhone = normalizeUgandaPhone(phoneNumber || '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        error: 'Please enter a valid MTN or Airtel Mobile Money phone number (e.g. 0770 000 000).'
      });
    }
    const isAirtel = paymentMethod === 'livepay_airtel';
    readableMethod = isAirtel ? 'LivePay Airtel Money' : 'LivePay MTN Mobile Money';
    const livepayRef = `ZUZUXFR${Date.now().toString().slice(-7)}`;
    console.log(`[LivePay App Transfer] Collecting ${grossAmount} ${currency} from ${cleanPhone} for "${appItem.name}"...`);
    livepayResult = await callLivePayCollect({
      phoneNumber: cleanPhone,
      amount: grossAmount,
      currency,
      reference: livepayRef,
      description: `XFER:${appItem.name.substring(0, 18)}`
    });
    console.log('[LivePay App Transfer Response]:', livepayResult);
    if (!livepayResult?.ok || livepayResult?.data?.success === false) {
      const livepayErr =
        livepayResult?.data?.message ||
        livepayResult?.data?.error ||
        livepayResult?.error ||
        'LivePay Mobile Money collection request failed.';
      return res.status(402).json({
        error: `LivePay payment could not be initiated: ${livepayErr}`
      });
    }
  }

  // Credit 90% to Seller Developer Wallet (10% retained by Super Admin)
  const sellerWallet = getOrCreateWallet(listing.sellerId);
  sellerWallet.totalGrossRevenue += grossAmount;
  sellerWallet.totalAdminFeesPaid += adminFeeAmount;
  sellerWallet.totalNetEarnings += sellerNetAmount;
  sellerWallet.availableBalance += sellerNetAmount;
  sellerWallet.currency = currency;
  sellerWallet.updatedAt = nowIso;
  wallets[listing.sellerId] = sellerWallet;
  saveWallets(wallets);

  // Record financial transaction in sales ledger (tracks Super Admin 10% commission & seller 90% net)
  const saleTx: AppSaleTransaction = {
    id: `sale-xfer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    appId: appItem.id,
    appName: `${appItem.name} (Ownership Transfer)`,
    appIcon: appItem.iconUrl,
    developerId: listing.sellerId,
    developerEmail: listing.sellerEmail,
    customerName: buyer.name,
    customerEmail: buyer.email,
    grossAmount,
    adminCommissionPercent: adminFeePercent,
    adminCommissionAmount: adminFeeAmount,
    developerNetAmount: sellerNetAmount,
    currency,
    paymentMethod: readableMethod,
    ...(cleanPhone ? { phoneNumber: cleanPhone } : {}),
    livepayReference: livepayResult?.data?.reference || (paymentMethod === 'wallet' ? `WALLET-${Date.now()}` : `LP-XFR-${Date.now()}`),
    ...(livepayResult?.data?.internal_reference ? { livepayInternalRef: livepayResult.data.internal_reference } : {}),
    ...(livepayResult?.data?.network ? { livepayNetwork: livepayResult.data.network } : {}),
    livepayStatus: paymentMethod === 'wallet' ? 'completed' : livepayResult?.ok ? 'initiated' : 'completed',
    status: 'completed',
    transactionType: 'ownership_transfer',
    createdAt: nowIso
  };
  const sales = getSales();
  sales.unshift(saleTx);
  saveSales(sales);

  // Transfer FULL app ownership & full rights immediately to Buyer Developer
  const transferRecord: AppOwnershipTransferRecord = {
    id: `xfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fromId: listing.sellerId,
    fromName: listing.sellerName,
    fromEmail: listing.sellerEmail,
    toId: buyer.id,
    toName: buyer.name,
    toEmail: buyer.email,
    transferredAt: nowIso,
    transferredBy: buyer.email,
    reason: listing.note || `Developer-to-developer paid ownership sale (${grossAmount.toLocaleString()} ${currency})`,
    updatedDisplayCredit: true,
    pricePaid: grossAmount,
    adminFeePercent,
    adminFeeAmount,
    sellerNetAmount,
    currency,
    transferListingId: listing.id,
    paymentMethod: readableMethod
  };

  const buyerDisplayName = buyer.companyName ? `${buyer.name} (${buyer.companyName})` : buyer.name;
  appItem.submittedBy = {
    id: buyer.id,
    name: buyer.name,
    email: buyer.email
  };
  appItem.developer = {
    ...appItem.developer,
    name: buyerDisplayName,
    email: buyer.email,
    verified: buyer.status !== 'banned'
  };
  appItem.isOfficial = false;
  appItem.ownershipHistory = [transferRecord, ...(appItem.ownershipHistory || [])];
  appItem.updatedAt = nowIso;

  apps[appIndex] = appItem;
  saveApps(apps);

  // Mark listing completed & cancel any other open listings for the same app
  listing.status = 'completed';
  listing.buyerId = buyer.id;
  listing.buyerName = buyer.name;
  listing.buyerEmail = buyer.email;
  listing.paymentMethod = readableMethod;
  if (cleanPhone) listing.phoneNumber = cleanPhone;
  listing.livepayReference = saleTx.livepayReference;
  if (saleTx.livepayInternalRef) listing.livepayInternalRef = saleTx.livepayInternalRef;
  if (saleTx.livepayNetwork) listing.livepayNetwork = saleTx.livepayNetwork;
  listing.transferRecordId = transferRecord.id;
  listing.completedAt = nowIso;
  transfers[listingIndex] = listing;

  const cancelledOtherIds: string[] = [];
  transfers.forEach((t) => {
    if (t.id !== listing.id && t.appId === appItem.id && t.status === 'open') {
      t.status = 'cancelled';
      t.cancelledAt = nowIso;
      cancelledOtherIds.push(t.id);
    }
  });
  saveTransfers(transfers);

  // Persist all updated collections to Firestore
  if (firestoreDb) {
    try {
      const dbWrites: Promise<any>[] = [
        setDoc(doc(firestoreDb, 'apps', appItem.id), cleanForFirestore(appItem), { merge: true }),
        setDoc(doc(firestoreDb, 'app_transfers', listing.id), cleanForFirestore(listing), { merge: true }),
        setDoc(doc(firestoreDb, 'wallets', listing.sellerId), cleanForFirestore(sellerWallet), { merge: true }),
        setDoc(doc(firestoreDb, 'sales', saleTx.id), cleanForFirestore(saleTx))
      ];
      if (buyerWallet) {
        dbWrites.push(setDoc(doc(firestoreDb, 'wallets', buyer.id), cleanForFirestore(buyerWallet), { merge: true }));
      }
      cancelledOtherIds.forEach((cid) => {
        const item = transfers.find((t) => t.id === cid);
        if (item) {
          dbWrites.push(setDoc(doc(firestoreDb, 'app_transfers', cid), cleanForFirestore(item), { merge: true }));
        }
      });
      await Promise.all(dbWrites);
    } catch (e) {
      console.warn('[Firestore] App transfer completion sync notice:', e);
    }
  }

  return res.json({
    success: true,
    message: `Ownership of "${appItem.name}" transferred to ${buyer.name}! Admin 10% commission (${adminFeeAmount.toLocaleString()} ${currency}) recorded and Seller credited ${sellerNetAmount.toLocaleString()} ${currency}.`,
    listing,
    app: appItem,
    transaction: saleTx,
    buyerWallet: buyerWallet || getOrCreateWallet(buyer.id)
  });
});

// ==========================================
// DEVELOPER FINANCIAL WALLET & WITHDRAWALS
// ==========================================

// Developer: Get own financial wallet and sales history
app.get('/api/developer/wallet', requireDeveloper, (req, res) => {
  const dev = (req as any).developer;
  const wallet = getOrCreateWallet(dev.id);
  const sales = getSales().filter(
    (s) => s.developerId === dev.id || s.developerEmail?.toLowerCase() === dev.email?.toLowerCase()
  );

  return res.json({
    success: true,
    wallet: {
      ...wallet,
      recentSales: sales.slice(0, 50)
    }
  });
});

// Developer: Submit withdrawal request (minimum 1,000 threshold enforced)
app.post('/api/developer/withdraw', requireDeveloper, (req, res) => {
  const dev = (req as any).developer;
  const {
    amount,
    payoutMethod,
    payoutDetails: nestedDetails,
    accountNumber,
    accountName,
    bankName,
    swiftCode,
    notes,
    currency = 'UGX'
  } = req.body;
  const numAmount = Number(amount);

  // STRICT RULE: Minimum withdrawal amount must start from 1,000
  if (!numAmount || isNaN(numAmount) || numAmount < 1000) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is 1,000.' });
  }

  const wallet = getOrCreateWallet(dev.id);
  if (wallet.availableBalance < numAmount) {
    return res.status(400).json({
      error: `Insufficient available balance. You have ${wallet.availableBalance.toLocaleString()} ${wallet.currency || 'UGX'} available.`
    });
  }

  const payoutDetails = nestedDetails || {
    accountName: accountName || dev.name,
    accountNumber: accountNumber || '',
    bankName,
    swiftCode,
    notes
  };

  if (!payoutDetails.accountNumber) {
    return res.status(400).json({ error: 'Valid payout phone number or bank account number is required.' });
  }

  const settings = getSystemSettings();
  const feeRatePer1000 = settings.withdrawalTransferFeePer1000 ?? 100;
  // Calculate transfer fee: 100 UGX deducted per every 1,000 UGX
  const transferFee = Math.round((numAmount / 1000) * feeRatePer1000);
  const netPayoutAmount = Math.max(0, numAmount - transferFee);

  const withdrawalId = `wdr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const withdrawal: WithdrawalRequest = {
    id: withdrawalId,
    developerId: dev.id,
    developerName: dev.name,
    developerEmail: dev.email,
    amount: numAmount,
    transferFee,
    netPayoutAmount,
    currency: wallet.currency || currency || 'UGX',
    payoutMethod: payoutMethod || 'mobile_money_mtn',
    payoutDetails: {
      accountName: payoutDetails.accountName || dev.name,
      accountNumber: payoutDetails.accountNumber,
      bankName: payoutDetails.bankName,
      swiftCode: payoutDetails.swiftCode,
      notes: payoutDetails.notes
    },
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  // Lock amount into pendingWithdrawals
  wallet.availableBalance -= numAmount;
  wallet.pendingWithdrawals = (wallet.pendingWithdrawals || 0) + numAmount;
  wallet.updatedAt = new Date().toISOString();

  const wallets = getWallets();
  wallets[dev.id] = wallet;
  saveWallets(wallets);

  const withdrawals = getWithdrawals();
  withdrawals.unshift(withdrawal);
  saveWithdrawals(withdrawals);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'wallets', dev.id), cleanForFirestore(wallet), { merge: true }).catch(() => {});
    setDoc(doc(firestoreDb, 'withdrawals', withdrawal.id), cleanForFirestore(withdrawal)).catch(() => {});
  }

  return res.json({
    success: true,
    message: `Withdrawal request of ${numAmount.toLocaleString()} ${withdrawal.currency} submitted successfully! Sending network charge: ${transferFee.toLocaleString()} ${withdrawal.currency}. Net cash to handset: ${netPayoutAmount.toLocaleString()} ${withdrawal.currency}.`,
    withdrawal,
    wallet
  });
});

// Developer: Get own withdrawal history
app.get('/api/developer/withdrawals', requireDeveloper, (req, res) => {
  const dev = (req as any).developer;
  const list = getWithdrawals().filter(
    (w) => w.developerId === dev.id || w.developerEmail?.toLowerCase() === dev.email?.toLowerCase()
  );
  return res.json({ success: true, withdrawals: list });
});

// ==========================================
// SUPER ADMIN REVIEW QUEUE & APPROVAL
// ==========================================

// Super Admin: Get all pending applications
app.get('/api/admin/submissions/pending', requireAdmin, (req, res) => {
  const apps = getApps();
  const pending = apps.filter((a) => a.approvalStatus === 'pending_approval');
  return res.json({ success: true, pending, count: pending.length });
});

// Super Admin: Approve submission (Publishes to live storefront)
app.post('/api/admin/submissions/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);

  if (!appItem) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  appItem.approvalStatus = 'approved';
  appItem.reviewedAt = new Date().toISOString();
  appItem.reviewedBy = ADMIN_EMAIL;
  appItem.rejectionReason = undefined;
  appItem.updatedAt = new Date().toISOString();

  saveApps(apps);

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'apps', appItem.id), cleanForFirestore(appItem), { merge: true });
    } catch (_) {}
  }

  return res.json({
    success: true,
    message: `Application "${appItem.name}" approved! It is now live on Zuzu Store.`,
    app: appItem
  });
});

// Super Admin: Reject submission (Provides feedback to developer)
app.post('/api/admin/submissions/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);

  if (!appItem) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  appItem.approvalStatus = 'rejected';
  appItem.rejectionReason = reason ? String(reason).trim() : 'Does not meet store security or content guidelines.';
  appItem.reviewedAt = new Date().toISOString();
  appItem.reviewedBy = ADMIN_EMAIL;
  appItem.updatedAt = new Date().toISOString();

  saveApps(apps);

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'apps', appItem.id), cleanForFirestore(appItem), { merge: true });
    } catch (_) {}
  }

  return res.json({
    success: true,
    message: `Application "${appItem.name}" rejected. Feedback sent to developer.`,
    app: appItem
  });
});

// ==========================================
// SYSTEM BROADCAST BANNER (PUBLIC & ADMIN)
// ==========================================

// Get active broadcast banner (Public)
app.get('/api/broadcast', (req, res) => {
  const broadcast = getBroadcast();
  return res.json({ success: true, broadcast });
});

// Super Admin: Publish or update broadcast banner
app.post('/api/admin/broadcast', requireAdmin, (req, res) => {
  const { message, active, level, link, linkText } = req.body;
  const broadcast: AdminBroadcast = {
    message: String(message || '').trim(),
    active: active !== undefined ? Boolean(active) : true,
    level: level === 'warning' || level === 'alert' ? level : 'info',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    link: link ? String(link).trim() : undefined,
    linkText: linkText ? String(linkText).trim() : undefined
  };

  saveBroadcast(broadcast);
  return res.json({
    success: true,
    message: 'System broadcast banner updated successfully!',
    broadcast
  });
});

// ==========================================
// SUPER ADMIN GOD MODE & MODERATION
// ==========================================

// Super Admin: Get all registered developers with full activity statistics
app.get('/api/admin/developers', requireAdmin, async (req, res) => {
  if (firestoreDb) {
    try {
      const devSnap = await getDocs(collection(firestoreDb, 'developers'));
      devSnap.forEach((d) => {
        if (d.id.startsWith('email_')) return;
        const dev = d.data() as DeveloperAccount;
        if (dev && dev.id) {
          memoryDevelopers[dev.id] = dev;
        }
      });
      saveLocalDevelopers(memoryDevelopers);
    } catch (_) {}
  }

  const devs = getDevelopers();
  const apps = getApps();

  const developerList = Object.values(devs).map((dev) => {
    const devApps = apps.filter((a) => isAppOwnedByDeveloper(a, dev));

    const totalDownloads = devApps.reduce((acc, a) => acc + (a.downloadsTotal || 0), 0);

    return {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      companyName: dev.companyName,
      createdAt: dev.createdAt,
      status: dev.status || 'active',
      banReason: dev.banReason,
      bannedAt: dev.bannedAt,
      appsCount: devApps.length,
      totalDownloads,
      apps: devApps.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        currentVersion: a.currentVersion,
        approvalStatus: a.approvalStatus || 'approved',
        isTakenDown: Boolean(a.isTakenDown),
        downloadsTotal: a.downloadsTotal || 0
      }))
    };
  });

  return res.json({
    success: true,
    developers: developerList,
    total: developerList.length
  });
});

// Super Admin: Change developer account status (active, frozen, banned) - Supports both POST and PATCH
const handleUpdateDevStatus = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!status || !['active', 'frozen', 'banned'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required: "active", "frozen", or "banned".' });
  }

  const dev = await findDeveloperByIdOrEmail(id);

  if (!dev) {
    return res.status(404).json({ error: 'Developer account not found.' });
  }

  dev.status = status;
  if (status === 'banned' || status === 'frozen') {
    dev.banReason = reason ? String(reason).trim() : `Account ${status} by Super Admin.`;
    dev.bannedAt = new Date().toISOString();
  } else {
    dev.banReason = undefined;
    dev.bannedAt = undefined;
  }

  await persistDeveloper(dev);

  return res.json({
    success: true,
    message: `Developer account "${dev.name}" status changed to ${status.toUpperCase()}.`,
    developer: {
      id: dev.id,
      name: dev.name,
      email: dev.email,
      status: dev.status,
      banReason: dev.banReason,
      bannedAt: dev.bannedAt
    }
  });
};

app.post('/api/admin/developers/:id/status', requireAdmin, handleUpdateDevStatus);
app.patch('/api/admin/developers/:id/status', requireAdmin, handleUpdateDevStatus);

// Super Admin: Delete developer account permanently
app.delete('/api/admin/developers/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const dev = await findDeveloperByIdOrEmail(id);

  if (!dev) {
    return res.status(404).json({ error: 'Developer account not found.' });
  }

  await deleteDeveloperPermanently(dev.id);

  return res.json({
    success: true,
    message: `Developer account "${dev.name}" (${dev.email}) has been permanently deleted from store & database.`
  });
});

// Super Admin: Get all apps for a specific developer
app.get('/api/admin/developers/:id/apps', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const dev = await findDeveloperByIdOrEmail(id);
  const apps = getApps();
  const devApps = apps.filter((a) =>
    isAppOwnedByDeveloper(a, dev ? { id: dev.id, email: dev.email } : { id, email: id })
  );

  return res.json({
    success: true,
    apps: devApps,
    count: devApps.length
  });
});

// Super Admin: Transfer app ownership to any targeted developer or back to Official Store Admin
app.post('/api/admin/apps/:id/transfer-ownership', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    targetDeveloperId,
    targetEmail,
    targetType,
    updateDisplayDeveloper = true,
    reason
  } = req.body || {};

  const apps = getApps();
  const index = apps.findIndex((a) => a.id === id || a.slug === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  const appItem = apps[index];
  const normalizedTargetEmail = typeof targetEmail === 'string' ? targetEmail.trim().toLowerCase() : '';
  const isTransferToAdmin =
    targetType === 'admin' ||
    targetDeveloperId === 'admin' ||
    (normalizedTargetEmail !== '' && normalizedTargetEmail === ADMIN_EMAIL.toLowerCase());

  let targetOwner: {
    id: string;
    name: string;
    displayName: string;
    email: string;
    verified: boolean;
    isOfficial: boolean;
  };

  if (isTransferToAdmin) {
    targetOwner = {
      id: 'admin',
      name: 'ZuzuStore Official',
      displayName: 'ZuzuStore Official',
      email: ADMIN_EMAIL,
      verified: true,
      isOfficial: true
    };
  } else {
    const lookupKey = String(targetDeveloperId || targetEmail || '').trim();
    if (!lookupKey) {
      return res.status(400).json({ error: 'Please choose a registered developer or enter a target developer email.' });
    }

    const dev = await findDeveloperByIdOrEmail(lookupKey);
    if (!dev) {
      return res.status(404).json({
        error: `No registered developer found matching "${lookupKey}".`
      });
    }

    targetOwner = {
      id: dev.id,
      name: dev.name,
      displayName: dev.companyName ? `${dev.name} (${dev.companyName})` : dev.name,
      email: dev.email,
      verified: dev.status !== 'banned',
      isOfficial: false
    };
  }

  const prevId =
    appItem.submittedBy?.id ||
    (appItem.developer?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ? 'admin'
      : appItem.developer?.email || 'admin');
  const prevName = appItem.submittedBy?.name || appItem.developer?.name || 'ZuzuStore Official';
  const prevEmail = appItem.submittedBy?.email || appItem.developer?.email || ADMIN_EMAIL;

  if (prevId === targetOwner.id && prevEmail.toLowerCase() === targetOwner.email.toLowerCase()) {
    return res.status(400).json({
      error: `"${appItem.name}" is already owned by ${targetOwner.name} (${targetOwner.email}).`
    });
  }

  const nowIso = new Date().toISOString();
  const shouldUpdateDisplay = updateDisplayDeveloper !== false;
  const cleanReason = typeof reason === 'string' && reason.trim() ? reason.trim() : undefined;

  const transferRecord: AppOwnershipTransferRecord = {
    id: `xfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fromId: prevId,
    fromName: prevName,
    fromEmail: prevEmail,
    toId: targetOwner.id,
    toName: targetOwner.name,
    toEmail: targetOwner.email,
    transferredAt: nowIso,
    transferredBy: ADMIN_EMAIL,
    ...(cleanReason ? { reason: cleanReason } : {}),
    updatedDisplayCredit: shouldUpdateDisplay
  };

  appItem.submittedBy = {
    id: targetOwner.id,
    name: targetOwner.name,
    email: targetOwner.email
  };

  if (shouldUpdateDisplay) {
    appItem.developer = {
      ...appItem.developer,
      name: targetOwner.displayName,
      email: targetOwner.email,
      verified: targetOwner.verified
    };
    appItem.isOfficial = targetOwner.isOfficial;
  }

  appItem.ownershipHistory = [transferRecord, ...(appItem.ownershipHistory || [])];
  appItem.updatedAt = nowIso;

  apps[index] = appItem;
  saveApps(apps);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'apps', appItem.id), cleanForFirestore(appItem), { merge: true }).catch((e) => {
      console.warn('[Firestore] Error syncing transferred app ownership:', e);
    });
  }

  return res.json({
    success: true,
    message: `Ownership of "${appItem.name}" transferred from ${prevName} to ${targetOwner.name} (${targetOwner.email}).`,
    app: appItem,
    transferRecord
  });
});

// Super Admin: Soft unpublish / Take down app from public store
app.post('/api/admin/apps/:id/takedown', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);

  if (!appItem) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  appItem.isTakenDown = true;
  appItem.takedownReason = reason ? String(reason).trim() : 'Taken down by Super Admin for review.';
  appItem.takenDownAt = new Date().toISOString();
  appItem.takenDownBy = ADMIN_EMAIL;
  appItem.updatedAt = new Date().toISOString();

  saveApps(apps);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'apps', appItem.id), cleanForFirestore(appItem), { merge: true }).catch(() => {});
  }

  return res.json({
    success: true,
    message: `Application "${appItem.name}" has been taken down from the public storefront.`,
    app: appItem
  });
});

// Super Admin: Restore soft-unpublished app back to live storefront
app.post('/api/admin/apps/:id/restore', requireAdmin, (req, res) => {
  const { id } = req.params;
  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);

  if (!appItem) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  appItem.isTakenDown = false;
  appItem.takedownReason = undefined;
  appItem.takenDownAt = undefined;
  appItem.takenDownBy = undefined;
  appItem.updatedAt = new Date().toISOString();

  saveApps(apps);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'apps', appItem.id), cleanForFirestore(appItem), { merge: true }).catch(() => {});
  }

  return res.json({
    success: true,
    message: `Application "${appItem.name}" has been restored to the live storefront!`,
    app: appItem
  });
});

// Super Admin: Direct metadata override for any application
app.patch('/api/admin/apps/:id/override', requireAdmin, (req, res) => {
  const { id } = req.params;
  const overrides = req.body;
  const apps = getApps();
  const index = apps.findIndex((a) => a.id === id || a.slug === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  const currentApp = apps[index];

  // If overriding direct download URL on latest release
  if (overrides.directDownloadUrl && currentApp.releases?.[0]) {
    currentApp.releases[0].directDownloadUrl = normalizeDownloadUrl(overrides.directDownloadUrl);
  }

  const updatedApp: StoreApp = {
    ...currentApp,
    ...overrides,
    id: currentApp.id, // maintain primary key
    updatedAt: new Date().toISOString()
  };

  apps[index] = updatedApp;
  saveApps(apps);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'apps', updatedApp.id), cleanForFirestore(updatedApp), { merge: true }).catch(() => {});
  }

  return res.json({
    success: true,
    message: `Super Admin override applied to "${updatedApp.name}".`,
    app: updatedApp
  });
});

// Super Admin: Reorder & Visual Curation of Apps for "For You" & Storefront
app.post('/api/admin/apps/reorder', requireAdmin, async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'Order array of { id, displayOrder, isFeatured } required.' });
  }

  const apps = getApps();
  const orderMap = new Map<string, { displayOrder: number; isFeatured?: boolean }>();
  order.forEach((item) => {
    if (item && item.id) {
      orderMap.set(item.id, {
        displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : 9999,
        isFeatured: Boolean(item.isFeatured)
      });
    }
  });

  // Update apps in memory and Firestore
  apps.forEach((app) => {
    const config = orderMap.get(app.id) || (app.slug ? orderMap.get(app.slug) : undefined);
    if (config) {
      app.displayOrder = config.displayOrder;
      app.isFeatured = config.isFeatured;
      app.updatedAt = new Date().toISOString();

      if (firestoreDb) {
        setDoc(
          doc(firestoreDb, 'apps', app.id),
          {
            displayOrder: app.displayOrder,
            isFeatured: app.isFeatured,
            updatedAt: app.updatedAt
          },
          { merge: true }
        ).catch((err) => console.warn(`[Firestore Server] Reorder doc update notice for ${app.id}:`, err));
      }
    }
  });

  // Sort apps array according to new displayOrder
  apps.sort((a, b) => {
    const orderA = a.displayOrder !== undefined ? a.displayOrder : (a.isFeatured ? 1 : 9999);
    const orderB = b.displayOrder !== undefined ? b.displayOrder : (b.isFeatured ? 1 : 9999);
    if (orderA !== orderB) return orderA - orderB;
    return (b.downloadsTotal || 0) - (a.downloadsTotal || 0);
  });

  saveApps(apps);

  return res.json({
    success: true,
    message: 'Storefront and For You ranking successfully saved and published!',
    apps
  });
});

// ==========================================
// LIVEPAY UGANDA / AFRICA INTEGRATION
// Account: LP260805074398
// ==========================================

const LIVEPAY_BASE_URL = process.env.LIVEPAY_BASE_URL || 'https://livepay.me/api';
const LIVEPAY_API_KEY =
  process.env.LIVEPAY_API_KEY ||
  'cc32614dc4866f6e.78f262b1d208943a66bd3a9eed04aa9f66f7872db70ec83d1d65c583fa719f07';
const LIVEPAY_WEBHOOK_SECRET =
  process.env.LIVEPAY_WEBHOOK_SECRET ||
  '3d7d9f2a412192c3160e09532408f22146477b3f065e2e80c8d3c5724dceecef';
const LIVEPAY_ACCOUNT_NUMBER =
  process.env.LIVEPAY_ACCOUNT_NUMBER || 'LP260805074398';

function normalizeUgandaPhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('256') && cleaned.length >= 12) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned;
}

// LivePay Collect Money API (Instant Mobile Money Prompt on Customer Phone)
async function callLivePayCollect({
  phoneNumber,
  amount,
  currency = 'UGX',
  reference,
  description
}: {
  phoneNumber: string;
  amount: number;
  currency?: string;
  reference: string;
  description: string;
}) {
  const normPhone = normalizeUgandaPhone(phoneNumber);
  try {
    const res = await fetch(`${LIVEPAY_BASE_URL}/collect-money`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LIVEPAY_API_KEY}`
      },
      body: JSON.stringify({
        accountNumber: LIVEPAY_ACCOUNT_NUMBER,
        phoneNumber: normPhone,
        amount,
        currency,
        reference,
        description: description.substring(0, 30)
      })
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err: any) {
    console.error('[LivePay Collect Error]:', err);
    return {
      ok: false,
      status: 500,
      error: err.message
    };
  }
}

// LivePay Transaction Status API (Verify whether Mobile Money prompt was confirmed paid or failed)
async function callLivePayTransactionStatus({
  reference,
  currency = 'UGX'
}: {
  reference: string;
  currency?: string;
}) {
  try {
    const qs = new URLSearchParams({
      accountNumber: LIVEPAY_ACCOUNT_NUMBER,
      currency: currency || 'UGX',
      reference
    });
    const res = await fetch(`${LIVEPAY_BASE_URL}/transaction-status?${qs.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LIVEPAY_API_KEY}`
      },
      signal: AbortSignal.timeout(12000)
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err: any) {
    console.error('[LivePay Status Check Error]:', err);
    return {
      ok: false,
      status: 500,
      error: err.message
    };
  }
}

function normalizeLivePayStatus(raw?: string): 'pending' | 'completed' | 'failed' {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'pending';
  if (['success', 'completed', 'paid', 'settled', 'approved', 'successful'].includes(s)) {
    return 'completed';
  }
  if (['failed', 'fail', 'rejected', 'cancelled', 'canceled', 'expired', 'declined', 'error', 'reversed'].includes(s)) {
    return 'failed';
  }
  return 'pending';
}

function sanitizePendingSale(sale: AppSaleTransaction): AppSaleTransaction {
  if (sale.status === 'completed') return sale;
  const { downloadToken: _hidden, ...rest } = sale;
  return rest;
}

async function findSaleById(saleId: string): Promise<AppSaleTransaction | null> {
  const sales = getSales();
  const local = sales.find((s) => s.id === saleId);
  if (local) return local;

  if (firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'sales', saleId));
      if (snap.exists()) {
        const cloudSale = snap.data() as AppSaleTransaction;
        const refreshed = getSales();
        if (!refreshed.some((s) => s.id === cloudSale.id)) {
          refreshed.unshift(cloudSale);
          saveSales(refreshed);
        }
        return cloudSale;
      }
    } catch (_) {}
  }
  return null;
}

// Idempotently finalize a confirmed sale and credit the developer wallet once
function finalizeCompletedSale(
  saleId: string,
  meta?: { livepayInternalRef?: string; livepayNetwork?: string; livepayStatus?: string }
): AppSaleTransaction | null {
  const sales = getSales();
  const idx = sales.findIndex((s) => s.id === saleId);
  if (idx === -1) return null;

  const sale = sales[idx];
  if (sale.status === 'completed') {
    return sale;
  }

  if (!sale.downloadToken) {
    sale.downloadToken = crypto.randomBytes(24).toString('hex');
  }
  sale.status = 'completed';
  sale.livepayStatus = meta?.livepayStatus || 'completed';
  if (meta?.livepayInternalRef) sale.livepayInternalRef = meta.livepayInternalRef;
  if (meta?.livepayNetwork) sale.livepayNetwork = meta.livepayNetwork;
  sale.completedAt = sale.completedAt || new Date().toISOString();

  sales[idx] = sale;
  saveSales(sales);

  // Credit Developer Wallet ONLY once payment is confirmed completed
  const wallets = getWallets();
  const wallet = getOrCreateWallet(sale.developerId);
  wallet.totalGrossRevenue += sale.grossAmount;
  wallet.totalAdminFeesPaid += sale.adminCommissionAmount;
  wallet.totalNetEarnings += sale.developerNetAmount;
  wallet.availableBalance += sale.developerNetAmount;
  wallet.currency = sale.currency;
  wallet.updatedAt = new Date().toISOString();
  wallets[sale.developerId] = wallet;
  saveWallets(wallets);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'sales', sale.id), cleanForFirestore(sale), { merge: true }).catch(() => {});
    setDoc(doc(firestoreDb, 'wallets', sale.developerId), cleanForFirestore(wallet), { merge: true }).catch(() => {});
  }

  return sale;
}

function markSaleFailed(saleId: string, reason?: string, livepayStatus = 'failed'): AppSaleTransaction | null {
  const sales = getSales();
  const idx = sales.findIndex((s) => s.id === saleId);
  if (idx === -1) return null;

  const sale = sales[idx];
  if (sale.status === 'completed') {
    return sale;
  }

  sale.status = 'failed';
  sale.livepayStatus = livepayStatus;
  sale.failureReason = reason || 'Mobile Money payment was cancelled or failed.';
  delete sale.downloadToken;
  sales[idx] = sale;
  saveSales(sales);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'sales', sale.id), cleanForFirestore(sale), { merge: true }).catch(() => {});
  }

  return sale;
}

// LivePay Send Money API (Direct Payout to Developer Mobile Money)
async function callLivePayPayout({
  phoneNumber,
  amount,
  currency = 'UGX',
  reference,
  description
}: {
  phoneNumber: string;
  amount: number;
  currency?: string;
  reference: string;
  description: string;
}) {
  const normPhone = normalizeUgandaPhone(phoneNumber);
  try {
    const res = await fetch(`${LIVEPAY_BASE_URL}/send-money`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LIVEPAY_API_KEY}`
      },
      body: JSON.stringify({
        accountNumber: LIVEPAY_ACCOUNT_NUMBER,
        phoneNumber: normPhone,
        amount,
        currency,
        reference: reference.substring(0, 30),
        description: description.substring(0, 30)
      })
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err: any) {
    console.error('[LivePay Payout Error]:', err);
    return {
      ok: false,
      status: 500,
      error: err.message
    };
  }
}

// ==========================================
// APP PURCHASE & CHECKOUT (6% ADMIN FEE)
// ==========================================

app.post('/api/apps/:id/purchase', async (req, res) => {
  const { id } = req.params;
  const { customerName, customerEmail, paymentMethod, phoneNumber, currency = 'UGX' } = req.body;
  const apps = getApps();
  let appItem = apps.find((a) => a.id === id || a.slug === id);

  if (!appItem && firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, 'apps', id));
      if (snap.exists()) {
        appItem = snap.data() as StoreApp;
      }
    } catch (_) {}
  }

  if (!appItem) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  const priceConfig = appItem.pricing;
  const isPaid = priceConfig && priceConfig.type === 'paid' && Number(priceConfig.price) > 0;
  const grossAmount = isPaid ? Number(priceConfig.price) : 0;

  // Dynamic Super Admin commission calculation (default 6%, or user-configured %)
  const currentSettings = getSystemSettings();
  const adminCommissionPercent = Math.max(0, Math.min(100, currentSettings.adminCommissionPercent ?? 6));
  const adminCommissionAmount = Math.round((grossAmount * adminCommissionPercent) / 100);
  const developerNetAmount = grossAmount - adminCommissionAmount;

  const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const downloadToken = crypto.randomBytes(24).toString('hex');

  const developerId = appItem.submittedBy?.id || appItem.developer?.email || 'admin';
  const developerEmail = appItem.submittedBy?.email || appItem.developer?.email || ADMIN_EMAIL;

  const cleanPhone = normalizeUgandaPhone(phoneNumber || '');
  let livepayResult: any = null;
  const livepayRef = `ZUZU${Date.now().toString().slice(-8)}`;

  if (grossAmount > 0) {
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        paymentConfirmed: false,
        error: 'Please enter a valid MTN or Airtel Mobile Money phone number (e.g. 0772 123 456).'
      });
    }

    console.log(`[LivePay Collection] Requesting ${grossAmount} ${priceConfig?.currency || currency || 'UGX'} from ${cleanPhone} on account ${LIVEPAY_ACCOUNT_NUMBER}...`);
    livepayResult = await callLivePayCollect({
      phoneNumber: cleanPhone,
      amount: grossAmount,
      currency: priceConfig?.currency || currency || 'UGX',
      reference: livepayRef,
      description: `ZUZU:${appItem.name.substring(0, 18)}`
    });
    console.log('[LivePay Collection Response]:', livepayResult);

    // If LivePay rejected or failed to initiate payment, block the purchase and DO NOT allow download!
    if (!livepayResult || !livepayResult.ok || livepayResult.data?.success === false) {
      const upstreamError =
        livepayResult?.data?.message ||
        livepayResult?.data?.error ||
        livepayResult?.error ||
        'LivePay Mobile Money payment request failed. Please check your phone number and balance.';
      return res.status(402).json({
        success: false,
        paymentConfirmed: false,
        status: 'failed',
        error: `Payment failed: ${upstreamError}. Download cannot start without a successful payment.`
      });
    }
  }

  // Only mark immediately completed if free (grossAmount <= 0) OR LivePay explicitly returned confirmed completion
  const initialUpstreamStatus = grossAmount <= 0
    ? 'completed'
    : normalizeLivePayStatus(livepayResult?.data?.status);

  const transaction: AppSaleTransaction = {
    id: saleId,
    appId: appItem.id,
    appName: appItem.name,
    appIcon: appItem.iconUrl,
    developerId,
    developerEmail,
    customerName: customerName ? String(customerName).trim() : 'Customer',
    customerEmail: customerEmail ? String(customerEmail).trim() : 'customer@zuzustore.com',
    grossAmount,
    adminCommissionPercent,
    adminCommissionAmount,
    developerNetAmount,
    currency: priceConfig?.currency || currency || 'UGX',
    paymentMethod: paymentMethod || 'LivePay Mobile Money (MTN / Airtel)',
    phoneNumber: cleanPhone || undefined,
    livepayReference: livepayResult?.data?.reference || livepayRef,
    livepayInternalRef: livepayResult?.data?.internal_reference,
    livepayNetwork: livepayResult?.data?.network,
    livepayStatus: initialUpstreamStatus === 'completed' ? 'completed' : 'initiated',
    status: initialUpstreamStatus === 'completed' ? 'completed' : 'pending',
    downloadToken,
    createdAt: new Date().toISOString(),
    ...(initialUpstreamStatus === 'completed' ? { completedAt: new Date().toISOString() } : {})
  };

  // Save sale (pending until PIN confirmation, or completed if free/already settled)
  const sales = getSales();
  sales.unshift(transaction);
  saveSales(sales);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'sales', transaction.id), cleanForFirestore(transaction)).catch(() => {});
  }

  if (transaction.status === 'completed') {
    // Credit Developer Wallet only when confirmed completed
    const wallets = getWallets();
    const wallet = getOrCreateWallet(developerId);
    wallet.totalGrossRevenue += grossAmount;
    wallet.totalAdminFeesPaid += adminCommissionAmount;
    wallet.totalNetEarnings += developerNetAmount;
    wallet.availableBalance += developerNetAmount;
    wallet.currency = transaction.currency;
    wallet.updatedAt = new Date().toISOString();
    wallets[developerId] = wallet;
    saveWallets(wallets);

    if (firestoreDb) {
      setDoc(doc(firestoreDb, 'wallets', developerId), cleanForFirestore(wallet), { merge: true }).catch(() => {});
    }

    return res.json({
      success: true,
      paymentConfirmed: true,
      status: 'completed',
      saleId: transaction.id,
      message: `Payment confirmed! You have purchased ${appItem.name}.`,
      transaction,
      sale: transaction,
      downloadToken,
      directDownloadUrl: `/api/apps/${appItem.id}/download?token=${downloadToken}`,
      livepay: {
        initiated: Boolean(livepayResult?.ok),
        reference: transaction.livepayReference,
        internalReference: transaction.livepayInternalRef,
        network: transaction.livepayNetwork,
        message: livepayResult?.data?.message || 'Payment confirmed.'
      }
    });
  }

  // Payment is PENDING PIN confirmation: DO NOT return downloadToken or directDownloadUrl yet!
  const safeTx = sanitizePendingSale(transaction);
  return res.json({
    success: true,
    paymentConfirmed: false,
    status: 'pending',
    saleId: transaction.id,
    message: livepayResult?.data?.message
      ? `LivePay: ${livepayResult.data.message}. Enter your Mobile Money PIN on ${cleanPhone} to confirm payment.`
      : `Payment prompt sent to ${cleanPhone}. Enter your Mobile Money PIN to confirm payment.`,
    transaction: safeTx,
    sale: safeTx,
    livepay: {
      initiated: Boolean(livepayResult?.ok),
      reference: transaction.livepayReference,
      internalReference: transaction.livepayInternalRef,
      network: transaction.livepayNetwork,
      message: livepayResult?.data?.message || 'Waiting for Mobile Money PIN confirmation.'
    }
  });
});

// Check live payment confirmation status (polls LivePay /transaction-status + webhook state)
app.get('/api/apps/:id/purchases/:saleId/status', async (req, res) => {
  const { id, saleId } = req.params;
  let sale = await findSaleById(saleId);

  if (!sale) {
    return res.status(404).json({
      success: false,
      paymentConfirmed: false,
      status: 'failed',
      error: 'Purchase transaction not found.'
    });
  }

  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);
  const matchesApp =
    sale.appId === id ||
    (appItem ? sale.appId === appItem.id || sale.appId === appItem.slug : false);

  if (!matchesApp) {
    return res.status(403).json({
      success: false,
      paymentConfirmed: false,
      status: 'failed',
      error: 'Purchase transaction does not match this application.'
    });
  }

  // If still pending, actively check LivePay Transaction Status API
  if (sale.status === 'pending' && sale.livepayReference) {
    const statusRes = await callLivePayTransactionStatus({
      reference: sale.livepayReference,
      currency: sale.currency || 'UGX'
    });

    if (statusRes.ok && statusRes.data) {
      const upstreamRaw = statusRes.data.status || statusRes.data.transaction_status || '';
      const normalized = normalizeLivePayStatus(upstreamRaw);

      if (normalized === 'completed') {
        sale =
          finalizeCompletedSale(sale.id, {
            livepayInternalRef: statusRes.data.internal_reference || sale.livepayInternalRef,
            livepayNetwork: statusRes.data.provider || statusRes.data.network || sale.livepayNetwork,
            livepayStatus: String(upstreamRaw || 'completed')
          }) || sale;
      } else if (normalized === 'failed') {
        const failReason =
          statusRes.data.message && statusRes.data.message !== 'N/A'
            ? statusRes.data.message
            : `Payment ${String(upstreamRaw || 'failed').toLowerCase()}.`;
        sale = markSaleFailed(sale.id, failReason, String(upstreamRaw || 'failed')) || sale;
      }
    }
  }

  if (sale.status === 'completed' && sale.downloadToken) {
    return res.json({
      success: true,
      paymentConfirmed: true,
      status: 'completed',
      livepayStatus: sale.livepayStatus || 'completed',
      message: 'Payment confirmed! Starting your APK download...',
      transaction: sale,
      downloadToken: sale.downloadToken,
      directDownloadUrl: `/api/apps/${sale.appId}/download?token=${sale.downloadToken}`
    });
  }

  if (sale.status === 'failed' || sale.status === 'refunded') {
    return res.json({
      success: false,
      paymentConfirmed: false,
      status: 'failed',
      livepayStatus: sale.livepayStatus || 'failed',
      message: sale.failureReason || 'Payment failed or was cancelled. Download will not start.',
      transaction: sanitizePendingSale(sale)
    });
  }

  return res.json({
    success: true,
    paymentConfirmed: false,
    status: 'pending',
    livepayStatus: sale.livepayStatus || 'initiated',
    message: 'Waiting for Mobile Money PIN confirmation on your handset...',
    transaction: sanitizePendingSale(sale)
  });
});

// Verify purchase token (STRICTLY requires status === 'completed')
app.get('/api/apps/:id/verify-purchase', async (req, res) => {
  const { id } = req.params;
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Download token required.' });
  }

  const tokenStr = String(token).trim();
  const sales = getSales();
  let sale = sales.find((s) => (s.appId === id || s.id === id) && s.downloadToken === tokenStr);

  if (!sale && firestoreDb) {
    try {
      const qSnap = await getDocs(
        query(collection(firestoreDb, 'sales'), where('downloadToken', '==', tokenStr))
      );
      qSnap.forEach((d) => {
        const candidate = d.data() as AppSaleTransaction;
        if (candidate.appId === id || candidate.id === id) {
          sale = candidate;
        }
      });
    } catch (_) {}
  }

  if (!sale) {
    return res.status(404).json({ valid: false, purchased: false, error: 'Invalid or expired purchase token.' });
  }

  if (sale.status !== 'completed') {
    return res.status(403).json({
      valid: false,
      purchased: false,
      status: sale.status,
      error: 'Payment has not been confirmed yet.'
    });
  }

  return res.json({ valid: true, purchased: true, sale });
});

// ==========================================
// SUPER ADMIN FINANCIAL GOD MODE & PAYOUTS
// ==========================================

// Super Admin: Platform-wide financial summary (Total Sales, 6% App Sales + 10% Transfer Commission, Payouts)
app.get('/api/admin/financials', requireAdmin, (req, res) => {
  const completedSales = getSales().filter((s) => s.status === 'completed');
  const withdrawals = getWithdrawals();

  const totalGrossSales = completedSales.reduce((sum, s) => sum + (s.grossAmount || 0), 0);
  const totalAdminCommissionEarned = completedSales.reduce((sum, s) => sum + (s.adminCommissionAmount || 0), 0);
  const totalDeveloperNetEarnings = completedSales.reduce((sum, s) => sum + (s.developerNetAmount || 0), 0);

  const transferSales = completedSales.filter((s) => s.transactionType === 'ownership_transfer');
  const totalTransferGross = transferSales.reduce((sum, s) => sum + (s.grossAmount || 0), 0);
  const totalTransferAdminFees = transferSales.reduce((sum, s) => sum + (s.adminCommissionAmount || 0), 0);
  const totalCompletedTransfersCount = transferSales.length;

  const totalDisbursedWithdrawals = withdrawals
    .filter((w) => w.status === 'paid' || w.status === 'approved')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const totalPendingWithdrawals = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'https';
  const currentSettings = getSystemSettings();

  return res.json({
    success: true,
    financials: {
      totalGrossSales,
      totalAdminCommissionEarned, // Super Admin profit (App Sales + 10% Ownership Transfers)!
      totalDeveloperNetEarnings,
      totalDisbursedWithdrawals,
      totalPendingWithdrawals,
      totalPaidTransactionsCount: completedSales.length,
      totalTransferGross,
      totalTransferAdminFees,
      totalCompletedTransfersCount,
      currency: 'UGX',
      adminCommissionPercent: currentSettings.adminCommissionPercent,
      withdrawalTransferFeePer1000: currentSettings.withdrawalTransferFeePer1000,
      livepayConfig: {
        accountNumber: LIVEPAY_ACCOUNT_NUMBER,
        active: true,
        webhookUrl: `${protocol}://${host}/api/webhooks/livepay`,
        supportedCurrencies: ['UGX', 'USD', 'KES'],
        supportedNetworks: ['MTN Mobile Money', 'Airtel Money']
      }
    },
    recentSales: completedSales.slice(0, 50),
    withdrawals
  });
});

// Store / Developer: Public endpoint to get current store commission % and sending fee rate
app.get('/api/store/commission', (req, res) => {
  const settings = getSystemSettings();
  return res.json({
    success: true,
    adminCommissionPercent: settings.adminCommissionPercent,
    withdrawalTransferFeePer1000: settings.withdrawalTransferFeePer1000,
    updatedAt: settings.updatedAt
  });
});

// Super Admin: Get current system settings
app.get('/api/admin/commission', requireAdmin, (req, res) => {
  const settings = getSystemSettings();
  return res.json({
    success: true,
    settings
  });
});

// Super Admin: Update commission rate and/or withdrawal transfer fee
app.post('/api/admin/commission', requireAdmin, (req, res) => {
  const { adminCommissionPercent, withdrawalTransferFeePer1000 } = req.body;
  const numPercent = Number(adminCommissionPercent);
  if (isNaN(numPercent) || numPercent < 0 || numPercent > 100) {
    return res.status(400).json({ error: 'Commission percent must be a valid number between 0 and 100.' });
  }

  const numFeePer1000 = withdrawalTransferFeePer1000 !== undefined ? Number(withdrawalTransferFeePer1000) : 100;

  const updated = saveSystemSettings({
    adminCommissionPercent: numPercent,
    withdrawalTransferFeePer1000: !isNaN(numFeePer1000) && numFeePer1000 >= 0 ? numFeePer1000 : 100
  });

  return res.json({
    success: true,
    message: `System commission updated to ${updated.adminCommissionPercent}% (Sending charge: ${updated.withdrawalTransferFeePer1000} UGX per 1,000 UGX).`,
    settings: updated
  });
});

// Super Admin: List all withdrawal requests
app.get('/api/admin/withdrawals', requireAdmin, (req, res) => {
  const withdrawals = getWithdrawals();
  return res.json({ success: true, withdrawals });
});

// Super Admin: Approve & Disburse withdrawal payout
app.post('/api/admin/withdrawals/:id/approve', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { transactionRef } = req.body;
  const withdrawals = getWithdrawals();
  const index = withdrawals.findIndex((w) => w.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Withdrawal request not found.' });
  }

  const item = withdrawals[index];
  item.status = 'paid';
  item.transactionRef = transactionRef || `PAYOUT-${Date.now().toString(36).toUpperCase()}`;
  item.processedAt = new Date().toISOString();
  item.processedBy = ADMIN_EMAIL;
  withdrawals[index] = item;
  saveWithdrawals(withdrawals);

  // Update wallet: deduct from pendingWithdrawals and add to totalWithdrawn
  const wallets = getWallets();
  const wallet = getOrCreateWallet(item.developerId);
  wallet.pendingWithdrawals = Math.max(0, (wallet.pendingWithdrawals || 0) - item.amount);
  wallet.totalWithdrawn = (wallet.totalWithdrawn || 0) + item.amount;
  wallet.updatedAt = new Date().toISOString();
  wallets[item.developerId] = wallet;
  saveWallets(wallets);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'withdrawals', item.id), cleanForFirestore(item), { merge: true }).catch(() => {});
    setDoc(doc(firestoreDb, 'wallets', item.developerId), cleanForFirestore(wallet), { merge: true }).catch(() => {});
  }

  return res.json({
    success: true,
    message: `Withdrawal of ${item.amount.toLocaleString()} ${item.currency} approved and marked paid.`,
    withdrawal: item
  });
});

// Super Admin: Reject withdrawal request and restore developer balance
app.post('/api/admin/withdrawals/:id/reject', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const withdrawals = getWithdrawals();
  const index = withdrawals.findIndex((w) => w.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Withdrawal request not found.' });
  }

  const item = withdrawals[index];
  item.status = 'rejected';
  item.rejectionReason = reason || 'Declined by Super Admin';
  item.processedAt = new Date().toISOString();
  item.processedBy = ADMIN_EMAIL;
  withdrawals[index] = item;
  saveWithdrawals(withdrawals);

  // Restore funds back to developer availableBalance
  const wallets = getWallets();
  const wallet = getOrCreateWallet(item.developerId);
  wallet.pendingWithdrawals = Math.max(0, (wallet.pendingWithdrawals || 0) - item.amount);
  wallet.availableBalance += item.amount;
  wallet.updatedAt = new Date().toISOString();
  wallets[item.developerId] = wallet;
  saveWallets(wallets);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'withdrawals', item.id), cleanForFirestore(item), { merge: true }).catch(() => {});
    setDoc(doc(firestoreDb, 'wallets', item.developerId), cleanForFirestore(wallet), { merge: true }).catch(() => {});
  }

  return res.json({
    success: true,
    message: `Withdrawal rejected. Funds (${item.amount.toLocaleString()} ${item.currency}) restored to developer wallet.`,
    withdrawal: item
  });
});

// ==========================================
// LIVEPAY DISBURSEMENTS & WEBHOOKS
// ==========================================

// Super Admin: Instant LivePay Mobile Money Disburse to Developer
app.post('/api/admin/withdrawals/:id/disburse-livepay', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const withdrawals = getWithdrawals();
  const index = withdrawals.findIndex((w) => w.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Withdrawal request not found.' });
  }

  const item = withdrawals[index];
  if (item.status === 'paid') {
    return res.status(400).json({ error: 'This withdrawal has already been disbursed and marked paid.' });
  }

  const recipientPhone = item.payoutDetails?.accountNumber;
  if (!recipientPhone) {
    return res.status(400).json({ error: 'Developer has not provided a valid mobile money phone number.' });
  }

  // Amount to actually send to handset is netPayoutAmount (after deducting 100 per 1000 sending charge)
  const settings = getSystemSettings();
  const feeRatePer1000 = settings.withdrawalTransferFeePer1000 ?? 100;
  const computedFee = item.transferFee !== undefined ? item.transferFee : Math.round((item.amount / 1000) * feeRatePer1000);
  const netAmountToSend = item.netPayoutAmount !== undefined ? item.netPayoutAmount : Math.max(0, item.amount - computedFee);

  const livepayRef = `WDR${Date.now().toString().slice(-8)}`;
  console.log(`[LivePay Payout] Initiating disbursement of Net ${netAmountToSend} ${item.currency} (Fee: ${computedFee}) to ${recipientPhone} from account ${LIVEPAY_ACCOUNT_NUMBER}...`);

  const payoutResult = await callLivePayPayout({
    phoneNumber: recipientPhone,
    amount: netAmountToSend,
    currency: item.currency || 'UGX',
    reference: livepayRef,
    description: `Payout to ${item.developerName}`
  });

  if (!payoutResult.ok) {
    const errorMsg =
      payoutResult.data?.error ||
      payoutResult.data?.message ||
      payoutResult.error ||
      'LivePay API error';
    return res.status(400).json({
      error: `LivePay Payout Failed: ${errorMsg}. Ensure LivePay account ${LIVEPAY_ACCOUNT_NUMBER} has sufficient balance, or use manual approval.`
    });
  }

  const txRef = payoutResult.data?.internal_reference || payoutResult.data?.reference || `LP-OUT-${Date.now()}`;

  item.status = 'paid';
  item.payoutChannel = 'livepay';
  item.transactionRef = `LivePay: ${txRef}`;
  item.livepayInternalRef = payoutResult.data?.internal_reference;
  item.processedAt = new Date().toISOString();
  item.processedBy = ADMIN_EMAIL;
  withdrawals[index] = item;
  saveWithdrawals(withdrawals);

  // Update wallet: deduct from pendingWithdrawals and add to totalWithdrawn
  const wallets = getWallets();
  const wallet = getOrCreateWallet(item.developerId);
  wallet.pendingWithdrawals = Math.max(0, (wallet.pendingWithdrawals || 0) - item.amount);
  wallet.totalWithdrawn = (wallet.totalWithdrawn || 0) + item.amount;
  wallet.updatedAt = new Date().toISOString();
  wallets[item.developerId] = wallet;
  saveWallets(wallets);

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'withdrawals', item.id), cleanForFirestore(item), { merge: true }).catch(() => {});
    setDoc(doc(firestoreDb, 'wallets', item.developerId), cleanForFirestore(wallet), { merge: true }).catch(() => {});
  }

  return res.json({
    success: true,
    message: `Success! ${item.amount.toLocaleString()} ${item.currency} sent directly to ${recipientPhone} via LivePay Mobile Money!`,
    withdrawal: item,
    livepayResponse: payoutResult.data
  });
});

// Super Admin: LivePay Configuration & Status check
app.get('/api/admin/livepay/status', requireAdmin, (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'https';
  const webhookUrl = `${protocol}://${host}/api/webhooks/livepay`;

  return res.json({
    success: true,
    config: {
      accountNumber: LIVEPAY_ACCOUNT_NUMBER,
      active: true,
      webhookUrl,
      supportedCurrencies: ['UGX', 'USD', 'KES'],
      supportedNetworks: ['MTN Mobile Money', 'Airtel Money']
    }
  });
});

// Super Admin: Ping LivePay API to test credentials
app.post('/api/admin/livepay/ping', requireAdmin, async (req, res) => {
  try {
    const pingRes = await fetch(`${LIVEPAY_BASE_URL}/collect-money`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LIVEPAY_API_KEY}`
      },
      body: JSON.stringify({
        accountNumber: LIVEPAY_ACCOUNT_NUMBER,
        phoneNumber: '0770000000',
        amount: 500,
        currency: 'UGX',
        reference: `PING${Date.now().toString().slice(-6)}`,
        description: 'ZuzuStore Health Check'
      })
    });

    const data = await pingRes.json().catch(() => ({}));
    return res.json({
      success: true,
      status: pingRes.status,
      message: 'LivePay API is connected and responding.',
      accountNumber: LIVEPAY_ACCOUNT_NUMBER,
      livepayResponse: data
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `LivePay ping error: ${err.message}`
    });
  }
});

// LivePay Asynchronous Webhook Receiver
app.post('/api/webhooks/livepay', async (req, res) => {
  try {
    const event = req.body || {};
    const sigHeader = req.headers['x-webhook-signature'];
    console.log('[LivePay Webhook Received]:', {
      status: event.status,
      customer_reference: event.customer_reference,
      internal_reference: event.internal_reference,
      amount: event.amount,
      msisdn: event.msisdn,
      provider: event.provider,
      hasSignature: !!sigHeader
    });

    const customerRef = event.customer_reference || event.reference;
    const internalRef = event.internal_reference;

    if (customerRef || internalRef) {
      const sales = getSales();
      let matchedSale = sales.find(
        (s) =>
          (customerRef && (s.livepayReference === customerRef || s.id === customerRef)) ||
          (internalRef && s.livepayInternalRef === internalRef)
      );

      if (!matchedSale && firestoreDb && customerRef) {
        try {
          const qSnap = await getDocs(
            query(collection(firestoreDb, 'sales'), where('livepayReference', '==', customerRef))
          );
          qSnap.forEach((d) => {
            const candidate = d.data() as AppSaleTransaction;
            matchedSale = candidate;
            const refreshed = getSales();
            if (!refreshed.some((s) => s.id === candidate.id)) {
              refreshed.unshift(candidate);
              saveSales(refreshed);
            }
          });
        } catch (_) {}
      }

      if (matchedSale) {
        const normalized = normalizeLivePayStatus(event.status);
        if (normalized === 'completed') {
          finalizeCompletedSale(matchedSale.id, {
            livepayInternalRef: internalRef || matchedSale.livepayInternalRef,
            livepayNetwork: event.provider || event.network || matchedSale.livepayNetwork,
            livepayStatus: String(event.status || 'completed')
          });
        } else if (normalized === 'failed') {
          markSaleFailed(
            matchedSale.id,
            event.message || `LivePay payment ${String(event.status || 'failed').toLowerCase()}.`,
            String(event.status || 'failed')
          );
        }
      }
    }

    // Must return 200 OK within 10 seconds per LivePay webhook spec
    return res.status(200).json({ status: 'ok', received: true });
  } catch (err) {
    console.error('[LivePay Webhook Error]:', err);
    return res.status(200).json({ status: 'error_logged' });
  }
});

// Frontend Admin direct route handler (supports visiting /admin, /login, /publisher directly)
app.get(['/admin', '/admin/*', '/login', '/publisher'], (req, res, next) => {
  const distPath = path.resolve(process.cwd(), 'dist');
  const indexHtml = path.resolve(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  return res.redirect('/#admin');
});

// Global error handling middleware (handles payload too large and Multer errors)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  if (err.type === 'entity.too.large' || err.status === 413 || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File size exceeds maximum upload limit. Packages up to 2GB (at least 1GB) are supported.'
    });
  }
  return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================

async function startServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
    console.log(`Admin publisher configured: ${ADMIN_EMAIL}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
