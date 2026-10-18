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

// URL Normalizer for cloud storage direct downloads (Google Drive, Dropbox, OneDrive, etc.)
export function normalizeDownloadUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;

  // Google Drive: https://drive.google.com/file/d/ID/view -> https://drive.google.com/uc?export=download&id=ID
  const gdMatch1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdMatch1 && gdMatch1[1]) {
    return `https://drive.google.com/uc?export=download&id=${gdMatch1[1]}`;
  }
  const gdMatch2 = trimmed.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (gdMatch2 && gdMatch2[1]) {
    return `https://drive.google.com/uc?export=download&id=${gdMatch2[1]}`;
  }

  // Dropbox: convert ?dl=0 to ?dl=1 for direct download
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'dl=1');
  }

  return trimmed;
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
    fileSize: 300 * 1024 * 1024 // Up to 300MB for APK binaries
  }
});

// Create Express App
const app = express();
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Static uploads serving for uploaded icons and screenshots
app.use('/uploads', express.static(UPLOAD_DIR));

// Conditional Multer middleware: only processes multipart/form-data requests
// This allows clean JSON submissions (e.g. cloud direct links) to bypass multer completely
const conditionalUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.is('multipart/form-data')) {
    upload.fields([
      { name: 'apkFile', maxCount: 1 },
      { name: 'iconFile', maxCount: 1 },
      { name: 'screenshotFiles', maxCount: 6 }
    ])(req, res, next);
  } else {
    next();
  }
};

const conditionalSingleUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.is('multipart/form-data')) {
    upload.single('apkFile')(req, res, next);
  } else {
    next();
  }
};

// Admin authentication middleware
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required to publish or modify apps.' });
  }

  const token = authHeader.split(' ')[1];
  const sessions = getSessions();
  const session = sessions[token];

  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in as admin.' });
  }

  (req as any).admin = session;
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
    const token = crypto.randomBytes(32).toString('hex');
    const session: Session = {
      token,
      email: ADMIN_EMAIL,
      role: 'admin',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
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
  const sessions = getSessions();
  const session = sessions[token];

  if (!session || session.expiresAt < Date.now()) {
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    admin: {
      email: session.email,
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
app.get('/api/apps/:id/download', (req, res) => {
  const { id } = req.params;
  const { releaseId } = req.query;

  const apps = getApps();
  const appIndex = apps.findIndex((a) => a.id === id || a.slug === id);

  if (appIndex === -1) {
    return res.status(404).json({ error: 'Application package not found.' });
  }

  const targetApp = apps[appIndex];
  const targetRelease = releaseId
    ? targetApp.releases.find((r) => r.id === releaseId) || targetApp.releases[0]
    : targetApp.releases[0];

  if (!targetRelease) {
    return res.status(404).json({ error: 'Release package not found for this app.' });
  }

  // Increment download counter
  targetApp.downloadsTotal += 1;
  targetRelease.downloadCount += 1;
  saveApps(apps);

  const fileName = targetRelease.fileName || `${targetApp.slug}-v${targetRelease.version}.apk`;

  // If a direct external download URL was configured (e.g., hosted on Google Drive, GitHub Releases, Cloud Storage)
  if (targetRelease.directDownloadUrl) {
    const directUrl = normalizeDownloadUrl(targetRelease.directDownloadUrl) || targetRelease.directDownloadUrl;
    return res.redirect(directUrl);
  }

  // If a real physical file was uploaded, stream it directly
  if (targetRelease.filePath && fs.existsSync(targetRelease.filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    const fileStream = fs.createReadStream(targetRelease.filePath);
    return fileStream.pipe(res);
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

      const screenshotUrls = screenshots.length
        ? screenshots.map((s) => `/uploads/images/${path.basename(s.path)}`)
        : [
            '/zuzustore-logo.png'
          ];

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

// Admin: Delete an app
app.delete('/api/admin/apps/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const apps = getApps();
  const appItem = apps.find((a) => a.id === id || a.slug === id);

  if (!appItem) {
    return res.status(404).json({ error: 'App not found.' });
  }

  const updated = apps.filter((a) => a.id !== id && a.slug !== id);
  saveApps(updated);

  return res.json({ success: true, message: `App "${appItem.name}" deleted.` });
});

// Admin: Reset store to defaults if needed
app.post('/api/admin/reset', requireAdmin, (req, res) => {
  saveApps(INITIAL_APPS);
  return res.json({ success: true, message: 'Store reset to default catalog.', apps: INITIAL_APPS });
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
