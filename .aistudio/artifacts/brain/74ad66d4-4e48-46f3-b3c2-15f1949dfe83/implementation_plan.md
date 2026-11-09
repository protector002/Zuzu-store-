# Implementation Plan: Paid Apps, 6% Admin Commission & Developer Withdrawal Wallet

This plan introduces a complete commercial marketplace model into ZuzuStore, allowing developers to publish apps as either **Free** or **Paid**, automatically deducting a **6% Super Admin commission** on every sale, providing developers with a transparent financial dashboard showing gross revenue, 6% fee deduction, and net balance, and enabling automated withdrawal requests with a **minimum threshold of 1,000**.

---

## 1. Marketplace Architecture & Financial Mathematics

### Pricing & Commission Breakdown
- When submitting or editing an app, developers select **Pricing Model**:
  - **Free App**: Downloadable directly by any visitor with 1 click (no payment required).
  - **Paid App**: Developer specifies a sale price (e.g. `1,000`, `5,000`, `15,000` or `$2.99`, `$9.99`).
- On every completed sale:
  - **Gross Amount**: $100\%$ of customer payment.
  - **Super Admin Platform Cut (6%)**: $\text{Gross} \times 0.06$ routed to the Super Admin's platform balance.
  - **Developer Net Earnings (94%)**: $\text{Gross} \times 0.94$ credited to the developer's available wallet balance.
- **Minimum Withdrawal Rule**:
  - Developers can request withdrawals when their available net balance reaches **at least 1,000**.
  - Payout destination options: **Mobile Money (MTN Mobile Money / Airtel Money)**, **Bank Transfer**, or **PayPal**.

---

## 2. Data Models & Type Extensions (`src/types.ts`)

```typescript
export type AppPricingType = 'free' | 'paid';

export interface AppPriceConfig {
  type: AppPricingType;
  price: number; // 0 for free, > 0 for paid
  currency: string; // e.g. 'UGX' | 'USD'
  discountPrice?: number;
}

// Extends StoreApp in src/types.ts and server.ts
export interface StoreApp {
  // ... existing properties
  pricing?: AppPriceConfig;
}

// Sale & Commission Transaction Record
export interface AppSaleTransaction {
  id: string;
  appId: string;
  appName: string;
  developerId: string;
  developerEmail: string;
  customerName: string;
  customerEmail: string;
  grossAmount: number;
  adminCommissionPercent: number; // 6
  adminCommissionAmount: number; // gross * 0.06
  developerNetAmount: number; // gross * 0.94
  currency: string;
  paymentMethod: string;
  status: 'completed' | 'refunded';
  createdAt: string;
}

// Developer Financial Wallet
export interface DeveloperWallet {
  developerId: string;
  totalGrossRevenue: number;
  totalAdminFeesPaid: number; // 6% sum
  totalNetEarnings: number; // 94% sum
  totalWithdrawn: number;
  availableBalance: number; // totalNetEarnings - totalWithdrawn - pendingWithdrawals
  pendingWithdrawals: number;
  currency: string;
  updatedAt: string;
}

// Withdrawal Request Record
export interface WithdrawalRequest {
  id: string;
  developerId: string;
  developerName: string;
  developerEmail: string;
  amount: number; // Minimum 1000
  currency: string;
  payoutMethod: 'mobile_money_mtn' | 'mobile_money_airtel' | 'bank_transfer' | 'paypal';
  payoutDetails: {
    accountName: string;
    accountNumber: string; // Phone number for MoMo or Bank Account
    bankName?: string;
    swiftCode?: string;
    notes?: string;
  };
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  rejectionReason?: string;
  transactionRef?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}
```

---

## 3. Backend Endpoints & Cloud Firestore Persistence (`server.ts`)

All financial mutations are backed by transactions in memory and synchronized with **Cloud Firestore** (`sales`, `wallets`, and `withdrawals` collections) so that records are permanent and never lost.

1. **Purchases & Checkout**:
   - `POST /api/apps/:id/purchase`:
     - Creates verified `AppSaleTransaction`.
     - Calculates:
       - `adminCommissionAmount = Math.round(grossAmount * 0.06)`
       - `developerNetAmount = grossAmount - adminCommissionAmount`
     - Updates developer wallet: increments `totalGrossRevenue`, `totalAdminFeesPaid`, and `availableBalance`.
     - Generates an instant **Download Access Token** and receipt for the buyer.
   - `GET /api/apps/:id/verify-purchase?token=...`: Authorizes instant APK download for paid apps.

2. **Developer Financial Console**:
   - `GET /api/developer/wallet`: Returns real-time financial stats:
     - Total Gross Sales (Real money generated)
     - 6% Super Admin System Commission deducted
     - Current Available Balance (Net 94%)
     - Sales history log with timestamps and individual fee deductions.
   - `POST /api/developer/withdraw`:
     - Validates `amount >= 1000`.
     - Validates `amount <= wallet.availableBalance`.
     - Freezes the requested amount into `pendingWithdrawals` and creates a `WithdrawalRequest`.
   - `GET /api/developer/withdrawals`: Returns developer's past withdrawal history and status.

3. **Super Admin God Mode Financial Hub**:
   - `GET /api/admin/financials`: Aggregated platform overview:
     - Total Store Gross Sales
     - Total 6% Admin Commissions Collected (Profit)
     - Total Payouts Disbursed
     - Total Pending Developer Withdrawals
   - `GET /api/admin/withdrawals`: Lists all pending and processed withdrawal requests across all developers.
   - `POST /api/admin/withdrawals/:id/approve`: Approves a withdrawal and records payout reference.
   - `POST /api/admin/withdrawals/:id/reject`: Rejects with feedback, automatically restoring the funds to developer's available balance.

---

## 4. Frontend & User Experience Updates

### A. Developer Submission & Edit Form (`PublisherPortal.tsx` & `DeveloperConsole.tsx`)
- Add a **Pricing & Monetization Toggle**:
  - `Free (Direct Public Download)`
  - `Paid App (Sell for a Set Price)`
- When "Paid" is selected:
  - Input for Price (with live calculator preview):
    - *Example: Price 10,000 UGX $\rightarrow$ 600 UGX (6% Platform Fee) $\rightarrow$ 9,400 UGX (Your Net Earnings).*

### B. Developer Dashboard: "Earnings & Wallet" Tab (`DeveloperConsole.tsx`)
- **Key Financial Cards**:
  1. **Gross App Sales**: Total actual money paid by customers.
  2. **Admin Commission (6%)**: Exact amount deducted by the system for the platform fee.
  3. **Available Net Balance**: Real money ready for withdrawal.
- **Make a Withdrawal Section**:
  - Form with minimum amount validation ($1,000$ minimum threshold).
  - Method selector: MTN Mobile Money, Airtel Money, Bank Transfer, PayPal.
  - Clear breakdown: Amount requested, payout account, and remaining balance.
- **Recent Sales & Payout History Table**:
  - Live ledger of each customer sale with gross, 6% fee, and net columns.

### C. Public Storefront & Purchase Flow (`AppCatalog.tsx`, `HeroZuzu.tsx`, `AppDetailView.tsx`)
- Free apps retain the prominent **"Get APK / Free Download"** button.
- Paid apps display a stylish **Price Badge** (e.g. `UGX 5,000` or `$2.99`) and **"Buy & Download"** button.
- Clicking "Buy & Download" opens the **Secure Checkout Modal**:
  - Buyer enters Name, Email, and confirms payment.
  - Instantly unlocks the high-speed APK download with an on-screen receipt and purchase verification code.

### D. Super Admin God Mode: "Platform Earnings & Payouts" (`PublisherPortal.tsx`)
- Super Admin receives a dedicated **Financials & Withdrawals** sub-panel:
  - Real-time tally of all 6% commissions earned by `sseruwagijohn452@gmail.com`.
  - Pending withdrawals queue with 1-click **Approve Payout** or **Reject & Refund**.
  - Searchable global audit log of every purchase and payout on the platform.

---

## 5. Verification & Security Plan

1. **Financial Precision**:
   - Math check: Ensure $6\%$ admin cut and $94\%$ developer cut always equal $100\%$ without rounding discrepancies.
2. **Withdrawal Guardrails**:
   - Attempting withdrawal $< 1000$ returns an immediate validation error.
   - Attempting withdrawal exceeding available balance is strictly rejected.
3. **Double-Spend Prevention**:
   - Funds are locked into `pendingWithdrawals` upon request so developers cannot double-withdraw.
4. **Cloud Firestore Sync**:
   - Verify all sales, wallets, and withdrawal documents persist permanently in Firestore database `ai-studio-animeapkhub-74ad66d4-4e48-46f3-b3c2-15f1949dfe83`.
5. **Compilation & Build**:
   - Ensure `compile_applet` and `lint_applet` pass with 0 errors.
