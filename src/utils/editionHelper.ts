import { StoreApp, AppRelease } from '../types';

/**
 * Checks if an application has a TV version (Smart TV, Android TV, Fire TV)
 */
export function isTvApp(app: StoreApp): boolean {
  if (app.appEdition === 'tv' || app.appEdition === 'both') {
    return true;
  }
  if (app.appEdition === 'phone') {
    // If explicitly marked as phone, only consider TV if it has a dedicated TV release
    return (app.releases || []).some(
      (r) => r.platform === 'Android TV' || r.platform === 'Smart TV' || r.platform === 'Fire TV'
    );
  }

  // Check supported platforms
  const platforms = app.supportedPlatforms || [];
  const hasTvPlatform = platforms.some(
    (p) => p === 'Android TV' || p === 'Smart TV' || p === 'Fire TV'
  );
  if (hasTvPlatform) {
    return true;
  }

  // Check releases
  const hasTvRelease = (app.releases || []).some(
    (r) => r.platform === 'Android TV' || r.platform === 'Smart TV' || r.platform === 'Fire TV'
  );
  if (hasTvRelease) {
    return true;
  }

  if (app.isTvCompatible === true) {
    return true;
  }

  return false;
}

/**
 * Checks if an application has an Android Phone / mobile version
 */
export function isPhoneApp(app: StoreApp): boolean {
  if (app.appEdition === 'phone' || app.appEdition === 'both') {
    return true;
  }
  if (app.appEdition === 'tv') {
    // If explicitly marked as tv, only consider phone if it has an Android phone release
    return (app.releases || []).some(
      (r) => r.platform === 'Android' || r.platform === 'iOS'
    );
  }

  // If all platforms are TV-exclusive, it is not a phone app
  const platforms = app.supportedPlatforms || [];
  if (
    platforms.length > 0 &&
    platforms.every((p) => p === 'Android TV' || p === 'Smart TV' || p === 'Fire TV')
  ) {
    return false;
  }

  // If primary and all releases are TV-exclusive, it is not a phone app
  const releases = app.releases || [];
  if (
    releases.length > 0 &&
    releases.every((r) => r.platform === 'Android TV' || r.platform === 'Smart TV' || r.platform === 'Fire TV')
  ) {
    return false;
  }

  // Otherwise default is a phone app
  return true;
}

/**
 * Retrieves the preferred TV release for an application
 */
export function getTvRelease(app: StoreApp): AppRelease | undefined {
  if (!app.releases || app.releases.length === 0) return undefined;
  const tvRel = app.releases.find(
    (r) => r.platform === 'Android TV' || r.platform === 'Smart TV' || r.platform === 'Fire TV'
  );
  return tvRel || app.releases[0];
}

/**
 * Retrieves the preferred Phone release for an application
 */
export function getPhoneRelease(app: StoreApp): AppRelease | undefined {
  if (!app.releases || app.releases.length === 0) return undefined;
  const phoneRel = app.releases.find(
    (r) => r.platform === 'Android' || r.platform === 'iOS' || r.platform === 'Windows' || r.platform === 'macOS'
  );
  return phoneRel || app.releases[0];
}

/**
 * Filters a list of apps to only include those intended for the Android Phone storefront
 */
export function filterPhoneApps(apps: StoreApp[]): StoreApp[] {
  return apps.filter(isPhoneApp);
}

/**
 * Filters a list of apps to only include those intended for the Smart TV page
 */
export function filterTvApps(apps: StoreApp[]): StoreApp[] {
  return apps.filter(isTvApp);
}
