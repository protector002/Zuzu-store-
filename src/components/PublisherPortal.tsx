import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Sparkles,
  Layers,
  Trash2,
  ExternalLink,
  Smartphone,
  AlertCircle,
  Plus,
  RefreshCw,
  FolderArchive,
  Download,
  Lock,
  ShieldCheck,
  KeyRound,
  Link2,
  Image as ImageIcon
} from 'lucide-react';
import { StoreApp, Platform, AppCategory, AdminUser } from '../types';

interface PublisherPortalProps {
  apps: StoreApp[];
  admin: AdminUser | null;
  onOpenLoginModal: () => void;
  onUploadApp: (payload: FormData | Record<string, any>) => Promise<StoreApp>;
  onAddRelease: (appId: string, payload: FormData | Record<string, any>) => Promise<StoreApp>;
  onDeleteApp: (appId: string) => Promise<void>;
  onResetCatalog: () => Promise<void>;
  onViewAppInStore: (app: StoreApp) => void;
  onDownloadTest: (appId: string, releaseId?: string) => Promise<void>;
}

// Convert chosen image to compressed Base64 Data URL so it is permanently stored in app data
// and never fails with 404 on Vercel or ephemeral serverless filesystems
function convertImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxSize = 256;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png', 0.95));
        } catch (_) {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => resolve('/zuzustore-logo.png');
    reader.readAsDataURL(file);
  });
}

// Auto-transform Google Drive, Dropbox, and cloud storage URLs into direct 1-click download links
function formatCloudUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  const gdMatch1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdMatch1 && gdMatch1[1]) {
    return `https://drive.google.com/uc?export=download&id=${gdMatch1[1]}`;
  }
  const gdMatch2 = trimmed.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (gdMatch2 && gdMatch2[1]) {
    return `https://drive.google.com/uc?export=download&id=${gdMatch2[1]}`;
  }
  if (trimmed.includes('dropbox.com') && trimmed.includes('dl=0')) {
    return trimmed.replace('dl=0', 'dl=1');
  }
  return trimmed;
}

export const PublisherPortal: React.FC<PublisherPortalProps> = ({
  apps,
  admin,
  onOpenLoginModal,
  onUploadApp,
  onAddRelease,
  onDeleteApp,
  onResetCatalog,
  onViewAppInStore,
  onDownloadTest,
}) => {
  const [activeTab, setActiveTab] = useState<'upload-new' | 'update-existing' | 'manage'>('upload-new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state for New App
  const [appName, setAppName] = useState('');
  const [appTagline, setAppTagline] = useState('');
  const [appCategory, setAppCategory] = useState<AppCategory | string>('Productivity');
  const [appDescription, setAppDescription] = useState('');
  const [appPackageId, setAppPackageId] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [appPlatform, setAppPlatform] = useState<Platform>('Android');
  const [appMinOS, setAppMinOS] = useState('Android 8.0+');
  const [appChangelog, setAppChangelog] = useState('Initial public APK release.');
  const [uploadedBinaryFile, setUploadedBinaryFile] = useState<File | null>(null);
  const [directDownloadUrl, setDirectDownloadUrl] = useState<string>('');
  
  // Icon state - defaults to the official ZuzuStore brand logo
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string>('/zuzustore-logo.png');
  const [customIconUrlInput, setCustomIconUrlInput] = useState<string>('');

  // Update existing app state
  const [selectedExistingAppId, setSelectedExistingAppId] = useState<string>(apps[0]?.id || '');
  const [updateVersion, setUpdateVersion] = useState('1.1.0');
  const [updatePlatform, setUpdatePlatform] = useState<Platform>('Android');
  const [updateMinOS, setUpdateMinOS] = useState('Android 9.0+');
  const [updateChangelog, setUpdateChangelog] = useState('Critical stability fixes, updated APK signature, and performance improvements.');
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateDirectUrl, setUpdateDirectUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // If not authenticated as Admin, show authentication gate
  if (!admin) {
    return (
      <div className="py-16 max-w-2xl mx-auto px-4 text-center">
        <div className="p-8 sm:p-10 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800/80 text-cyan-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Publisher Account Required</h2>
            <p className="text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
              Users can download any APK freely without an account. However, publishing and managing applications is restricted to the administrator account.
            </p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs text-neutral-300 text-left space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Protected Administrator Portal</span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Only the store administrator can publish and manage APK packages. Sign in using your private administrator credentials.
            </p>
          </div>

          <div>
            <button
              onClick={onOpenLoginModal}
              className="w-full sm:w-auto px-6 py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              <KeyRound className="w-4 h-4" />
              <span>Log In as Admin to Publish Apps</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleBinaryFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedBinary(e.dataTransfer.files[0]);
    }
  };

  const processSelectedBinary = (file: File) => {
    setUploadedBinaryFile(file);
    if (file.name.endsWith('.apk') || file.name.endsWith('.aab')) {
      setAppPlatform('Android');
    } else if (file.name.endsWith('.exe')) {
      setAppPlatform('Windows');
    }

    // Auto-suggest app name and package ID if empty
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (!appName.trim()) {
      const cleanName = baseName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setAppName(cleanName);
    }
    if (!appPackageId.trim()) {
      const cleanSlug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
      setAppPackageId(`com.zuzu.${cleanSlug}`);
    }
  };

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const dataUrl = await convertImageToDataUrl(file);
      setIconPreviewUrl(dataUrl);
      setCustomIconUrlInput('');
    }
  };

  const handleCustomIconUrlChange = (url: string) => {
    setCustomIconUrlInput(url);
    if (url.trim()) {
      setIconPreviewUrl(url.trim());
    } else {
      setIconPreviewUrl('/zuzustore-logo.png');
    }
  };

  const isGoogleDrive = (url: string) => url.includes('drive.google.com');

  const handleSubmitNewApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      setErrorMessage('Application name is required.');
      return;
    }

    const hasDirectLink = Boolean(directDownloadUrl.trim());
    const isLargeFile = uploadedBinaryFile && uploadedBinaryFile.size > 4.5 * 1024 * 1024;

    // Check if large file on serverless without direct link
    if (isLargeFile && !hasDirectLink) {
      setErrorMessage(
        `This APK is ${(uploadedBinaryFile.size / (1024 * 1024)).toFixed(1)} MB. Serverless hosting on Vercel limits HTTP body uploads to 4.5 MB. Please paste your Direct Download Link (e.g. Google Drive, Dropbox, GitHub Releases) in the field below to publish!`
      );
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(15);
    setErrorMessage(null);

    try {
      const formattedLink = hasDirectLink ? formatCloudUrl(directDownloadUrl) : '';
      const finalFileName = uploadedBinaryFile
        ? uploadedBinaryFile.name
        : `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v${appVersion || '1.0.0'}.apk`;
      const finalFileSize = uploadedBinaryFile
        ? `${(uploadedBinaryFile.size / (1024 * 1024)).toFixed(1)} MB`
        : '29.3 MB';
      const finalIcon = iconPreviewUrl || '/zuzustore-logo.png';

      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 25));
      }, 100);

      // If a direct download link is present OR no binary file is being sent:
      // Send a lightweight JSON request! This avoids sending 30MB over Vercel's 4.5MB limit, eliminating "Failed to fetch"!
      if (hasDirectLink || !uploadedBinaryFile) {
        const payload = {
          name: appName.trim(),
          tagline: appTagline.trim() || `${appName} for Android`,
          category: appCategory,
          description: appDescription.trim() || `${appName} official APK build.`,
          packageId: appPackageId.trim() || `com.zuzu.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          version: appVersion.trim() || '1.0.0',
          platform: appPlatform,
          minOS: appMinOS.trim() || 'Android 8.0+',
          changelog: appChangelog,
          directDownloadUrl: formattedLink,
          fileName: finalFileName,
          fileSize: finalFileSize,
          iconUrl: finalIcon
        };

        const created = await onUploadApp(payload);
        clearInterval(interval);
        setUploadProgress(100);
        setSuccessMessage(`"${created.name}" was successfully published with direct download access!`);
      } else {
        // Direct binary upload for files <= 4.5 MB
        const formData = new FormData();
        formData.append('name', appName.trim());
        formData.append('tagline', appTagline.trim() || `${appName} for Android`);
        formData.append('category', appCategory);
        formData.append('description', appDescription.trim() || `${appName} official APK build.`);
        formData.append('packageId', appPackageId.trim() || `com.zuzu.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        formData.append('version', appVersion.trim() || '1.0.0');
        formData.append('platform', appPlatform);
        formData.append('minOS', appMinOS.trim() || 'Android 8.0+');
        formData.append('changelog', appChangelog);
        formData.append('fileName', finalFileName);
        formData.append('fileSize', finalFileSize);
        formData.append('iconUrl', finalIcon);
        formData.append('apkFile', uploadedBinaryFile);

        const created = await onUploadApp(formData);
        clearInterval(interval);
        setUploadProgress(100);
        setSuccessMessage(`"${created.name}" was successfully published with direct download access!`);
      }

      // Reset form
      setAppName('');
      setAppTagline('');
      setAppDescription('');
      setUploadedBinaryFile(null);
      setDirectDownloadUrl('');
      setIconPreviewUrl('/zuzustore-logo.png');

      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
        setActiveTab('manage');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while publishing your APK.');
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleSubmitUpdateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingAppId) return;

    const hasDirectLink = Boolean(updateDirectUrl.trim());
    const isLargeFile = updateFile && updateFile.size > 4.5 * 1024 * 1024;

    if (isLargeFile && !hasDirectLink) {
      setErrorMessage(
        `This APK update is ${(updateFile.size / (1024 * 1024)).toFixed(1)} MB. Vercel serverless has a 4.5 MB limit. Please enter a Direct Download Link below to publish this release.`
      );
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(20);
    setErrorMessage(null);

    try {
      const formattedLink = hasDirectLink ? formatCloudUrl(updateDirectUrl) : '';
      const finalFileName = updateFile ? updateFile.name : `release-v${updateVersion.trim()}.apk`;
      const finalFileSize = updateFile ? `${(updateFile.size / (1024 * 1024)).toFixed(1)} MB` : '32.0 MB';

      const interval = setInterval(() => {
        setUploadProgress((p) => (p >= 90 ? 90 : p + 20));
      }, 100);

      if (hasDirectLink || !updateFile) {
        const payload = {
          version: updateVersion.trim(),
          platform: updatePlatform,
          minOS: updateMinOS.trim(),
          changelog: updateChangelog,
          directDownloadUrl: formattedLink,
          fileName: finalFileName,
          fileSize: finalFileSize
        };

        await onAddRelease(selectedExistingAppId, payload);
      } else {
        const formData = new FormData();
        formData.append('version', updateVersion.trim());
        formData.append('platform', updatePlatform);
        formData.append('minOS', updateMinOS.trim());
        formData.append('changelog', updateChangelog);
        formData.append('fileName', finalFileName);
        formData.append('fileSize', finalFileSize);
        formData.append('apkFile', updateFile);

        await onAddRelease(selectedExistingAppId, formData);
      }

      clearInterval(interval);
      setUploadProgress(100);
      setSuccessMessage(`New APK release v${updateVersion} published successfully!`);
      setUpdateFile(null);
      setUpdateDirectUrl('');

      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
        setActiveTab('manage');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to publish release update.');
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="py-10 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header section with admin badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
            <span>Publisher Portal</span>
            <span>•</span>
            <span className="text-emerald-400">Authenticated Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            APK Distribution Console
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Publish applications, release new APK updates, and manage public store downloads.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('upload-new')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload-new'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New APK</span>
          </button>
          <button
            onClick={() => setActiveTab('update-existing')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'update-existing'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Add Version Release</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Live Catalog ({apps.length})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: UPLOAD NEW APP */}
      {activeTab === 'upload-new' && (
        <form onSubmit={handleSubmitNewApp} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Binary File Drop & Metadata */}
            <div className="lg:col-span-7 space-y-6">
              {/* Package Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Select Android APK File (.apk, .aab, or zip)
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleBinaryFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-colors ${
                    uploadedBinaryFile
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : 'border-neutral-800 hover:border-cyan-500 bg-neutral-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".apk,.aab,.exe,.zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processSelectedBinary(e.target.files[0]);
                      }
                    }}
                  />
                  {uploadedBinaryFile ? (
                    <div className="flex flex-col items-center">
                      <FolderArchive className="w-10 h-10 text-emerald-400 mb-2" />
                      <p className="text-sm font-bold text-white">{uploadedBinaryFile.name}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {(uploadedBinaryFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for publication
                      </p>
                      <span className="text-[11px] text-cyan-400 hover:underline mt-2">
                        Click to choose a different file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadCloud className="w-10 h-10 text-neutral-400 mb-2.5" />
                      <p className="text-sm font-semibold text-white">
                        Drag and drop your Android .APK here
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Or click to select an APK file from your phone or computer
                      </p>
                      <span className="mt-3 px-3 py-1.5 text-xs font-medium bg-neutral-800 text-neutral-200 rounded-lg">
                        Browse APK Files
                      </span>
                    </div>
                  )}
                </div>

                {/* Helpful guidance if file exceeds Vercel's 4.5MB limit */}
                {uploadedBinaryFile && uploadedBinaryFile.size > 4.5 * 1024 * 1024 && (
                  <div className="p-3.5 bg-amber-950/30 border border-amber-600/40 rounded-xl text-xs text-amber-200 space-y-1 mt-3">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{uploadedBinaryFile.name} ({(uploadedBinaryFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      On Vercel, direct serverless uploads are limited to 4.5 MB. Enter your Direct Download Link below (Google Drive, GitHub Releases, Dropbox, S3). The store will display your exact file name ({uploadedBinaryFile.name}) and size ({(uploadedBinaryFile.size / (1024 * 1024)).toFixed(1)} MB), providing instant downloads for all visitors!
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 my-4 text-xs text-neutral-500">
                  <div className="flex-1 h-px bg-neutral-800" />
                  <span>DIRECT DOWNLOAD LINK (RECOMMENDED FOR CLOUD HOSTING)</span>
                  <div className="flex-1 h-px bg-neutral-800" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Direct APK Download Link (Google Drive, GitHub, Dropbox, S3)</span>
                    </label>
                    {directDownloadUrl.trim() && isGoogleDrive(directDownloadUrl) && (
                      <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        ✓ Google Drive Direct Download Active
                      </span>
                    )}
                  </div>
                  <input
                    type="url"
                    value={directDownloadUrl}
                    onChange={(e) => setDirectDownloadUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... or https://github.com/user/repo/releases/download/.../app.apk"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1.5">
                    Supports Google Drive share links, GitHub Releases, Dropbox, and S3 without file size limits.
                  </p>
                </div>
              </div>

              {/* App Basic Details */}
              <div className="space-y-4 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Application Information</h3>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Application Name *</label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g., Zuzu Mobile, Anime Streamer, NoteVault"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Tagline / Pitch</label>
                  <input
                    type="text"
                    value={appTagline}
                    onChange={(e) => setAppTagline(e.target.value)}
                    placeholder="e.g., Fast, native offline companion with end-to-end sync."
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Category</label>
                    <select
                      value={appCategory}
                      onChange={(e) => setAppCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Productivity">Productivity</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Tools">Tools</option>
                      <option value="Social">Social</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Finance">Finance</option>
                      <option value="Games">Games</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Platform</label>
                    <select
                      value={appPlatform}
                      onChange={(e) => setAppPlatform(e.target.value as Platform)}
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Android">Android (.apk)</option>
                      <option value="Windows">Windows (.exe)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Version String *</label>
                    <input
                      type="text"
                      required
                      value={appVersion}
                      onChange={(e) => setAppVersion(e.target.value)}
                      placeholder="e.g., 1.0.0"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Minimum OS Requirement</label>
                    <input
                      type="text"
                      value={appMinOS}
                      onChange={(e) => setAppMinOS(e.target.value)}
                      placeholder="e.g., Android 8.0 (Oreo) or later"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Android Package ID</label>
                  <input
                    type="text"
                    value={appPackageId}
                    onChange={(e) => setAppPackageId(e.target.value)}
                    placeholder="e.g., com.zuzu.mobileapp"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Full Description</label>
                  <textarea
                    rows={4}
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="Describe how the app works, features, and functionality..."
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Release Notes / What&apos;s New</label>
                  <textarea
                    rows={3}
                    value={appChangelog}
                    onChange={(e) => setAppChangelog(e.target.value)}
                    placeholder="Enter changelog (one line per item)&#10;- Initial public release&#10;- Fixed memory footprint"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Visual Assets & Publish Action */}
            <div className="lg:col-span-5 space-y-6">
              {/* App Icon Upload / Preview */}
              <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Application Icon</span>
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-medium">1:1 Square</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img
                      src={iconPreviewUrl}
                      alt="App Icon Preview"
                      className="w-20 h-20 rounded-2xl object-contain border border-neutral-700 shadow-md shrink-0 bg-neutral-950 p-1"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <input
                      ref={iconInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleIconChange}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => iconInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Icon</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIconPreviewUrl('/zuzustore-logo.png');
                          setCustomIconUrlInput('');
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          iconPreviewUrl === '/zuzustore-logo.png'
                            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                            : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                        }`}
                      >
                        Official Zuzu Logo
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Auto-compressed and saved directly in app data so it displays 100% reliably.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Or Enter Image / Logo URL
                  </label>
                  <input
                    type="url"
                    value={customIconUrlInput}
                    onChange={(e) => handleCustomIconUrlChange(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Publisher info card */}
              <div className="p-5 bg-neutral-900/40 border border-neutral-800 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticated Publisher</span>
                </div>
                <div className="text-neutral-300">
                  Published by: <span className="text-white font-medium">{admin.name || 'Store Administrator'}</span>
                </div>
                <div className="text-neutral-400 text-[11px] leading-relaxed">
                  The application will be live on the storefront immediately. Users can download it freely without requiring an account.
                </div>
              </div>

              {/* Publishing Summary & Submit */}
              <div className="p-6 bg-gradient-to-br from-neutral-900 to-indigo-950/40 border border-neutral-800 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">Publish APK to Public Store</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Upon publishing, your app is indexed with 1-click downloads, QR code scanner support, and verified checksums.
                </p>

                {isSubmitting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-300">
                      <span>Publishing to store...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish APK to Store</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: UPDATE EXISTING APP */}
      {activeTab === 'update-existing' && (
        apps.length === 0 ? (
          <div className="p-10 text-center bg-neutral-900/50 border border-neutral-800 rounded-3xl space-y-3">
            <Layers className="w-10 h-10 text-neutral-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Published Applications Yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t published any apps yet. Please use the &quot;Upload New APK&quot; tab to publish your first application before adding new versions.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload-new')}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New APK</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitUpdateRelease} className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-5">
              <h3 className="text-base font-bold text-white">Publish New Version / APK Update</h3>
              <p className="text-xs text-neutral-400">
                Upload an updated APK binary package with release notes for an existing application.
              </p>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Select App to Update</label>
                <select
                  value={selectedExistingAppId || apps[0]?.id}
                  onChange={(e) => setSelectedExistingAppId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name} (Current: v{app.currentVersion})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">New Version *</label>
                  <input
                    type="text"
                    required
                    value={updateVersion}
                    onChange={(e) => setUpdateVersion(e.target.value)}
                    placeholder="e.g., 1.1.0"
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Platform</label>
                  <select
                    value={updatePlatform}
                    onChange={(e) => setUpdatePlatform(e.target.value as Platform)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Android">Android (.apk)</option>
                    <option value="Windows">Windows (.exe)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  New APK Binary
                </label>
                <input
                  ref={updateFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".apk,.aab,.exe,.zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUpdateFile(e.target.files[0]);
                    }
                  }}
                />
                <div
                  onClick={() => updateFileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-neutral-800 hover:border-cyan-500 rounded-xl text-center cursor-pointer bg-neutral-950"
                >
                  {updateFile ? (
                    <div className="text-xs text-emerald-400">
                      <span className="font-semibold">{updateFile.name}</span> ({(updateFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400">
                      Click to select new APK file for this update
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 my-2.5 text-xs text-neutral-500">
                  <div className="flex-1 h-px bg-neutral-800" />
                  <span>OR DIRECT DOWNLOAD LINK</span>
                  <div className="flex-1 h-px bg-neutral-800" />
                </div>

                <div>
                  <input
                    type="url"
                    value={updateDirectUrl}
                    onChange={(e) => setUpdateDirectUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... or GitHub Releases direct link"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Changelog / Release Notes</label>
                <textarea
                  rows={3}
                  required
                  value={updateChangelog}
                  onChange={(e) => setUpdateChangelog(e.target.value)}
                  placeholder="Describe bug fixes and new additions..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-75 cursor-pointer"
              >
                {isSubmitting ? 'Deploying...' : 'Deploy Update'}
              </button>
            </div>
          </form>
        )
      )}

      {/* TAB 3: MANAGE LIVE CATALOG */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Live Store Catalog ({apps.length} {apps.length === 1 ? 'App' : 'Apps'})</h3>
            {apps.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all store apps from catalog?')) {
                    onResetCatalog();
                  }
                }}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-rose-400 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Clear all apps from catalog"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clear Catalog</span>
              </button>
            )}
          </div>

          {apps.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900/40 border border-dashed border-neutral-800 rounded-3xl space-y-3">
              <FolderArchive className="w-10 h-10 text-neutral-500 mx-auto" />
              <h4 className="text-base font-bold text-white">No Live Applications in Catalog</h4>
              <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                Your store is ready for distribution. Upload your first APK package to publish it live for direct public download.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload-new')}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Your First APK</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={app.iconUrl}
                      alt={app.name}
                      className="w-14 h-14 rounded-xl object-contain border border-neutral-800 shrink-0 bg-neutral-950 p-1"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/zuzustore-logo.png';
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{app.name}</h4>
                        {app.isOfficial && (
                          <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-1">{app.tagline}</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                        <span>v{app.currentVersion}</span>
                        <span>•</span>
                        <span>{app.releases.length} releases</span>
                        <span>•</span>
                        <span className="tabular-nums font-mono text-cyan-400 font-medium">
                          {app.downloadsTotal.toLocaleString()} downloads
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                    <button
                      onClick={() => onDownloadTest(app.id, app.releases[0]?.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Download the latest package as a tester"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Test Download</span>
                    </button>

                    <button
                      onClick={() => onViewAppInStore(app)}
                      className="px-3 py-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View in Store</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${app.name}" from the store?`)) {
                          onDeleteApp(app.id);
                        }
                      }}
                      className="p-2 text-neutral-400 hover:text-rose-400 bg-neutral-800/50 hover:bg-rose-950/40 rounded-lg transition-colors border border-neutral-700/50 cursor-pointer"
                      title="Delete app"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
