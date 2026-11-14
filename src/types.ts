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
  displayOrder?: number;
  isFeatured?: boolean;
  isPinnedToTop?: boolean;
  pricing?: AppPriceConfig;
  approvalStatus?: 'approved' | 'pending_approval' | 'rejected';
  isTakenDown?: boolean;
  takedownReason?: string;
  takenDownAt?: string;
  takenDownBy?: string;
  submittedBy?: {
    id: string;
    name: string;
    email: string;
  };
  ownershipHistory?: AppOwnershipTransferRecord[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppOwnershipTransferRecord {
  id: string;
  fromId: string;
  fromName: string;
  fromEmail: string;
  toId: string;
  toName: string;
  toEmail: string;
  transferredAt: string;
  transferredBy: string;
  reason?: string;
  updatedDisplayCredit: boolean;
  pricePaid?: number;
  adminFeePercent?: number;
  adminFeeAmount?: number;
  sellerNetAmount?: number;
  currency?: string;
  transferListingId?: string;
  paymentMethod?: string;
}

export interface AppTransferListing {
  id: string;
  appId: string;
  appName: string;
  appSlug?: string;
  appIcon: string;
  appVersion: string;
  appCategory: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  targetBuyerId?: string;
  targetBuyerEmail?: string;
  targetBuyerName?: string;
  askingPrice: number;
  adminFeePercent: number;
  adminFeeAmount: number;
  sellerNetAmount: number;
  currency: string;
  note?: string;
  status: 'open' | 'completed' | 'cancelled';
  buyerId?: string;
  buyerName?: string;
  buyerEmail?: string;
  paymentMethod?: string;
  phoneNumber?: string;
  livepayReference?: string;
  livepayInternalRef?: string;
  livepayNetwork?: string;
  transferRecordId?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface AdminUser {
  email: string;
  name: string;
  role: string;
}

export type DeveloperStatus = 'active' | 'frozen' | 'banned';

export interface DeveloperUser {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  status?: DeveloperStatus;
  banReason?: string;
  bannedAt?: string;
  agreementsAccepted?: boolean;
  agreementsAcceptedAt?: string;
  agreementsVersion?: string;
  createdAt: string;
}

export interface DeveloperAccountAdminView {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  status: DeveloperStatus;
  banReason?: string;
  bannedAt?: string;
  createdAt: string;
  appsCount: number;
  totalDownloads: number;
  apps?: Array<{
    id: string;
    slug: string;
    name: string;
    currentVersion: string;
    approvalStatus: string;
    isTakenDown: boolean;
    downloadsTotal?: number;
  }>;
}

export interface AdminBroadcast {
  id?: string;
  message: string;
  level: 'info' | 'warning' | 'alert';
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  link?: string;
  linkText?: string;
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

// ==========================================
// MONETIZATION, COMMISSIONS & WALLET TYPES
// ==========================================

export type AppPricingType = 'free' | 'paid';

export interface AppPriceConfig {
  type: AppPricingType;
  price: number; // 0 for free, > 0 for paid
  currency: string; // 'UGX' | 'USD'
  discountPrice?: number;
}

export interface AppSaleTransaction {
  id: string;
  appId: string;
  appName: string;
  appIcon?: string;
  developerId: string;
  developerEmail: string;
  customerName: string;
  customerEmail: string;
  grossAmount: number;
  adminCommissionPercent: number; // 6%
  adminCommissionAmount: number; // gross * 0.06
  developerNetAmount: number; // gross * 0.94
  currency: string;
  paymentMethod: string;
  phoneNumber?: string;
  livepayReference?: string;
  livepayInternalRef?: string;
  livepayNetwork?: string;
  livepayStatus?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  failureReason?: string;
  transactionType?: 'app_purchase' | 'ownership_transfer';
  downloadToken?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DeveloperWallet {
  developerId: string;
  totalGrossRevenue: number;
  totalAdminFeesPaid: number; // 6% sum
  totalNetEarnings: number; // 94% sum
  totalWithdrawn: number;
  availableBalance: number;
  pendingWithdrawals: number;
  currency: string;
  recentSales?: AppSaleTransaction[];
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  developerId: string;
  developerName: string;
  developerEmail: string;
  amount: number; // Gross amount requested (min 1000)
  transferFee?: number; // Sending charge (100 UGX deducted per 1000 UGX)
  netPayoutAmount?: number; // Actual cash sent to handset (amount - transferFee)
  currency: string;
  payoutMethod: 'mobile_money_mtn' | 'mobile_money_airtel' | 'bank_transfer' | 'paypal';
  payoutDetails: {
    accountName: string;
    accountNumber: string; // Phone number or Bank Account
    bankName?: string;
    swiftCode?: string;
    notes?: string;
  };
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  payoutChannel?: 'livepay' | 'manual';
  rejectionReason?: string;
  transactionRef?: string;
  livepayInternalRef?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface LivePayConfigStatus {
  accountNumber: string;
  active: boolean;
  webhookUrl: string;
  supportedCurrencies: string[];
  supportedNetworks: string[];
}

export interface SystemSettings {
  adminCommissionPercent: number;
  withdrawalTransferFeePer1000: number;
  updatedAt: string;
}

export interface AdminFinancialSummary {
  totalGrossSales: number;
  totalAdminCommissionEarned: number;
  totalDeveloperNetEarnings: number;
  totalDisbursedWithdrawals: number;
  totalPendingWithdrawals: number;
  totalPaidTransactionsCount: number;
  totalTransferGross?: number;
  totalTransferAdminFees?: number;
  totalCompletedTransfersCount?: number;
  currency: string;
  adminCommissionPercent?: number;
  withdrawalTransferFeePer1000?: number;
  livepayConfig?: LivePayConfigStatus;
}


