export type Platform = 'Android' | 'Smart TV' | 'Android TV' | 'Fire TV' | 'Windows' | 'iOS' | 'macOS';

export type AppCategory =
  | 'Productivity'
  | 'Utilities'
  | 'Tools'
  | 'Entertainment'
  | 'Smart TV'
  | 'Social'
  | 'Lifestyle'
  | 'Finance'
  | 'Games'
  | 'TV & Movies';

export interface AppRelease {
  id: string;
  version: string;
  buildNumber: number;
  releaseDate: string;
  fileSize: string;
  fileName: string;
  platform: Platform;
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
  category: AppCategory | string;
  developer: {
    name: string;
    email: string;
    website?: string;
    verified: boolean;
  };
  rating: number;
  ratingCount: number;
  downloadsTotal: number;
  supportedPlatforms: Platform[];
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
  appEdition?: 'phone' | 'tv' | 'both';
  isTvCompatible?: boolean;
  tvBannerUrl?: string;
  downloaderCode?: string;
  approvalStatus?: 'approved' | 'pending_approval' | 'rejected';
  submittedBy?: {
    id: string;
    name: string;
    email: string;
  };
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  email: string;
  name: string;
  role: string;
}

export interface DeveloperUser {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  createdAt: string;
}

export interface DeveloperSessionState {
  isAuthenticated: boolean;
  developer: DeveloperUser | null;
  token: string | null;
}

export interface AdminSessionState {
  isAuthenticated: boolean;
  admin: AdminUser | null;
  token: string | null;
}

export interface DownloadProgressState {
  isOpen: boolean;
  status: 'idle' | 'connecting' | 'downloading' | 'verifying' | 'completed' | 'error';
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  downloadedMbFormatted: string;
  remainingMbFormatted: string;
  speedFormatted: string;
  timeRemainingFormatted: string;
  appName: string;
  appIcon: string;
  version: string;
  fileName: string;
  fileSize?: string;
  errorMessage?: string;
  blobUrl?: string;
  packageId?: string;
}


