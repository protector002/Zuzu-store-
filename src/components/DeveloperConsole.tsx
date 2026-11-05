import React, { useState, useEffect } from 'react';
import {
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlusCircle,
  Trash2,
  ExternalLink,
  Layers,
  ArrowLeft,
  Smartphone,
  Tv,
  Image as ImageIcon,
  FileCode,
  ShieldCheck,
  LogOut,
  Send
} from 'lucide-react';
import { DeveloperUser, StoreApp } from '../types';
import { submitDeveloperApp, fetchDeveloperMyApps, deleteDeveloperApp, developerLogout } from '../services/api';

interface DeveloperConsoleProps {
  developer: DeveloperUser;
  onLogout: () => void;
  onBackToStore: () => void;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({
  developer,
  onLogout,
  onBackToStore,
}) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'my-apps'>('submit');
  const [myApps, setMyApps] = useState<StoreApp[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [briefInfo, setBriefInfo] = useState('');
  const [description, setDescription] = useState('');
  const [appEdition, setAppEdition] = useState<'phone' | 'tv'>('phone');
  const [category, setCategory] = useState('Streaming');
  const [version, setVersion] = useState('1.0.0');
  const [packageId, setPackageId] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconUrlFallback, setIconUrlFallback] = useState('');
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [directDownloadUrl, setDirectDownloadUrl] = useState('');
  const [minOS, setMinOS] = useState('Android 8.0+');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Load developer apps
  const loadMyApps = async () => {
    setIsLoadingApps(true);
    try {
      const apps = await fetchDeveloperMyApps();
      setMyApps(apps);
    } catch (e) {
      console.warn('Failed to fetch developer apps:', e);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    loadMyApps();
  }, []);

  // Icon file handler
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  // Screenshots file handler
  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setScreenshotFiles((prev) => [...prev, ...files]);
      const newPreviews = files.map((f) => URL.createObjectURL(f));
      setScreenshotPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  // APK file handler
  const handleApkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setApkFile(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!name.trim()) {
      setSubmitError('Application name is required.');
      return;
    }

    if (!briefInfo.trim()) {
      setSubmitError('Please add a brief description of the application.');
      return;
    }

    if (!apkFile && !directDownloadUrl.trim()) {
      setSubmitError('Please upload an APK file or provide a direct download link (e.g. Google Drive / cloud link).');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('tagline', briefInfo.trim());
      formData.append('description', description.trim() || briefInfo.trim());
      formData.append('appEdition', appEdition);
      formData.append('platform', appEdition === 'tv' ? 'Android TV' : 'Android');
      formData.append('category', category);
      formData.append('version', version.trim() || '1.0.0');
      formData.append('minOS', minOS.trim() || 'Android 8.0+');

      const resolvedPkg = packageId.trim() || `com.${developer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      formData.append('packageId', resolvedPkg);

      if (apkFile) {
        formData.append('apkFile', apkFile);
      }
      if (directDownloadUrl.trim()) {
        formData.append('directDownloadUrl', directDownloadUrl.trim());
      }
      if (iconFile) {
        formData.append('iconFile', iconFile);
      }
      if (iconUrlFallback.trim()) {
        formData.append('iconUrlFallback', iconUrlFallback.trim());
      }

      screenshotFiles.forEach((file) => {
        formData.append('screenshotFiles', file);
      });

      const res = await submitDeveloperApp(formData);

      setSubmitSuccess(res.message || 'Application submitted successfully! It is now waiting for Super Admin review.');
      
      // Reset form
      setName('');
      setBriefInfo('');
      setDescription('');
      setPackageId('');
      setVersion('1.0.0');
      setApkFile(null);
      setDirectDownloadUrl('');
      setIconFile(null);
      setIconPreview(null);
      setIconUrlFallback('');
      setScreenshotFiles([]);
      setScreenshotPreviews([]);

      // Reload developer's apps list & switch tab
      await loadMyApps();
      setTimeout(() => {
        setActiveTab('my-apps');
        setSubmitSuccess(null);
      }, 2000);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit application. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (appId: string, appName: string) => {
    if (!window.confirm(`Are you sure you want to withdraw the submission for "${appName}"?`)) {
      return;
    }

    try {
      await deleteDeveloperApp(appId);
      await loadMyApps();
    } catch (e) {
      alert('Could not withdraw application. Please try again.');
    }
  };

  const handleLogout = () => {
    developerLogout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Store</span>
            </button>
            <div className="h-4 w-px bg-neutral-800" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-neutral-950 font-black text-xs shadow-md">
                DEV
              </div>
              <div>
                <h1 className="text-sm font-black text-white leading-none">Developer Console</h1>
                <p className="text-[11px] text-amber-400 font-medium mt-0.5">
                  {developer.name} {developer.companyName ? `• ${developer.companyName}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs text-neutral-400 font-mono bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
              {developer.email}
            </span>
            <button
              onClick={handleLogout}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'submit'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publish New App</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('my-apps');
                loadMyApps();
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'my-apps'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>My Submissions</span>
              {myApps.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-neutral-800 text-neutral-200 text-[10px] rounded-full">
                  {myApps.length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-amber-300/80 bg-amber-950/30 border border-amber-800/40 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Super Admin (John) reviews all submissions</span>
          </div>
        </div>

        {/* TAB 1: SUBMIT NEW APP */}
        {activeTab === 'submit' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-black text-white tracking-tight">Submit Your Android / TV Application</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Upload your APK, icon, screenshots, and brief app information. The Super Admin will review and verify your app before making it live to all store visitors.
              </p>
            </div>

            {submitSuccess && (
              <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs animate-fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-200">Submission Successful!</h4>
                  <p className="mt-0.5 leading-relaxed">{submitSuccess}</p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-rose-950/40 border border-rose-800 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-2">
                  1. Application Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Application Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. AnimeWave HD"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Target Edition <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAppEdition('phone')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          appEdition === 'phone'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Phone / Tablet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppEdition('tv')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          appEdition === 'tv'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Tv className="w-4 h-4" />
                        <span>Smart TV Edition</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Brief Information / Tagline <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={briefInfo}
                    onChange={(e) => setBriefInfo(e.target.value)}
                    placeholder="Short 1-sentence summary of what this app does"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    This brief information is displayed on app preview cards across the store.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Detailed Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write a clear overview of features, streaming capabilities, or interface details..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
                    >
                      <option value="Streaming">Streaming</option>
                      <option value="Anime">Anime</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Media Player">Media Player</option>
                      <option value="Tools">Tools</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Version</label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="1.0.0"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Package ID (Optional)</label>
                    <input
                      type="text"
                      value={packageId}
                      onChange={(e) => setPackageId(e.target.value)}
                      placeholder="com.example.app"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Media Assets (Icon & Screenshots) */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-2">
                  2. Visual Assets (Icon & Screenshots)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* App Icon */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Application Icon
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-neutral-950 border-2 border-dashed border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                        {iconPreview ? (
                          <img src={iconPreview} alt="Icon preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-neutral-600" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Choose Icon File</span>
                          <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
                        </label>
                        <input
                          type="text"
                          value={iconUrlFallback}
                          onChange={(e) => setIconUrlFallback(e.target.value)}
                          placeholder="Or paste image URL"
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg py-1.5 px-3 text-[11px] text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Screenshots */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Screenshots
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors mb-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Screenshot Images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleScreenshotsChange}
                        className="hidden"
                      />
                    </label>

                    {screenshotPreviews.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 mt-1">
                        {screenshotPreviews.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Preview ${i}`}
                            className="w-14 h-24 object-cover rounded-lg border border-neutral-800 shrink-0"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: APK Delivery */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-2">
                  3. APK Delivery (File Upload or Direct Download Link)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="block text-xs font-semibold text-white">
                      Option A: Upload APK File
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-xl cursor-pointer transition-colors text-center">
                      <FileCode className="w-8 h-8 text-neutral-500 mb-2" />
                      <span className="text-xs font-bold text-neutral-200">
                        {apkFile ? apkFile.name : 'Select .apk File'}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1">
                        {apkFile ? `${(apkFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Supports up to 2GB package sizes'}
                      </span>
                      <input type="file" accept=".apk" onChange={handleApkChange} className="hidden" />
                    </label>
                  </div>

                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <label className="block text-xs font-semibold text-white">
                      Option B: Direct Download / Cloud Link
                    </label>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Google Drive share link (set to "Anyone with the link"), Dropbox, or GitHub releases.
                    </p>
                    <input
                      type="url"
                      value={directDownloadUrl}
                      onChange={(e) => setDirectDownloadUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-neutral-400">
                  By submitting, you confirm this application complies with copyright and safe distribution rules.
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto py-3 px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Submitting for Review...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit for Super Admin Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MY SUBMISSIONS */}
        {activeTab === 'my-apps' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Your Submitted Applications</h2>
                <p className="text-xs text-neutral-400">Track the review and approval status of your apps</p>
              </div>
              <button
                onClick={loadMyApps}
                className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300"
              >
                Refresh
              </button>
            </div>

            {isLoadingApps ? (
              <div className="py-20 text-center">
                <span className="inline-block w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-neutral-400 mt-3">Loading your submissions...</p>
              </div>
            ) : myApps.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No applications submitted yet</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Submit your first Android or TV application to be reviewed by the Super Admin and published on Zuzu Store.
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="mt-2 py-2 px-5 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit an App</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myApps.map((app) => {
                  const status = app.approvalStatus || 'approved';
                  const release = app.releases?.[0];

                  return (
                    <div
                      key={app.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={app.iconUrl || '/zuzustore-logo.png'}
                            alt={app.name}
                            className="w-14 h-14 rounded-2xl object-cover bg-neutral-950 border border-neutral-800 p-0.5"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/zuzustore-logo.png';
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-white">{app.name}</h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-950 text-neutral-300 border border-neutral-800">
                                v{app.currentVersion}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {app.appEdition === 'tv' ? 'TV Edition' : 'Phone'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{app.tagline}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                              Package: {app.packageId} • Category: {app.category}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {status === 'pending_approval' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>Pending Review</span>
                            </span>
                          )}
                          {status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Live on Store</span>
                            </span>
                          )}
                          {status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Requires Changes</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rejection / Feedback Note if rejected */}
                      {status === 'rejected' && app.rejectionReason && (
                        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-200">Super Admin Feedback:</span>{' '}
                            {app.rejectionReason}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                        <div className="flex items-center gap-4">
                          <span>Downloads: <strong className="text-white">{app.downloadsTotal || 0}</strong></span>
                          <span>Rating: <strong className="text-amber-400">{app.rating > 0 ? `★ ${app.rating}` : 'New'}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          {status === 'approved' && (
                            <a
                              href={`/#app-${app.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                onBackToStore();
                              }}
                              className="py-1 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View in Store</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(app.id, app.name)}
                            className="py-1 px-3 bg-neutral-950 hover:bg-rose-950/50 hover:text-rose-400 text-neutral-400 border border-neutral-800 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Withdraw</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
