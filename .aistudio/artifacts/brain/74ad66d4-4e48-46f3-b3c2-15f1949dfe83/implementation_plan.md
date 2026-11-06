# Implementation Plan - Super Admin God Mode & Developer Oversight Panel

## 1. Overview & Architecture
This plan implements total administrator control (**God Mode**) for the Super Admin (`sseruwagijohn452@gmail.com`) over all developers, uploaded applications, and global store states. Based on the user's requirements:
- **Developer Oversight**: Full directory of all registered developers, their uploaded APKs, and instant **Ban / Freeze / Unban / Delete** controls.
- **Storefront Moderation**: Instant **Soft Takedown** (unpublishing live apps without deleting them), with full options to **Restore** or **Permanently Delete** with cryptographic tombstones.
- **Developer Broadcast System**: Live broadcast announcements and alert banners sent by the Super Admin, appearing across developer consoles and storefront notices.
- **Direct App Overrides**: Direct administrative editing of any developer's app metadata, packages, and priority ranking badges.

---

## 2. User Preference Alignments (From Clarifications)
1. **Developer Account Controls**: Full control with ban, freeze, unban, and edit powers.
2. **App Moderation Style**: Soft unpublish (takedown from public view while preserving files in admin archive) with option to permanently delete.
3. **Live Broadcast System**: Live broadcast banner system managed by Super Admin and displayed to developers and store visitors.

---

## 3. Data Models & Type Extensions (`src/types.ts`)

1. **Developer Account Extended State**:
   ```typescript
   export type DeveloperStatus = 'active' | 'frozen' | 'banned';

   export interface DeveloperAccountAdminView {
     id: string;
     name: string;
     email: string;
     companyName?: string;
     status: DeveloperStatus;
     bannedAt?: string;
     banReason?: string;
     createdAt: string;
     appCount: number;
     totalDownloads: number;
   }
   ```

2. **StoreApp Moderation Fields**:
   ```typescript
   // Extends StoreApp
   isTakenDown?: boolean;
   takedownReason?: string;
   takenDownAt?: string;
   takenDownBy?: string;
   ```

3. **Admin Broadcast Message**:
   ```typescript
   export interface AdminBroadcast {
     id: string;
     message: string;
     level: 'info' | 'warning' | 'alert';
     active: boolean;
     createdAt: string;
     updatedAt: string;
   }
   ```

---

## 4. Backend Endpoints (`server.ts`)

All endpoints are protected by `requireAdmin` (strictly matching `ADMIN_EMAIL: sseruwagijohn452@gmail.com`).

1. **Developer Directory & Account Enforcement**:
   - `GET /api/admin/developers`: Lists all registered developer accounts, aggregated with their submitted apps count and status.
   - `POST /api/admin/developers/:id/status`: Updates developer status (`'active' | 'frozen' | 'banned'`) with optional reason.
   - `DELETE /api/admin/developers/:id`: Deletes developer account from `developers.json`.
   - `GET /api/admin/developers/:id/apps`: Returns all apps (approved, pending, or taken down) uploaded by a specific developer.
   - *Middleware Update*: Update `requireDeveloper` to reject frozen or banned developers immediately with specific HTTP 403 status and reason.

2. **App Moderation & Takedown Endpoints**:
   - `POST /api/admin/apps/:id/takedown`: Soft unpublishes an app (`isTakenDown = true`), instantly removing it from public store listings, search, and downloads without deleting the files.
   - `POST /api/admin/apps/:id/restore`: Restores a taken-down app back to live storefront (`isTakenDown = false`).
   - `PATCH /api/admin/apps/:id/override`: God Mode direct override for any app's metadata (name, category, tagline, description, package ID).

3. **Broadcast System Endpoints**:
   - `GET /api/broadcast`: Public & developer endpoint returning the active announcement (if active).
   - `POST /api/admin/broadcast`: Super Admin endpoint to create, update, or disable the broadcast banner.

---

## 5. Frontend & UI Implementation

1. **Publisher Portal - God Mode Tab (`src/components/PublisherPortal.tsx`)**:
   - Add a dedicated **"God Mode & Developers"** tab in the Super Admin console navigation bar (styled with amber & red crown icon).
   - **Section A: Developer Master Roster**:
     - Real-time search/filter by developer name, studio, or email.
     - Metrics: Total Registered Developers, Active, Frozen/Banned.
     - Table / Card view showing: Name, Studio, Email, Joined date, Apps count, Status (🟢 Active / 🟡 Frozen / 🔴 Banned).
     - Action buttons:
       - **Inspect Apps**: Opens modal showing all apps submitted by this specific developer.
       - **Freeze / Unfreeze**: Blocks developer from publishing updates temporarily.
       - **Ban**: Complete account lock with custom reason.
       - **Delete Account**: Removes developer profile.
   - **Section B: Live App Takedown & Store Moderation**:
     - Dedicated controls on every app card in Live Catalog to "Soft Takedown" with feedback note, or "Restore Live".
   - **Section C: Platform Broadcast Console**:
     - Input field, priority selector (Info / Warning / Critical Alert), and Toggle (Active / Inactive).
     - Live preview of how the banner appears to developers and visitors.

2. **Developer Console Integration (`src/components/DeveloperConsole.tsx`)**:
   - Display active Super Admin broadcast banners prominently at the top of the dashboard.
   - If the developer account is frozen or banned, render an immovable security shield overlay explaining that their account has been suspended by the Super Admin, disabling submission forms.

3. **Storefront Broadcast Banner (`src/components/Header.tsx` or `src/App.tsx`)**:
   - Discreet, beautiful dismissible broadcast ribbon at the top of the store when an active platform announcement is published.

---

## 6. Verification & Test Plan

1. **Authentication & Authorization**:
   - Verify non-admins cannot access `/api/admin/developers` or `/api/admin/broadcast`.
   - Verify frozen/banned developers receive clear status banners and cannot submit apps.
2. **Developer Management**:
   - Create a test developer account.
   - In God Mode panel, freeze the account and verify submission fails.
   - Unfreeze and verify submission succeeds.
3. **Soft Takedown & Restoration**:
   - Take down an approved live app.
   - Verify the app vanishes instantly from public store, search, and download APIs.
   - Restore the app and verify it reappears with ratings and downloads intact.
4. **Broadcast Messaging**:
   - Set an alert broadcast in the Super Admin panel.
   - Verify it renders live in Developer Console and on the storefront.
5. **Codebase Health**:
   - Execute `compile_applet` and `lint_applet` together to verify 0 syntax or TypeScript errors.
   - Verify dev server starts and operates cleanly on port 3000.
