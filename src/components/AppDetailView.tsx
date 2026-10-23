import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  QrCode,
  ShieldCheck,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  MessageSquarePlus,
  HelpCircle,
  Copy,
  Terminal,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { StoreApp, AppRelease, Platform, AdminUser } from '../types';

interface AppDetailViewProps {
  app: StoreApp;
  admin?: AdminUser | null;
  onBack: () => void;
  onDownloadRelease: (appId: string, releaseId?: string) => Promise<void>;
  onOpenQR: (app: StoreApp, release?: AppRelease) => void;
  onOpenGuide: (platform: Platform) => void;
  onAddReview: (appId: string, review: { author: string; rating: number; platform: string; title: string; comment: string }) => Promise<void>;
  onPreviewScreenshot: (index: number) => void;
  onDeleteRelease?: (releaseId: string) => Promise<any>;
  onDeleteApp?: () => Promise<void>;
}

export const AppDetailView: React.FC<AppDetailViewProps> = ({
  app,
  admin,
  onBack,
  onDownloadRelease,
  onOpenQR,
  onOpenGuide,
  onAddReview,
  onPreviewScreenshot,
  onDeleteRelease,
  onDeleteApp,
}) => {
  const [downloadingRelId, setDownloadingRelId] = useState<string | null>(null);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  // Deletion modal states
  const [releaseToDelete, setReleaseToDelete] = useState<AppRelease | null>(null);
  const [isDeletingRelease, setIsDeletingRelease] = useState(false);
  const [showDeleteAppModal, setShowDeleteAppModal] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  const handleConfirmDeleteRelease = async () => {
    if (!releaseToDelete || !onDeleteRelease) return;
    setIsDeletingRelease(true);
    try {
      await onDeleteRelease(releaseToDelete.id);
      setReleaseToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingRelease(false);
    }
  };

  const handleConfirmDeleteApp = async () => {
    if (!onDeleteApp) return;
    setIsDeletingApp(true);
    try {
      await onDeleteApp();
      setShowDeleteAppModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingApp(false);
    }
  };

  // Review form state
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const primaryRelease = app.releases[0];
  const gdMatch = primaryRelease?.directDownloadUrl?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || primaryRelease?.directDownloadUrl?.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const gdWebUrl = gdMatch ? `https://drive.google.com/file/d/${gdMatch[1]}/view?usp=sharing` : null;

  const handleDownload = async (rel?: AppRelease) => {
    const id = rel?.id || primaryRelease?.id;
    if (!id) return;
    setDownloadingRelId(id);
    try {
      await onDownloadRelease(app.id, id);
    } finally {
      setTimeout(() => setDownloadingRelId(null), 2500);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewComment.trim()) return;
    setIsSubmittingReview(true);

    try {
      await onAddReview(app.id, {
        author: reviewAuthor.trim(),
        rating: reviewRating,
        platform: 'Android',
        title: reviewTitle.trim() || 'Verified User Review',
        comment: reviewComment.trim(),
      });
      setReviewAuthor('');
      setReviewTitle('');
      setReviewComment('');
      setReviewSubmitted(true);
      setShowReviewForm(false);
      setTimeout(() => setReviewSubmitted(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const copyChecksum = (checksum: string) => {
    navigator.clipboard.writeText(checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div className="py-8 max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Apps</span>
        </button>
      </div>

      {/* Main App Hero Box */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <img
            src={app.iconUrl || '/zuzustore-logo.png'}
            alt={app.name}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-contain border border-neutral-800 shadow-xl shrink-0 bg-neutral-950 p-1"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/zuzustore-logo.png';
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mb-1">
              <span className="text-cyan-400 font-semibold">{app.category}</span>
              <span>•</span>
              <span>By {app.developer.name}</span>
              {app.isOfficial && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Official Release
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {app.name}
            </h1>
            <p className="text-sm sm:text-base text-neutral-300 mt-1 leading-relaxed">
              {app.tagline}
            </p>

            {/* Unboxed Metadata Strip */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-800/80">
              <span className="font-mono font-semibold text-white">v{app.currentVersion}</span>
              <span>•</span>
              <span>{primaryRelease?.fileSize || '34 MB'}</span>
              <span>•</span>
              <span className="tabular-nums font-mono text-cyan-300 font-semibold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{app.downloadsTotal.toLocaleString()} People Downloaded</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{app.rating.toFixed(1)}</span>
                <span className="text-neutral-500 font-normal">({app.ratingCount} reviews)</span>
              </span>
            </div>

            {/* Download CTA Bar - 100% public, anyone can click! */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={() => handleDownload(primaryRelease)}
                disabled={downloadingRelId === primaryRelease?.id}
                className="px-6 py-3.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:scale-95 rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                {downloadingRelId === primaryRelease?.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Streaming Package...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download APK ({primaryRelease?.fileSize || '34 MB'})</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onOpenQR(app, primaryRelease)}
                className="px-4 py-3.5 text-xs sm:text-sm font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors flex items-center gap-2"
                title="Scan QR code on mobile device"
              >
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Scan for Phone</span>
              </button>

              {gdWebUrl && (
                <a
                  href={gdWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3.5 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors flex items-center gap-2"
                  title="Open file directly in Google Drive"
                >
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                  <span>Drive Mirror</span>
                </a>
              )}

              {/* Community Downloads Metric Pill */}
              <div
                className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-medium"
                title="Total confirmed downloads for this application"
              >
                <Download className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong className="text-white font-mono font-bold tabular-nums">
                    {app.downloadsTotal.toLocaleString()}
                  </strong>{' '}
                  people downloaded
                </span>
              </div>

              <button
                onClick={() => onOpenGuide('Android')}
                className="text-xs text-neutral-300 hover:text-cyan-400 underline underline-offset-4 flex items-center gap-1 py-2 px-1"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>APK Installation Help</span>
              </button>

              {admin && onDeleteApp && (
                <button
                  type="button"
                  onClick={() => setShowDeleteAppModal(true)}
                  className="px-3.5 py-3 text-xs font-semibold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                  title="Permanently delete this entire application from the website"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete App</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screenshots Section */}
      {app.screenshots.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">App Previews & Screenshots</h2>
              <span className="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full font-medium">
                {app.screenshots.length} {app.screenshots.length === 1 ? 'screenshot' : 'screenshots'}
              </span>
            </div>
            <span className="text-xs text-neutral-400 hidden sm:inline">Click any screenshot to view full screen</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {app.screenshots.map((shot, idx) => (
              <button
                key={idx}
                onClick={() => onPreviewScreenshot(idx)}
                className="group relative rounded-2xl overflow-hidden border border-neutral-800 hover:border-cyan-500/60 bg-neutral-900 aspect-[16/10] transition-all shadow-md cursor-pointer text-left"
              >
                <img
                  src={shot || '/zuzustore-logo.png'}
                  alt={`Screenshot ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/zuzustore-logo.png';
                  }}
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <span className="absolute bottom-2 left-2 text-[10px] bg-black/80 backdrop-blur-sm text-neutral-200 px-2 py-0.5 rounded font-medium border border-neutral-700/60">
                  {idx === 0 ? 'Cover' : `Screen ${idx + 1}`}
                </span>
                <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-sm text-cyan-300 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  Enlarge
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Description & Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-3">About this Application</h2>
            <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line space-y-3">
              {app.description}
            </div>
          </div>

          {/* Key Features */}
          {app.features.length > 0 && (
            <div className="pt-4 border-t border-neutral-800/80">
              <h3 className="text-base font-bold text-white mb-3">Key Highlights</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {app.features.map((feat, idx) => (
                  <div key={idx} className="p-4 bg-neutral-900/40 border border-neutral-800/80 rounded-xl">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{feat.title}</span>
                    </h4>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{feat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Release Notes / Version History */}
          <div className="pt-4 border-t border-neutral-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Version History & Changelogs</span>
              </h3>
              {app.releases.length > 1 && (
                <button
                  onClick={() => setShowAllVersions(!showAllVersions)}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>{showAllVersions ? 'Show latest only' : `View all (${app.releases.length})`}</span>
                  {showAllVersions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {(showAllVersions ? app.releases : app.releases.slice(0, 1)).map((rel) => (
                <div key={rel.id} className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">v{rel.version}</span>
                      {rel.isLatest && (
                        <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                          Latest Release
                        </span>
                      )}
                      <span className="text-neutral-600">•</span>
                      <span className="text-xs text-neutral-400">{rel.platform}</span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-xs text-neutral-400">{rel.fileSize}</span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-xs text-cyan-400 font-mono flex items-center gap-1">
                        <Download className="w-3 h-3 text-cyan-400" />
                        <span>{(rel.downloadCount || 0).toLocaleString()} dl</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDownload(rel)}
                        disabled={downloadingRelId === rel.id}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Download {rel.fileName}</span>
                      </button>

                      {admin && onDeleteRelease && (
                        <button
                          type="button"
                          onClick={() => setReleaseToDelete(rel)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-rose-950/40 border border-neutral-800 hover:border-rose-800/60 rounded-lg transition-colors cursor-pointer"
                          title={`Permanently delete version ${rel.version}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="text-neutral-500">Released: {rel.releaseDate}</span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400 font-mono">
                      {(rel.downloadCount || 0).toLocaleString()} users downloaded this release
                    </span>
                  </div>

                  <ul className="space-y-1 text-xs text-neutral-300">
                    {rel.changelog.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 shrink-0 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>

                  {rel.sha256Checksum && (
                    <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
                      <span>SHA256: {rel.sha256Checksum.substring(0, 18)}...</span>
                      <button
                        onClick={() => copyChecksum(rel.sha256Checksum)}
                        className="text-neutral-400 hover:text-white"
                        title="Copy complete checksum"
                      >
                        {copiedChecksum ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Technical Specifications */}
        <div className="space-y-6">
          <div className="p-5 bg-neutral-900/50 border border-neutral-800 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Technical Package Info</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-neutral-500 block text-[11px]">Android Package ID</span>
                <span className="font-mono text-cyan-300">{app.packageId}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Architecture</span>
                <span className="text-neutral-200">{app.architecture}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Minimum Android Version</span>
                <span className="text-neutral-200">{app.minRequirements.Android || 'Android 8.0+'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Developer Contact</span>
                <span className="text-neutral-200">{app.developer.email}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800/80">
              <span className="text-neutral-500 block text-[11px] mb-2 font-medium">Declared Permissions</span>
              <ul className="space-y-1.5 text-xs text-neutral-400">
                {app.permissions.map((p, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full shrink-0" />
                    <span className="truncate">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Community Ratings & Reviews */}
      <div className="pt-6 border-t border-neutral-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Community Reviews</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Verified feedback from users who downloaded and installed the APK
            </p>
          </div>

          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <MessageSquarePlus className="w-4 h-4 text-cyan-400" />
            <span>Write a Review</span>
          </button>
        </div>

        {reviewSubmitted && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Thank you! Your review has been saved to the store.</span>
          </div>
        )}

        {/* Review Form Drawer */}
        {showReviewForm && (
          <form onSubmit={handleReviewSubmit} className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Leave Feedback for {app.name}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={reviewAuthor}
                  onChange={(e) => setReviewAuthor(e.target.value)}
                  placeholder="e.g., Alex Reed"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Rating</label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= reviewRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-neutral-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-neutral-400 ml-2 font-medium">{reviewRating} of 5</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Review Headline</label>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="e.g., Flawless installation on Android 14"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Review Comments *</label>
              <textarea
                required
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience installing and using this APK..."
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg disabled:opacity-50"
              >
                {isSubmittingReview ? 'Submitting...' : 'Post Review'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Reviews List */}
        <div className="space-y-3.5">
          {app.reviews.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">No reviews yet. Be the first to share your thoughts!</p>
          ) : (
            app.reviews.map((rev) => (
              <div key={rev.id} className="p-4 bg-neutral-900/40 border border-neutral-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800/50 text-cyan-300 font-bold text-xs flex items-center justify-center">
                      {rev.avatarInitials}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white">{rev.author}</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                        <span>{rev.platform}</span>
                        <span>•</span>
                        <span>{rev.version}</span>
                        <span>•</span>
                        <span>{rev.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? 'fill-amber-400' : 'text-neutral-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs font-semibold text-neutral-200">{rev.title}</p>
                <p className="text-xs text-neutral-400 leading-relaxed">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* In-App Delete App Confirmation Modal */}
      {showDeleteAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Application</h3>
                <p className="text-xs text-neutral-400">Permanent removal from website and cloud database</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80">
              Are you sure you want to permanently delete <strong className="text-white font-semibold">"{app.name}"</strong>?
              This application and all its versions will be permanently removed from the website and will <strong className="text-rose-300">never appear again</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingApp}
                onClick={() => setShowDeleteAppModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingApp}
                onClick={handleConfirmDeleteApp}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingApp ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete App</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Version/Release Confirmation Modal */}
      {releaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Version Release</h3>
                <p className="text-xs text-neutral-400">{app.name}</p>
              </div>
            </div>

            <div className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-1.5">
              <p>
                Are you sure you want to permanently delete version <strong className="text-white font-mono font-semibold">v{releaseToDelete.version}</strong> ({releaseToDelete.fileName})?
              </p>
              <p className="text-[11px] text-neutral-400">
                This specific version package will be permanently purged and will <strong className="text-rose-300">never appear again on the website</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingRelease}
                onClick={() => setReleaseToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRelease}
                onClick={handleConfirmDeleteRelease}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingRelease ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting Version...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Version</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
