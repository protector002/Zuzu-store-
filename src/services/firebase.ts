import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  getDocFromServer,
  query,
  orderBy
} from 'firebase/firestore';
import { StoreApp, DeveloperUser, AdminBroadcast } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if configured
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Connection test as required by Firebase integration
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
  }
}
testConnection();

// Helper to strip undefined values recursively before writing to Firestore
function cleanForFirestore<T>(data: T): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.filter((item) => item !== undefined).map((item) => cleanForFirestore(item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned;
}

// Collection reference
const APPS_COLLECTION = 'apps';
const STATS_COLLECTION = 'stats';
const TOMBSTONES_DOC = 'tombstones';

export interface TombstoneData {
  deletedAppIds: string[];
  deletedReleaseIds: string[];
  updatedAt: string;
}

/**
 * Fetch tombstones (deleted app IDs and deleted release IDs) from Firestore & localStorage
 */
export async function getTombstonesFromFirestore(): Promise<{ deletedAppIds: Set<string>; deletedReleaseIds: Set<string> }> {
  const deletedAppIds = new Set<string>();
  const deletedReleaseIds = new Set<string>();

  // 1. Check local storage cache for instant client-side resolution
  try {
    const localDelApps = JSON.parse(localStorage.getItem('zuzu_deleted_apps') || '[]');
    if (Array.isArray(localDelApps)) {
      localDelApps.forEach((id) => deletedAppIds.add(String(id)));
    }
    const localDelRels = JSON.parse(localStorage.getItem('zuzu_deleted_releases') || '[]');
    if (Array.isArray(localDelRels)) {
      localDelRels.forEach((id) => deletedReleaseIds.add(String(id)));
    }
  } catch (_) {}

  // 2. Query Firestore stats/tombstones document
  try {
    const docRef = doc(db, STATS_COLLECTION, TOMBSTONES_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as TombstoneData;
      if (Array.isArray(data.deletedAppIds)) {
        data.deletedAppIds.forEach((id) => deletedAppIds.add(String(id)));
      }
      if (Array.isArray(data.deletedReleaseIds)) {
        data.deletedReleaseIds.forEach((id) => deletedReleaseIds.add(String(id)));
      }
    }
  } catch (e) {
    console.warn('Tombstones fetch notice:', e);
  }

  return { deletedAppIds, deletedReleaseIds };
}

/**
 * Record an app ID as permanently deleted
 */
export async function recordAppTombstone(appId: string, slug?: string): Promise<void> {
  // Update local storage immediately
  try {
    const existing: string[] = JSON.parse(localStorage.getItem('zuzu_deleted_apps') || '[]');
    const set = new Set(existing);
    set.add(appId);
    if (slug) set.add(slug);
    localStorage.setItem('zuzu_deleted_apps', JSON.stringify(Array.from(set)));
  } catch (_) {}

  // Update Firestore
  try {
    const docRef = doc(db, STATS_COLLECTION, TOMBSTONES_DOC);
    const snap = await getDoc(docRef);
    const existingData = snap.exists() ? (snap.data() as TombstoneData) : { deletedAppIds: [], deletedReleaseIds: [], updatedAt: '' };
    const appIds = new Set(existingData.deletedAppIds || []);
    appIds.add(appId);
    if (slug) appIds.add(slug);

    await setDoc(docRef, {
      deletedAppIds: Array.from(appIds),
      deletedReleaseIds: existingData.deletedReleaseIds || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Record app tombstone notice:', e);
  }
}

/**
 * Record a release ID as permanently deleted
 */
export async function recordReleaseTombstone(releaseId: string): Promise<void> {
  // Update local storage immediately
  try {
    const existing: string[] = JSON.parse(localStorage.getItem('zuzu_deleted_releases') || '[]');
    const set = new Set(existing);
    set.add(releaseId);
    localStorage.setItem('zuzu_deleted_releases', JSON.stringify(Array.from(set)));
  } catch (_) {}

  // Update Firestore
  try {
    const docRef = doc(db, STATS_COLLECTION, TOMBSTONES_DOC);
    const snap = await getDoc(docRef);
    const existingData = snap.exists() ? (snap.data() as TombstoneData) : { deletedAppIds: [], deletedReleaseIds: [], updatedAt: '' };
    const releaseIds = new Set(existingData.deletedReleaseIds || []);
    releaseIds.add(releaseId);

    await setDoc(docRef, {
      deletedAppIds: existingData.deletedAppIds || [],
      deletedReleaseIds: Array.from(releaseIds),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Record release tombstone notice:', e);
  }
}

/**
 * Fetch all applications from Firestore cloud database (strictly excluding any deleted apps or releases)
 */
export async function getAppsFromFirestore(includeUnapproved = false): Promise<StoreApp[]> {
  try {
    const { deletedAppIds, deletedReleaseIds } = await getTombstonesFromFirestore();
    const appsRef = collection(db, APPS_COLLECTION);
    const snap = await getDocs(appsRef);
    const apps: StoreApp[] = [];

    snap.forEach((d) => {
      const data = d.data() as StoreApp;
      const id = data.id || d.id;
      const slug = data.slug;

      // If marked as deleted, ensure it never appears and delete the stray document from Firestore
      if (deletedAppIds.has(id) || deletedAppIds.has(d.id) || (slug && deletedAppIds.has(slug))) {
        deleteDoc(d.ref).catch(() => {});
        return;
      }

      // Filter out any deleted release/version from this app
      if (Array.isArray(data.releases)) {
        data.releases = data.releases.filter((r) => !deletedReleaseIds.has(r.id));
      }

      // Public visitors only see approved apps
      if (!includeUnapproved && data.approvalStatus && data.approvalStatus !== 'approved') {
        return;
      }

      apps.push(data);
    });

    // Sort by displayOrder first (where 1 is top/Hero), then createdAt descending
    apps.sort((a, b) => {
      const orderA = a.displayOrder !== undefined ? a.displayOrder : (a.isFeatured ? 1 : 9999);
      const orderB = b.displayOrder !== undefined ? b.displayOrder : (b.isFeatured ? 1 : 9999);
      if (orderA !== orderB) return orderA - orderB;
      const timeA = new Date(b.createdAt || 0).getTime();
      const timeB = new Date(a.createdAt || 0).getTime();
      return timeA - timeB;
    });

    return apps;
  } catch (err) {
    console.warn('Error fetching apps from Firestore, will use fallback:', err);
    return [];
  }
}

/**
 * Persist app ranking / order changes directly to Firestore
 */
export async function reorderAppsInFirestore(
  order: Array<{ id: string; displayOrder: number; isFeatured?: boolean }>
): Promise<void> {
  for (const item of order) {
    try {
      const docRef = doc(db, APPS_COLLECTION, item.id);
      await setDoc(
        docRef,
        {
          displayOrder: item.displayOrder,
          isFeatured: item.isFeatured ?? (item.displayOrder === 1),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn(`Failed to update displayOrder for ${item.id} in Firestore:`, e);
    }
  }
}

/**
 * Save / Update an application in Firestore cloud database
 */
export async function saveAppToFirestore(appData: StoreApp): Promise<void> {
  try {
    // Strip undefined fields so Firestore setDoc never fails on optional properties
    const docRef = doc(db, APPS_COLLECTION, appData.id);
    const payload = cleanForFirestore({
      ...appData,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to save app to Firestore:', err);
    throw err;
  }
}

/**
 * Atomically increment download count in Firestore cloud database
 */
export async function incrementAppDownloadInFirestore(appId: string, releaseId?: string): Promise<void> {
  try {
    const docRef = doc(db, APPS_COLLECTION, appId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as StoreApp;
      const updatedReleases = data.releases
        ? data.releases.map((r) => {
            if (!releaseId || r.id === releaseId) {
              return { ...r, downloadCount: (r.downloadCount || 0) + 1 };
            }
            return r;
          })
        : [];

      await updateDoc(docRef, {
        downloadsTotal: increment(1),
        releases: updatedReleases,
        updatedAt: new Date().toISOString()
      });
      return;
    }

    // Fallback: match by ID or slug in collection
    const snapCollection = await getDocs(collection(db, APPS_COLLECTION));
    snapCollection.forEach(async (d) => {
      const data = d.data() as StoreApp;
      if (d.id === appId || data.id === appId || data.slug === appId) {
        const updatedReleases = data.releases
          ? data.releases.map((r) => {
              if (!releaseId || r.id === releaseId) {
                return { ...r, downloadCount: (r.downloadCount || 0) + 1 };
              }
              return r;
            })
          : [];

        await updateDoc(d.ref, {
          downloadsTotal: increment(1),
          releases: updatedReleases,
          updatedAt: new Date().toISOString()
        });
      }
    });
  } catch (err) {
    console.warn('Notice: Firestore increment download warning:', err);
  }
}

/**
 * Delete a specific release/version of an application from Firestore
 */
export async function deleteReleaseFromFirestore(appId: string, releaseId: string): Promise<StoreApp | null> {
  try {
    // Record tombstone first so this version is never resurfaced
    await recordReleaseTombstone(releaseId);

    const docRef = doc(db, APPS_COLLECTION, appId);
    let appDoc = await getDoc(docRef);
    let targetDocRef = docRef;

    if (!appDoc.exists()) {
      const snap = await getDocs(collection(db, APPS_COLLECTION));
      snap.forEach((d) => {
        const data = d.data() as StoreApp;
        if (d.id === appId || data.id === appId || data.slug === appId) {
          appDoc = d as any;
          targetDocRef = d.ref;
        }
      });
    }

    if (appDoc.exists()) {
      const data = appDoc.data() as StoreApp;
      const updatedReleases = (data.releases || []).filter((r) => r.id !== releaseId);

      // If the deleted release was the currentVersion, set currentVersion to the highest remaining version
      const remainingVersion = updatedReleases[0]?.version || data.currentVersion;

      const updatedApp: StoreApp = {
        ...data,
        releases: updatedReleases,
        currentVersion: remainingVersion,
        updatedAt: new Date().toISOString()
      };

      await setDoc(targetDocRef, cleanForFirestore(updatedApp), { merge: true });

      // Clean local storage
      try {
        const cached = localStorage.getItem('zuzu_local_catalog');
        if (cached) {
          const existing: StoreApp[] = JSON.parse(cached);
          const idx = existing.findIndex((a) => a.id === appId || a.slug === appId);
          if (idx !== -1) {
            existing[idx] = updatedApp;
            localStorage.setItem('zuzu_local_catalog', JSON.stringify(existing));
          }
        }
      } catch (_) {}

      return updatedApp;
    }
  } catch (err) {
    console.error('Failed to delete release from Firestore:', err);
    throw err;
  }
  return null;
}

/**
 * Delete an application from Firestore permanently and record tombstone
 */
export async function deleteAppFromFirestore(appId: string, slug?: string): Promise<void> {
  try {
    // 1. Record tombstone in Firestore and localStorage so it can NEVER be resurrected
    await recordAppTombstone(appId, slug);

    // 2. Remove from local browser catalog immediately
    try {
      const cached = localStorage.getItem('zuzu_local_catalog');
      if (cached) {
        const existing: StoreApp[] = JSON.parse(cached);
        const filtered = existing.filter((a) => a.id !== appId && a.slug !== appId && (slug ? a.slug !== slug : true));
        localStorage.setItem('zuzu_local_catalog', JSON.stringify(filtered));
      }
    } catch (_) {}

    // 3. Delete direct document by ID
    const docRef = doc(db, APPS_COLLECTION, appId);
    await deleteDoc(docRef);

    // 4. Also check and delete if stored under slug or alternate document id
    try {
      const snap = await getDocs(collection(db, APPS_COLLECTION));
      const deletePromises: Promise<any>[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (d.id === appId || data.id === appId || (slug && (d.id === slug || data.slug === slug))) {
          deletePromises.push(deleteDoc(d.ref));
        }
      });
      await Promise.all(deletePromises);
    } catch (_) {}
  } catch (err) {
    console.error('Failed to delete app from Firestore:', err);
    throw err;
  }
}

/**
 * Auto-sync local browser cache with Firestore:
 * Strictly prunes any deleted apps or releases from local storage and ensures
 * clean synchronization with Firestore cloud database without reviving deleted items.
 */
export async function syncLocalCatalogToFirestore(): Promise<StoreApp[]> {
  try {
    const { deletedAppIds, deletedReleaseIds } = await getTombstonesFromFirestore();

    // Clean up local storage cache if it contains any deleted app or release
    try {
      const cached = localStorage.getItem('zuzu_local_catalog');
      if (cached) {
        const localApps: StoreApp[] = JSON.parse(cached);
        if (Array.isArray(localApps)) {
          const cleaned = localApps
            .filter((a) => !deletedAppIds.has(a.id) && !deletedAppIds.has(a.slug))
            .map((a) => ({
              ...a,
              releases: (a.releases || []).filter((r) => !deletedReleaseIds.has(r.id))
            }));
          localStorage.setItem('zuzu_local_catalog', JSON.stringify(cleaned));
        }
      }
    } catch (_) {}

    return await getAppsFromFirestore();
  } catch (err) {
    console.warn('Auto-sync notice:', err);
    return [];
  }
}

// Collection references for Developers and Broadcasts
const DEVELOPERS_COLLECTION = 'developers';
const BROADCASTS_COLLECTION = 'broadcasts';

/**
 * Permanently save developer account profile in Firestore cloud database
 */
export async function saveDeveloperToFirestore(dev: DeveloperUser): Promise<void> {
  try {
    const docRef = doc(db, DEVELOPERS_COLLECTION, dev.id);
    await setDoc(
      docRef,
      cleanForFirestore({
        ...dev,
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );

    // Also mirror to email index document for instant O(1) lookups
    const emailRef = doc(db, DEVELOPERS_COLLECTION, `email_${dev.email.toLowerCase().trim()}`);
    await setDoc(
      emailRef,
      {
        developerId: dev.id,
        email: dev.email.toLowerCase().trim(),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    // Cache locally as immediate fallback
    try {
      localStorage.setItem(`zuzu_dev_${dev.id}`, JSON.stringify(dev));
      localStorage.setItem(`zuzu_dev_email_${dev.email.toLowerCase().trim()}`, dev.id);
    } catch (_) {}
  } catch (err) {
    console.error('Failed to save developer to Firestore:', err);
  }
}

/**
 * Retrieve a developer account from Firestore by ID or Email
 */
export async function getDeveloperFromFirestore(idOrEmail: string): Promise<DeveloperUser | null> {
  try {
    const norm = idOrEmail.toLowerCase().trim();

    // 1. Direct ID lookup
    const idDoc = await getDoc(doc(db, DEVELOPERS_COLLECTION, idOrEmail));
    if (idDoc.exists()) {
      return idDoc.data() as DeveloperUser;
    }

    // 2. Email pointer lookup
    const emailDoc = await getDoc(doc(db, DEVELOPERS_COLLECTION, `email_${norm}`));
    if (emailDoc.exists()) {
      const devId = (emailDoc.data() as any).developerId;
      if (devId) {
        const directDoc = await getDoc(doc(db, DEVELOPERS_COLLECTION, devId));
        if (directDoc.exists()) {
          return directDoc.data() as DeveloperUser;
        }
      }
    }

    // 3. Collection scan query
    const snap = await getDocs(collection(db, DEVELOPERS_COLLECTION));
    for (const d of snap.docs) {
      if (d.id.startsWith('email_')) continue;
      const data = d.data() as DeveloperUser;
      if (data.id === idOrEmail || data.email?.toLowerCase().trim() === norm) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Error reading developer from Firestore:', err);
  }

  // Fallback to local storage
  try {
    const cachedId = localStorage.getItem(`zuzu_dev_email_${idOrEmail.toLowerCase().trim()}`) || idOrEmail;
    const cached = localStorage.getItem(`zuzu_dev_${cachedId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  return null;
}

/**
 * Retrieve all registered developers from Firestore for Super Admin God Mode
 */
export async function getAllDevelopersFromFirestore(): Promise<DeveloperUser[]> {
  try {
    const snap = await getDocs(collection(db, DEVELOPERS_COLLECTION));
    const devs: DeveloperUser[] = [];
    snap.forEach((d) => {
      if (d.id.startsWith('email_')) return;
      const dev = d.data() as DeveloperUser;
      if (dev && dev.id && dev.email) {
        devs.push(dev);
      }
    });
    return devs;
  } catch (err) {
    console.warn('Error fetching all developers from Firestore:', err);
    return [];
  }
}

/**
 * Permanently save admin broadcast banner in Firestore
 */
export async function saveBroadcastToFirestore(broadcast: AdminBroadcast | null): Promise<void> {
  try {
    const docRef = doc(db, BROADCASTS_COLLECTION, 'active_broadcast');
    if (!broadcast || !broadcast.active) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        ...broadcast,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Error saving broadcast to Firestore:', err);
  }
}

/**
 * Retrieve active broadcast banner from Firestore
 */
export async function getBroadcastFromFirestore(): Promise<AdminBroadcast | null> {
  try {
    const docRef = doc(db, BROADCASTS_COLLECTION, 'active_broadcast');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AdminBroadcast;
    }
  } catch (err) {
    console.warn('Error fetching broadcast from Firestore:', err);
  }
  return null;
}
