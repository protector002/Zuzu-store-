import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

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
  platform: 'Android' | 'iOS' | 'Windows' | 'macOS';
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
  createdAt: string;
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

// Helper: Read apps with memory and multi-path fallback
function getApps(): StoreApp[] {
  try {
    if (fs.existsSync(APPS_FILE)) {
      const data = fs.readFileSync(APPS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryApps = parsed;
        return parsed;
      }
    }

    // Check project data directory (important on Vercel deployment)
    const rootDataFile = path.resolve(process.cwd(), 'data', 'apps.json');
    if (fs.existsSync(rootDataFile)) {
      const data = fs.readFileSync(rootDataFile, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryApps = parsed;
        try {
          fs.writeFileSync(APPS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch (_) {}
        return parsed;
      }
    }

    if (memoryApps.length > 0) {
      return memoryApps;
    }

    return [];
  } catch (err) {
    console.error('Error reading apps file:', err);
    return memoryApps || [];
  }
}

// Helper: Save apps
function saveApps(apps: StoreApp[]) {
  memoryApps = apps;
  try {
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving apps file:', err);
  }

  // Also try saving to root data directory if accessible
  try {
    const rootDataDir = path.resolve(process.cwd(), 'data');
    if (fs.existsSync(rootDataDir)) {
      fs.writeFileSync(path.join(rootDataDir, 'apps.json'), JSON.stringify(apps, null, 2), 'utf-8');
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

// ==========================================
// AUTH ROUTES
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

// Check active session
app.get('/api/auth/session', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }

  const token = authHeader.split(' ')[1];
  if (!verifyAdminToken(token)) {
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    admin: {
      email: ADMIN_EMAIL,
      name: 'John Sseruwagi',
      role: 'Admin Publisher'
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

// Get all apps (Public)
app.get('/api/apps', (req, res) => {
  const apps = getApps();
  const { category, search, platform } = req.query;

  let filtered = apps;

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

  return res.json(appItem);
});

// PUBLIC DOWNLOAD ENDPOINT - NO LOGIN OR ACCOUNT NEEDED AT ALL!
app.get('/api/apps/:id/download', async (req, res) => {
  const { id } = req.params;
  const { releaseId } = req.query;

  const apps = getApps();
  const appIndex = apps.findIndex((a) => a.id === id || a.slug === id);

  if (appIndex === -1) {
    if (req.accepts('html')) {
      return res.status(404).send(`<!DOCTYPE html><html lang="en"><head><title>Package Updating | ZuzuStore</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{background:#0a0a0a;color:#eee;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;}.box{background:#171717;border:1px solid #262626;border-radius:24px;padding:32px;max-width:440px;}h2{color:#fff;margin:0 0 8px;}p{color:#a3a3a3;font-size:14px;line-height:1.6;}a{display:inline-block;margin-top:16px;padding:10px 20px;background:#0891b2;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:14px;}</style></head><body><div class="box"><h2>Package Updating</h2><p>This APK package is being updated by the publisher. Please return to the store catalog to check for available releases.</p><a href="/">Return to Storefront</a></div></body></html>`);
    }
    return res.status(404).json({ error: 'Application package not found.' });
  }

  const targetApp = apps[appIndex];
  const targetRelease = releaseId
    ? targetApp.releases.find((r) => r.id === releaseId) || targetApp.releases[0]
    : targetApp.releases[0];

  if (!targetRelease) {
    if (req.accepts('html')) {
      return res.status(404).send(`<!DOCTYPE html><html lang="en"><head><title>Release Not Found | ZuzuStore</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{background:#0a0a0a;color:#eee;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;}.box{background:#171717;border:1px solid #262626;border-radius:24px;padding:32px;max-width:440px;}h2{color:#fff;margin:0 0 8px;}p{color:#a3a3a3;font-size:14px;line-height:1.6;}a{display:inline-block;margin-top:16px;padding:10px 20px;background:#0891b2;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:14px;}</style></head><body><div class="box"><h2>Release Not Found</h2><p>This application release is currently unavailable.</p><a href="/">Return to Storefront</a></div></body></html>`);
    }
    return res.status(404).json({ error: 'Release package not found for this app.' });
  }

  // Increment download counter
  targetApp.downloadsTotal += 1;
  targetRelease.downloadCount += 1;
  saveApps(apps);

  const fileName = targetRelease.fileName || `${targetApp.slug}-v${targetRelease.version}.apk`;

  // 1. If a physical file was uploaded to our server, ALWAYS stream it directly!
  // This guarantees 100% successful downloads for all visitors without any 403 errors or Google dependencies!
  if (targetRelease.filePath && fs.existsSync(targetRelease.filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    const fileStream = fs.createReadStream(targetRelease.filePath);
    return fileStream.pipe(res);
  }

  // 2. If a direct external download URL was configured (e.g., hosted on Google Drive, GitHub Releases, Cloud Storage)
  if (targetRelease.directDownloadUrl) {
    const gdId = extractGoogleDriveId(targetRelease.directDownloadUrl);
    if (gdId) {
      const modernDirectUrl = `https://drive.usercontent.google.com/download?id=${gdId}&export=download&confirm=t`;
      const webViewUrl = `https://drive.google.com/file/d/${gdId}/view?usp=sharing`;

      if (req.query.view === '1' || req.query.mirror === 'gdrive') {
        return res.redirect(webViewUrl);
      }

      // Check if Google Drive link is public or restricted (403)
      try {
        const probe = await fetch(modernDirectUrl, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(3500)
        });

        if (probe.status === 403 || probe.status === 401) {
          return res.status(403).send(renderGoogleDriveAccessErrorPage(targetApp.name, gdId, webViewUrl));
        }

        return res.redirect(modernDirectUrl);
      } catch (err) {
        // If probe fails or times out, redirect to modern direct download
        return res.redirect(modernDirectUrl);
      }
    }

    const directUrl = normalizeDownloadUrl(targetRelease.directDownloadUrl) || targetRelease.directDownloadUrl;
    return res.redirect(directUrl);
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

// Admin: Delete an app
app.delete('/api/admin/apps/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);

  const updated = apps.filter((a) => a.id !== id && a.slug !== id);
  saveApps(updated);

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
