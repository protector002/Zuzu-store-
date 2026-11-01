import { InstalledAppRecord } from '../types';

const STORAGE_KEY = 'zuzu_device_installed_apps';

/**
 * Check if current client device is running Android
 */
export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent || '');
}

/**
 * Retrieve map of all apps recorded as installed on this device via Zuzu Store
 */
export function getInstalledApps(): Record<string, InstalledAppRecord> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

/**
 * Check if a specific package ID is marked as installed on this device
 */
export function isAppInstalled(packageId?: string): boolean {
  if (!packageId) return false;
  const installed = getInstalledApps();
  return Boolean(installed[packageId.toLowerCase()]);
}

/**
 * Get installed version string for a package ID if recorded
 */
export function getInstalledVersion(packageId?: string): string | null {
  if (!packageId) return null;
  const installed = getInstalledApps();
  return installed[packageId.toLowerCase()]?.version || null;
}

/**
 * Mark an application as installed on this device
 */
export function recordAppInstalled(
  packageId: string,
  name: string,
  version: string,
  fileName?: string
): void {
  if (typeof localStorage === 'undefined' || !packageId) return;
  try {
    const installed = getInstalledApps();
    installed[packageId.toLowerCase()] = {
      packageId: packageId.toLowerCase(),
      name,
      version,
      installedAt: new Date().toISOString(),
      fileName
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(installed));
    window.dispatchEvent(new CustomEvent('zuzu_installed_apps_changed', { detail: { packageId } }));
  } catch (err) {
    console.warn('Could not record app install state:', err);
  }
}

/**
 * Mark an application as uninstalled from this device
 */
export function recordAppUninstalled(packageId: string): void {
  if (typeof localStorage === 'undefined' || !packageId) return;
  try {
    const installed = getInstalledApps();
    delete installed[packageId.toLowerCase()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(installed));
    window.dispatchEvent(new CustomEvent('zuzu_installed_apps_changed', { detail: { packageId } }));
  } catch (err) {
    console.warn('Could not record app uninstall state:', err);
  }
}

/**
 * Trigger Native Android Uninstallation Prompt
 * Uses Android intent URI to invoke the system uninstaller directly on the device
 */
export function triggerAndroidUninstall(
  packageId: string,
  appName: string
): { success: boolean; fallbackNeeded: boolean; message: string } {
  if (!packageId) {
    return {
      success: false,
      fallbackNeeded: false,
      message: 'Package ID not found for this application.'
    };
  }

  const cleanPkg = packageId.trim();

  // Also remove from device tracking registry
  recordAppUninstalled(cleanPkg);

  if (isAndroidDevice()) {
    // Primary Android Intent scheme: UNINSTALL_PACKAGE
    const primaryIntent = `intent:package:${cleanPkg}#Intent;action=android.intent.action.UNINSTALL_PACKAGE;category=android.intent.category.DEFAULT;end`;
    
    // Fallback scheme for older or customized Android ROMs
    const fallbackIntent = `intent:package:${cleanPkg}#Intent;action=android.intent.action.DELETE;end`;

    try {
      // Create hidden anchor to launch Android system intent without leaving the website
      const link = document.createElement('a');
      link.href = primaryIntent;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Attempt fallback if needed
      setTimeout(() => {
        try {
          const fbLink = document.createElement('a');
          fbLink.href = fallbackIntent;
          fbLink.style.display = 'none';
          document.body.appendChild(fbLink);
          fbLink.click();
          document.body.removeChild(fbLink);
        } catch (_) {}
      }, 500);

      return {
        success: true,
        fallbackNeeded: false,
        message: `Android system uninstallation dialog opened for ${appName}!`
      };
    } catch (err) {
      console.warn('Direct intent dispatch failed:', err);
    }
  }

  // Non-Android or manual instructions
  return {
    success: true,
    fallbackNeeded: true,
    message: `To complete uninstallation: On your device, tap and hold "${appName}" and select "Uninstall", or go to Settings > Apps > ${appName} > Uninstall.`
  };
}

/**
 * Trigger Native Android Package Installer
 * Automatically launches the downloaded APK package with Android's system package installer
 */
export function triggerAndroidInstall(blobUrl: string, fileName: string): void {
  // Always trigger the primary file download so the system downloads notification prompts "Install"
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.setAttribute('data-package-installer', 'true');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // If on Android, also attempt the PackageInstaller VIEW intent
  if (isAndroidDevice()) {
    try {
      const intentUrl = `intent:#Intent;action=android.intent.action.VIEW;type=application/vnd.android.package-archive;end`;
      const intentLink = document.createElement('a');
      intentLink.href = intentUrl;
      intentLink.style.display = 'none';
      document.body.appendChild(intentLink);
      intentLink.click();
      document.body.removeChild(intentLink);
    } catch (_) {}
  }
}

/**
 * Launch Zuzu Store Companion Client for unattended background installation
 */
export function launchCompanionClientInstall(
  packageId: string,
  downloadUrl: string,
  appName: string
): boolean {
  try {
    const companionUri = `zuzustore://install?pkg=${encodeURIComponent(packageId)}&name=${encodeURIComponent(appName)}&url=${encodeURIComponent(downloadUrl)}`;
    const link = document.createElement('a');
    link.href = companionUri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (_) {
    return false;
  }
}
