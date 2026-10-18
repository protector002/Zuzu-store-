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

  const res = await fetch(`/api/apps?${query.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load store applications');
  }
  return res.json();
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

export async function adminUploadApp(formData: FormData): Promise<{ success: boolean; app: StoreApp; message: string }> {
  const res = await fetch('/api/admin/apps', {
    method: 'POST',
    headers: {
      ...getAuthHeaders()
    },
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload app package.');
  }
  return data;
}

export async function adminAddRelease(
  appId: string,
  formData: FormData
): Promise<{ success: boolean; app: StoreApp; message: string }> {
  const res = await fetch(`/api/admin/apps/${encodeURIComponent(appId)}/releases`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders()
    },
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add release.');
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
  return data;
}
