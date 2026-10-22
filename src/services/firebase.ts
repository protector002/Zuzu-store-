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
import { StoreApp } from '../types';
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

// Collection reference
const APPS_COLLECTION = 'apps';

/**
 * Fetch all applications from Firestore cloud database
 */
export async function getAppsFromFirestore(): Promise<StoreApp[]> {
  try {
    const appsRef = collection(db, APPS_COLLECTION);
    const snap = await getDocs(appsRef);
    const apps: StoreApp[] = [];
    snap.forEach((d) => {
      apps.push(d.data() as StoreApp);
    });

    // Sort by createdAt descending
    apps.sort((a, b) => {
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
 * Save / Update an application in Firestore cloud database
 */
export async function saveAppToFirestore(appData: StoreApp): Promise<void> {
  try {
    const docRef = doc(db, APPS_COLLECTION, appData.id);
    await setDoc(docRef, {
      ...appData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
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
 * Delete an application from Firestore
 */
export async function deleteAppFromFirestore(appId: string): Promise<void> {
  try {
    const docRef = doc(db, APPS_COLLECTION, appId);
    await deleteDoc(docRef);

    // Also check and delete if stored under slug or alternate document id
    try {
      const snap = await getDocs(collection(db, APPS_COLLECTION));
      const deletePromises: Promise<any>[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (d.id === appId || data.id === appId || data.slug === appId) {
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
 * Rescues apps previously published on the publisher's device so that they become
 * permanently saved in the cloud database and instantly visible to everyone.
 */
export async function syncLocalCatalogToFirestore(): Promise<StoreApp[]> {
  try {
    const remoteApps = await getAppsFromFirestore();
    const remoteIds = new Set(remoteApps.map((a) => a.id));

    // Check if the user has apps stored locally in their browser
    let localApps: StoreApp[] = [];
    try {
      const cached = localStorage.getItem('zuzu_local_catalog');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          localApps = parsed;
        }
      }
    } catch (_) {}

    // Find apps that exist locally on the publisher's machine but not yet in the cloud database
    const missingInCloud = localApps.filter((local) => !remoteIds.has(local.id));

    if (missingInCloud.length > 0) {
      console.log(`Syncing ${missingInCloud.length} local app(s) to Firestore cloud database...`);
      for (const app of missingInCloud) {
        await saveAppToFirestore(app);
      }
      return await getAppsFromFirestore();
    }

    return remoteApps;
  } catch (err) {
    console.warn('Auto-sync notice:', err);
    return [];
  }
}
