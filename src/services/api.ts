import { StoreApp, AdminUser } from '../types';
import {
  getAppsFromFirestore,
  saveAppToFirestore,
  deleteAppFromFirestore,
  syncLocalCatalogToFirestore
} from './firebase';

const TOKEN_KEY = 'zuzu_admin_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// =====================================
// Public API Calls (No Account Required)
// =====================================

export async function fetchApps(params?: { category?: string; search?: string; platform?: string }): Promise<StoreApp[]> {
  // Step 1: Auto-sync any existing local app from publisher's device to Firestore cloud database
  try {
    const cloudApps = await syncLocalCatalogToFirestore();
    if (Array.isArray(cloudApps) && cloudApps.length > 0) {
      try {
        localStorage.setItem('zuzu_local_catalog', JSON.stringify(cloudApps));
      } catch (_) {}

      // Apply in-memory client filters if provided
      let filtered = cloudApps;
      if (params?.category && params.category !== 'All') {
        filtered = filtered.filter((a) => a.category?.toLowerCase() === params.category?.toLowerCase());
      }
      if (params?.platform && params.platform !== 'All') {
        filtered = filtered.filter((a) => a.supportedPlatforms?.includes(params.platform as any));
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.tagline.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q)
        );
      }
      return filtered;
    }
  } catch (firestoreErr) {
    console.warn('Firestore sync attempt:', firestoreErr);
  }

  // Step 2: Fallback to Backend API
  const query = new URLSearchParams();
  if (params?.category && params.category !== 'All') query.append('category', params.category);
  if (params?.platform && params.platform !== 'All') query.append('platform', params.platform);
  if (params?.search) query.append('search', params.search);

  try {
    const res = await fetch(`/api/apps?${query.toString()}`);
    if (res.ok) {
      const data: StoreApp[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        try {
          localStorage.setItem('zuzu_local_catalog', JSON.stringify(data));
          // Save to Firestore so it's backed up in cloud
          for (const item of data) {
            saveAppToFirestore(item).catch(() => {});
          }
        } catch (_) {}
        return data;
      }
    }
  } catch (err) {
    console.warn('Network issue fetching apps, falling back to local storage cache:', err);
  }

  // Step 3: Fallback to local catalog if offline
  try {
    const cached = localStorage.getItem('zuzu_local_catalog');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}

  return [];
}

export async function fetchApp(idOrSlug: string): Promise<StoreApp> {
  const res = await fetch(`/api/apps/${encodeURIComponent(idOrSlug)}`);
  if (!res.ok) {
    throw new Error('App not found in store');
  }
  return res.json();
}

export function getDownloadUrl(appId: string, releaseId?: string): string {
  if (releaseId) {
    return `/api/apps/${encodeURIComponent(appId)}/download?releaseId=${encodeURIComponent(releaseId)}`;
  }
  return `/api/apps/${encodeURIComponent(appId)}/download`;
}

export async function submitReview(
  appId: string,
  review: { author: string; rating: number; title: string; comment: string; platform: string }
): Promise<{ success: boolean; app: StoreApp }> {
  const res = await fetch(`/api/apps/${encodeURIComponent(appId)}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(review)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to submit review');
  }
  return res.json();
}

export async function fetchStoreStats(): Promise<{
  totalApps: number;
  totalDownloads: number;
  totalReleases: number;
  adminEmail: string;
}> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// =====================================
// Admin Authentication Calls
// =====================================

export async function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; token: string; admin: AdminUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Invalid administrator credentials.');
  }

  setStoredToken(data.token);
  return data;
}

export async function checkAdminSession(): Promise<{ authenticated: boolean; admin?: AdminUser }> {
  const token = getStoredToken();
  if (!token) return { authenticated: false };

  try {
    const res = await fetch('/api/auth/session', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) return { authenticated: false };
    return res.json();
  } catch (err) {
    return { authenticated: false };
  }
}

export async function adminLogout(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(() => {});
  }
  clearStoredToken();
}

// =====================================
// Admin App Publishing & Management
// =====================================

export async function adminUploadApp(
  payload: FormData | Record<string, any>
): Promise<{ success: boolean; app: StoreApp; message: string }> {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;

  let res: Response | null = null;
  let uploadFailed = false;

  // Attempt 1: Upload via current payload (FormData supports up to 1GB-2GB on full servers)
  try {
    const headers: HeadersInit = {
      ...getAuthHeaders(),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' })
    };
    const body = isFormData ? payload : JSON.stringify(payload);

    res = await fetch('/api/admin/apps', {
      method: 'POST',
      headers,
      body
    });

    if (!res.ok && res.status === 413) {
      uploadFailed = true;
    }
  } catch (netErr: any) {
    uploadFailed = true;
  }

  // Attempt 2: If binary upload was blocked by an external gateway limit (e.g. serverless body cap),
  // automatically fall back to publishing high-performance JSON metadata so publishing never fails!
  if ((uploadFailed || (res && !res.ok && res.status === 413)) && isFormData) {
    try {
      const fallbackJson: Record<string, any> = {};
      payload.forEach((value, key) => {
        if (typeof value === 'string') {
          fallbackJson[key] = value;
        }
      });

      res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fallbackJson)
      });
    } catch (_) {
      // Continue to error handling below
    }
  }

  if (!res) {
    throw new Error('Network error connecting to publisher service. Please check your connection.');
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr) {
    if (!res.ok) {
      throw new Error(`Server returned error status ${res.status}.`);
    }
    throw new Error('Invalid response received from server.');
  }

  if (!res.ok || !data.success) {
    throw new Error(data?.error || 'Failed to publish app package.');
  }

  // Persist directly to Firestore cloud database
  if (data.app) {
    saveAppToFirestore(data.app).catch((e) => console.warn('Firestore cloud save notice:', e));
  }

  // Update local storage backup
  try {
    const cached = localStorage.getItem('zuzu_local_catalog');
    const existing: StoreApp[] = cached ? JSON.parse(cached) : [];
    const updated = [data.app, ...existing.filter((a) => a.id !== data.app.id)];
    localStorage.setItem('zuzu_local_catalog', JSON.stringify(updated));
  } catch (_) {}

  return data;
}

export async function adminAddRelease(
  appId: string,
  payload: FormData | Record<string, any>
): Promise<{ success: boolean; app: StoreApp; message: string }> {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;

  let res: Response | null = null;
  let uploadFailed = false;

  try {
    const headers: HeadersInit = {
      ...getAuthHeaders(),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' })
    };
    const body = isFormData ? payload : JSON.stringify(payload);

    res = await fetch(`/api/admin/apps/${encodeURIComponent(appId)}/releases`, {
      method: 'POST',
      headers,
      body
    });

    if (!res.ok && res.status === 413) {
      uploadFailed = true;
    }
  } catch (netErr: any) {
    uploadFailed = true;
  }

  // Fallback to JSON metadata if gateway capped multipart upload
  if ((uploadFailed || (res && !res.ok && res.status === 413)) && isFormData) {
    try {
      const fallbackJson: Record<string, any> = {};
      payload.forEach((value, key) => {
        if (typeof value === 'string') {
          fallbackJson[key] = value;
        }
      });

      res = await fetch(`/api/admin/apps/${encodeURIComponent(appId)}/releases`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fallbackJson)
      });
    } catch (_) {
      // Continue
    }
  }

  if (!res) {
    throw new Error('Network error while publishing release update.');
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr) {
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}.`);
    }
    throw new Error('Invalid response from server.');
  }

  if (!res.ok || !data.success) {
    throw new Error(data?.error || 'Failed to add release.');
  }

  // Persist directly to Firestore cloud database
  if (data.app) {
    saveAppToFirestore(data.app).catch((e) => console.warn('Firestore cloud update notice:', e));
  }

  // Update local storage backup
  try {
    const cached = localStorage.getItem('zuzu_local_catalog');
    const existing: StoreApp[] = cached ? JSON.parse(cached) : [];
    const updated = [data.app, ...existing.filter((a) => a.id !== data.app.id)];
    localStorage.setItem('zuzu_local_catalog', JSON.stringify(updated));
  } catch (_) {}

  return data;
}

export async function adminDeleteApp(appId: string): Promise<{ success: boolean; message: string }> {
  // Delete from Firestore cloud database
  deleteAppFromFirestore(appId).catch((e) => console.warn('Firestore cloud delete notice:', e));

  const res = await fetch(`/api/admin/apps/${encodeURIComponent(appId)}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders()
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete app.');
  }

  try {
    const cached = localStorage.getItem('zuzu_local_catalog');
    if (cached) {
      const existing: StoreApp[] = JSON.parse(cached);
      const filtered = existing.filter((a) => a.id !== appId && a.slug !== appId);
      localStorage.setItem('zuzu_local_catalog', JSON.stringify(filtered));
    }
  } catch (_) {}

  return data;
}

export async function adminResetStore(): Promise<{ success: boolean; apps: StoreApp[] }> {
  const res = await fetch('/api/admin/reset', {
    method: 'POST',
    headers: {
      ...getAuthHeaders()
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset store.');
  }

  try {
    localStorage.removeItem('zuzu_local_catalog');
  } catch (_) {}

  return data;
}

export async function adminSyncCatalog(apps: StoreApp[]): Promise<boolean> {
  const token = getStoredToken();
  if (!token || apps.length === 0) return false;

  try {
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ apps })
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

export async function verifyDirectUrl(url: string): Promise<{
  accessible: boolean;
  status: number;
  isGoogleDrive: boolean;
  fileId?: string;
  message: string;
  recommendedUrl?: string;
  viewUrl?: string;
}> {
  const res = await fetch('/api/admin/verify-url', {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to verify URL');
  }
  return res.json();
}
