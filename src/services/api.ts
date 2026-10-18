import { StoreApp, AdminUser } from '../types';

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
        } catch (_) {}
        return data;
      }
    }
  } catch (err) {
    console.warn('Network issue fetching apps, falling back to local storage cache:', err);
  }

  // Fallback to local catalog if serverless container has fresh /tmp
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
  const headers: HeadersInit = {
    ...getAuthHeaders(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' })
  };

  const body = isFormData ? payload : JSON.stringify(payload);

  let res: Response;
  try {
    res = await fetch('/api/admin/apps', {
      method: 'POST',
      headers,
      body
    });
  } catch (netErr: any) {
    throw new Error(
      'Network request failed. Serverless platforms like Vercel have a 4.5 MB request limit. Please provide a Direct Download Link (e.g. Google Drive, Dropbox, GitHub) for large APK files.'
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr) {
    if (!res.ok) {
      if (res.status === 413) {
        throw new Error('Payload too large for serverless upload. Please enter a Direct Download Link (Google Drive, GitHub, etc.) to publish.');
      }
      throw new Error(`Server returned status ${res.status}.`);
    }
    throw new Error('Invalid response received from server.');
  }

  if (!res.ok || !data.success) {
    throw new Error(data?.error || 'Failed to publish app package.');
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
  const headers: HeadersInit = {
    ...getAuthHeaders(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' })
  };

  const body = isFormData ? payload : JSON.stringify(payload);

  let res: Response;
  try {
    res = await fetch(`/api/admin/apps/${encodeURIComponent(appId)}/releases`, {
      method: 'POST',
      headers,
      body
    });
  } catch (netErr: any) {
    throw new Error(
      'Network request failed. For APK updates larger than 4.5 MB on Vercel, please provide a Direct Download Link.'
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr) {
    if (!res.ok) {
      if (res.status === 413) {
        throw new Error('File payload exceeds serverless limit. Please use a Direct Download Link.');
      }
      throw new Error(`Server returned status ${res.status}.`);
    }
    throw new Error('Invalid response from server.');
  }

  if (!res.ok || !data.success) {
    throw new Error(data?.error || 'Failed to add release.');
  }

  return data;
}

export async function adminDeleteApp(appId: string): Promise<{ success: boolean; message: string }> {
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
