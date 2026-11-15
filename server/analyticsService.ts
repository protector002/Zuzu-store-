import fs from 'fs';
import path from 'path';

export type DeviceCategory =
  | 'Android Mobile'
  | 'Smart TV / Android TV'
  | 'Desktop'
  | 'iOS / iPadOS'
  | 'Tablet / Other';

export interface DailyAnalyticsBucket {
  date: string;
  downloads: number;
  visits: number;
  devices: Record<string, number>;
  appDownloads: Record<string, number>;
  releaseDownloads: Record<string, number>;
}

export interface AnalyticsRollupStore {
  daily: Record<string, DailyAnalyticsBucket>;
  updatedAt: string;
}

export interface AnalyticsDailyPoint {
  date: string;
  label: string;
  downloads: number;
  visits: number;
  paidOrders: number;
}

export interface TopAppVersionStat {
  key: string;
  appId: string;
  appName: string;
  version: string;
  label: string;
  platform: string;
  fileSize: string;
  releaseDate: string;
  downloads: number;
  sharePercent: number;
}

export interface DeviceDistributionStat {
  device: DeviceCategory;
  count: number;
  sharePercent: number;
  color: string;
}

export interface AnalyticsDashboardReport {
  days: number;
  appId: string;
  generatedAt: string;
  deviceDataSource: 'live_telemetry' | 'platform_catalog';
  summary: {
    totalAllTimeDownloads: number;
    windowDownloads: number;
    windowVisits: number;
    trackedVersionsCount: number;
    activeAppsCount: number;
    paidOrdersWindow: number;
    topDeviceLabel: string;
    topDeviceShare: number;
    topVersionLabel: string;
    topVersionDownloads: number;
  };
  dailyTrends: AnalyticsDailyPoint[];
  topVersions: TopAppVersionStat[];
  deviceDistribution: DeviceDistributionStat[];
  appOptions: Array<{ id: string; name: string }>;
}

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');

const DEVICE_COLORS: Record<DeviceCategory, string> = {
  'Android Mobile': '#06b6d4',
  'Smart TV / Android TV': '#f59e0b',
  Desktop: '#6366f1',
  'iOS / iPadOS': '#10b981',
  'Tablet / Other': '#a855f7'
};

let memoryRollup: AnalyticsRollupStore = {
  daily: {},
  updatedAt: new Date().toISOString()
};
let rollupLoadedFromDisk = false;
let firestoreSyncHandler: ((store: AnalyticsRollupStore) => Promise<void>) | null = null;
let lastFirestoreSyncAt = 0;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {}
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadRollupFromDisk(): AnalyticsRollupStore {
  if (rollupLoadedFromDisk) return memoryRollup;
  rollupLoadedFromDisk = true;
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const raw = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as AnalyticsRollupStore;
      if (parsed && typeof parsed.daily === 'object' && parsed.daily !== null) {
        memoryRollup = parsed;
      }
    }
  } catch (_) {}
  return memoryRollup;
}

function persistRollup(forceCloudSync = false): void {
  memoryRollup.updatedAt = new Date().toISOString();
  pruneOldBuckets(90);

  ensureDataDir();
  try {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(memoryRollup, null, 2), 'utf-8');
  } catch (_) {}

  const now = Date.now();
  if (firestoreSyncHandler && (forceCloudSync || now - lastFirestoreSyncAt > 4000)) {
    lastFirestoreSyncAt = now;
    firestoreSyncHandler(memoryRollup).catch(() => {});
  }
}

function pruneOldBuckets(maxDays: number): void {
  const keys = Object.keys(memoryRollup.daily).sort();
  if (keys.length <= maxDays) return;
  const toDelete = keys.slice(0, keys.length - maxDays);
  for (const k of toDelete) {
    delete memoryRollup.daily[k];
  }
}

function getOrCreateDailyBucket(dateStr: string): DailyAnalyticsBucket {
  const store = loadRollupFromDisk();
  if (!store.daily[dateStr]) {
    store.daily[dateStr] = {
      date: dateStr,
      downloads: 0,
      visits: 0,
      devices: {},
      appDownloads: {},
      releaseDownloads: {}
    };
  }
  const bucket = store.daily[dateStr];
  if (!bucket.devices) bucket.devices = {};
  if (!bucket.appDownloads) bucket.appDownloads = {};
  if (!bucket.releaseDownloads) bucket.releaseDownloads = {};
  return bucket;
}

export function registerAnalyticsFirestoreSync(
  handler: (store: AnalyticsRollupStore) => Promise<void>
): void {
  firestoreSyncHandler = handler;
}

export function hydrateAnalyticsFromCloud(cloudStore: AnalyticsRollupStore | null | undefined): void {
  if (!cloudStore || typeof cloudStore.daily !== 'object' || !cloudStore.daily) return;
  const local = loadRollupFromDisk();
  const mergedDaily: Record<string, DailyAnalyticsBucket> = { ...local.daily };

  for (const [dateKey, cloudBucket] of Object.entries(cloudStore.daily)) {
    if (!cloudBucket) continue;
    const existing = mergedDaily[dateKey];
    if (!existing) {
      mergedDaily[dateKey] = {
        date: dateKey,
        downloads: Number(cloudBucket.downloads || 0),
        visits: Number(cloudBucket.visits || 0),
        devices: { ...(cloudBucket.devices || {}) },
        appDownloads: { ...(cloudBucket.appDownloads || {}) },
        releaseDownloads: { ...(cloudBucket.releaseDownloads || {}) }
      };
    } else {
      existing.downloads = Math.max(existing.downloads || 0, Number(cloudBucket.downloads || 0));
      existing.visits = Math.max(existing.visits || 0, Number(cloudBucket.visits || 0));
      for (const [devKey, cnt] of Object.entries(cloudBucket.devices || {})) {
        existing.devices[devKey] = Math.max(existing.devices[devKey] || 0, Number(cnt || 0));
      }
      for (const [appKey, cnt] of Object.entries(cloudBucket.appDownloads || {})) {
        existing.appDownloads[appKey] = Math.max(existing.appDownloads[appKey] || 0, Number(cnt || 0));
      }
      for (const [relKey, cnt] of Object.entries(cloudBucket.releaseDownloads || {})) {
        existing.releaseDownloads[relKey] = Math.max(existing.releaseDownloads[relKey] || 0, Number(cnt || 0));
      }
    }
  }

  memoryRollup = {
    daily: mergedDaily,
    updatedAt: cloudStore.updatedAt || new Date().toISOString()
  };
  rollupLoadedFromDisk = true;
}

export function classifyVisitorDevice(userAgent?: string, deviceHint?: string): DeviceCategory {
  const ua = String(userAgent || '').toLowerCase();
  const hint = String(deviceHint || '').toLowerCase();

  if (
    hint === 'tv' ||
    ua.includes('aftt') ||
    ua.includes('aftb') ||
    ua.includes('aftm') ||
    ua.includes('afts') ||
    ua.includes('android tv') ||
    ua.includes('googletv') ||
    ua.includes('smart-tv') ||
    ua.includes('smarttv') ||
    ua.includes('bravia') ||
    ua.includes('shield') ||
    ua.includes('tizen') ||
    ua.includes('web0s')
  ) {
    return 'Smart TV / Android TV';
  }

  if (ua.includes('ipad') || hint === 'tablet' || (ua.includes('android') && !ua.includes('mobile') && !ua.includes('tv'))) {
    return 'Tablet / Other';
  }

  if (ua.includes('iphone') || ua.includes('ipod') || ua.includes('ios')) {
    return 'iOS / iPadOS';
  }

  if (ua.includes('android')) {
    return 'Android Mobile';
  }

  if (
    ua.includes('windows') ||
    ua.includes('macintosh') ||
    ua.includes('mac os') ||
    ua.includes('x11') ||
    ua.includes('linux')
  ) {
    return 'Desktop';
  }

  return 'Tablet / Other';
}

export function recordDownloadTelemetry(params: {
  appId: string;
  releaseId?: string;
  platform?: string;
  userAgent?: string;
}): void {
  const today = getTodayIso();
  const bucket = getOrCreateDailyBucket(today);

  bucket.downloads += 1;
  if (params.appId) {
    bucket.appDownloads[params.appId] = (bucket.appDownloads[params.appId] || 0) + 1;
  }
  if (params.releaseId) {
    bucket.releaseDownloads[params.releaseId] = (bucket.releaseDownloads[params.releaseId] || 0) + 1;
  }

  const platLower = String(params.platform || '').toLowerCase();
  let device: DeviceCategory;
  if (platLower.includes('tv') || platLower.includes('fire')) {
    device = 'Smart TV / Android TV';
  } else if (params.userAgent) {
    device = classifyVisitorDevice(params.userAgent);
  } else if (platLower.includes('windows') || platLower.includes('mac')) {
    device = 'Desktop';
  } else if (platLower.includes('ios')) {
    device = 'iOS / iPadOS';
  } else {
    device = 'Android Mobile';
  }

  bucket.devices[device] = (bucket.devices[device] || 0) + 1;
  persistRollup(false);
}

export function recordVisitTelemetry(params: {
  userAgent?: string;
  deviceHint?: string;
}): { device: DeviceCategory; date: string } {
  const today = getTodayIso();
  const bucket = getOrCreateDailyBucket(today);
  const device = classifyVisitorDevice(params.userAgent, params.deviceHint);

  bucket.visits += 1;
  bucket.devices[device] = (bucket.devices[device] || 0) + 1;
  persistRollup(false);

  return { device, date: today };
}

function buildDateWindow(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    result.push(dt.toISOString().slice(0, 10));
  }
  return result;
}

function formatShortDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function mapPlatformToDeviceCategory(platform?: string): DeviceCategory {
  const p = String(platform || '').toLowerCase();
  if (p.includes('tv') || p.includes('fire')) return 'Smart TV / Android TV';
  if (p.includes('windows') || p.includes('mac')) return 'Desktop';
  if (p.includes('ios')) return 'iOS / iPadOS';
  if (p.includes('android')) return 'Android Mobile';
  return 'Tablet / Other';
}

export function buildAdminAnalyticsReport(params: {
  apps: Array<{
    id: string;
    name: string;
    downloadsTotal?: number;
    supportedPlatforms?: string[];
    createdAt?: string;
    approvalStatus?: string;
    isTakenDown?: boolean;
    releases?: Array<{
      id: string;
      version: string;
      buildNumber?: number;
      releaseDate?: string;
      fileSize?: string;
      platform?: string;
      downloadCount?: number;
      isLatest?: boolean;
    }>;
  }>;
  sales: Array<{
    id: string;
    appId: string;
    status: string;
    createdAt?: string;
    completedAt?: string;
  }>;
  days?: number;
  appId?: string;
}): AnalyticsDashboardReport {
  const days = [7, 14, 30].includes(Number(params.days)) ? Number(params.days) : 30;
  const appIdFilter = params.appId && params.appId !== 'all' ? params.appId : 'all';

  const rollup = loadRollupFromDisk();
  const allApps = Array.isArray(params.apps) ? params.apps : [];
  const filteredApps =
    appIdFilter === 'all' ? allApps : allApps.filter((a) => a.id === appIdFilter);

  const dateKeys = buildDateWindow(days);
  const dateSet = new Set(dateKeys);

  // Sum already-recorded per-app downloads so legacy unrecorded release counts are only attributed cleanly when missing
  const recordedDownloadsByApp: Record<string, number> = {};
  for (const bucket of Object.values(rollup.daily)) {
    for (const [aid, cnt] of Object.entries(bucket.appDownloads || {})) {
      recordedDownloadsByApp[aid] = (recordedDownloadsByApp[aid] || 0) + Number(cnt || 0);
    }
  }

  const legacyBaselineByDate: Record<string, number> = {};
  for (const appItem of filteredApps) {
    const appTotal = Number(appItem.downloadsTotal || 0);
    const recorded = recordedDownloadsByApp[appItem.id] || 0;
    let unrecorded = Math.max(0, appTotal - recorded);
    if (unrecorded <= 0) continue;

    const releases = Array.isArray(appItem.releases) ? appItem.releases : [];
    const relSum = releases.reduce((acc, r) => acc + Number(r.downloadCount || 0), 0);

    if (releases.length > 0 && relSum > 0) {
      for (const rel of releases) {
        if (unrecorded <= 0) break;
        const dKey = String(rel.releaseDate || appItem.createdAt || '').slice(0, 10);
        const relCount = Math.min(unrecorded, Number(rel.downloadCount || 0));
        if (relCount > 0 && dateSet.has(dKey)) {
          legacyBaselineByDate[dKey] = (legacyBaselineByDate[dKey] || 0) + relCount;
          unrecorded -= relCount;
        }
      }
    }

    if (unrecorded > 0) {
      const createdKey = String(appItem.createdAt || '').slice(0, 10);
      if (dateSet.has(createdKey)) {
        legacyBaselineByDate[createdKey] = (legacyBaselineByDate[createdKey] || 0) + unrecorded;
      }
    }
  }

  // Paid completed orders per day inside the selected window
  const paidOrdersByDate: Record<string, number> = {};
  let paidOrdersWindow = 0;
  for (const sale of params.sales || []) {
    if (!sale || sale.status !== 'completed') continue;
    if (appIdFilter !== 'all' && sale.appId !== appIdFilter) continue;
    const dKey = String(sale.completedAt || sale.createdAt || '').slice(0, 10);
    if (dateSet.has(dKey)) {
      paidOrdersByDate[dKey] = (paidOrdersByDate[dKey] || 0) + 1;
      paidOrdersWindow += 1;
    }
  }

  // Daily trends array
  let windowDownloads = 0;
  let windowVisits = 0;
  const deviceCounts: Record<DeviceCategory, number> = {
    'Android Mobile': 0,
    'Smart TV / Android TV': 0,
    Desktop: 0,
    'iOS / iPadOS': 0,
    'Tablet / Other': 0
  };

  const dailyTrends: AnalyticsDailyPoint[] = dateKeys.map((dKey) => {
    const bucket = rollup.daily[dKey];
    const trackedDl = bucket
      ? appIdFilter === 'all'
        ? Number(bucket.downloads || 0)
        : Number(bucket.appDownloads?.[appIdFilter] || 0)
      : 0;
    const downloads = trackedDl + (legacyBaselineByDate[dKey] || 0);
    const visits = bucket ? Number(bucket.visits || 0) : 0;
    const paidOrders = paidOrdersByDate[dKey] || 0;

    windowDownloads += downloads;
    windowVisits += visits;

    if (bucket && bucket.devices) {
      for (const [devName, cnt] of Object.entries(bucket.devices)) {
        const typedDev = (devName as DeviceCategory) in deviceCounts
          ? (devName as DeviceCategory)
          : 'Tablet / Other';
        deviceCounts[typedDev] += Number(cnt || 0);
      }
    }

    return {
      date: dKey,
      label: formatShortDate(dKey),
      downloads,
      visits,
      paidOrders
    };
  });

  // Top-performing app versions across the real store catalog
  const recordedReleaseExtra: Record<string, number> = {};
  for (const bucket of Object.values(rollup.daily)) {
    for (const [rid, cnt] of Object.entries(bucket.releaseDownloads || {})) {
      recordedReleaseExtra[rid] = (recordedReleaseExtra[rid] || 0) + Number(cnt || 0);
    }
  }

  const versionRows: TopAppVersionStat[] = [];
  for (const appItem of filteredApps) {
    const releases = Array.isArray(appItem.releases) ? appItem.releases : [];
    for (const rel of releases) {
      const baseCount =
        releases.length === 1 && rel.isLatest
          ? Math.max(Number(rel.downloadCount || 0), Number(appItem.downloadsTotal || 0))
          : Number(rel.downloadCount || 0);
      const count = Math.max(baseCount, recordedReleaseExtra[rel.id] || 0);
      const shortApp = appItem.name.length > 18 ? `${appItem.name.slice(0, 16)}…` : appItem.name;
      versionRows.push({
        key: `${appItem.id}:${rel.id}`,
        appId: appItem.id,
        appName: appItem.name,
        version: `v${rel.version}`,
        label: `${shortApp} · v${rel.version}`,
        platform: rel.platform || appItem.supportedPlatforms?.[0] || 'Android',
        fileSize: rel.fileSize || 'N/A',
        releaseDate: rel.releaseDate || String(appItem.createdAt || '').slice(0, 10) || '—',
        downloads: count,
        sharePercent: 0
      });
    }
  }

  versionRows.sort((a, b) => {
    if (b.downloads !== a.downloads) return b.downloads - a.downloads;
    return b.releaseDate.localeCompare(a.releaseDate);
  });

  const totalVersionDownloads = versionRows.reduce((sum, v) => sum + v.downloads, 0);
  const topVersions = versionRows.slice(0, 10).map((row) => ({
    ...row,
    sharePercent:
      totalVersionDownloads > 0
        ? Number(((row.downloads / totalVersionDownloads) * 100).toFixed(1))
        : 0
  }));

  // Visitor device distribution (live telemetry or catalog platform breakdown fallback)
  let totalDevicePings = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
  let deviceDataSource: 'live_telemetry' | 'platform_catalog' = 'live_telemetry';

  if (totalDevicePings === 0) {
    deviceDataSource = 'platform_catalog';
    for (const appItem of filteredApps) {
      const weight = Math.max(1, Number(appItem.downloadsTotal || 0));
      const platforms =
        Array.isArray(appItem.supportedPlatforms) && appItem.supportedPlatforms.length > 0
          ? appItem.supportedPlatforms
          : ['Android'];
      const perPlatWeight = Math.max(1, Math.round(weight / platforms.length));
      for (const plat of platforms) {
        const cat = mapPlatformToDeviceCategory(plat);
        deviceCounts[cat] += perPlatWeight;
      }
    }
    totalDevicePings = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
  }

  const deviceDistribution: DeviceDistributionStat[] = (
    Object.entries(deviceCounts) as Array<[DeviceCategory, number]>
  )
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({
      device,
      count,
      sharePercent:
        totalDevicePings > 0 ? Number(((count / totalDevicePings) * 100).toFixed(1)) : 0,
      color: DEVICE_COLORS[device]
    }));

  const totalAllTimeDownloads = filteredApps.reduce(
    (sum, a) => sum + Number(a.downloadsTotal || 0),
    0
  );

  const topDevice = deviceDistribution[0];
  const topVersion = topVersions[0];

  return {
    days,
    appId: appIdFilter,
    generatedAt: new Date().toISOString(),
    deviceDataSource,
    summary: {
      totalAllTimeDownloads,
      windowDownloads,
      windowVisits,
      trackedVersionsCount: versionRows.length,
      activeAppsCount: filteredApps.filter((a) => !a.isTakenDown && a.approvalStatus !== 'rejected').length,
      paidOrdersWindow,
      topDeviceLabel: topDevice ? topDevice.device : 'No device data yet',
      topDeviceShare: topDevice ? topDevice.sharePercent : 0,
      topVersionLabel: topVersion ? `${topVersion.appName} ${topVersion.version}` : 'No releases yet',
      topVersionDownloads: topVersion ? topVersion.downloads : 0
    },
    dailyTrends,
    topVersions,
    deviceDistribution,
    appOptions: allApps
      .map((a) => ({ id: a.id, name: a.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  };
}
