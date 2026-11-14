import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { DeveloperNotification } from '../types';

interface DeveloperNotificationsTabProps {
  notifications: DeveloperNotification[];
  unreadCount: number;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  browserAlertPermission: NotificationPermission | 'unsupported';
  onEnableBrowserAlerts: () => Promise<void>;
}

export const DeveloperNotificationsTab: React.FC<DeveloperNotificationsTabProps> = ({
  notifications,
  unreadCount,
  loading,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
  browserAlertPermission,
  onEnableBrowserAlerts
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'sale_developer' | 'reviews'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const visibleNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.read;
    if (filter === 'sale_developer') return item.eventType === 'sale_developer';
    if (filter === 'reviews') return item.eventType === 'app_approved' || item.eventType === 'app_rejected';
    return true;
  });

  const handleSingleRead = async (id: string) => {
    setBusyId(id);
    try {
      await onMarkRead(id);
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkRead = async () => {
    setIsMarkingAll(true);
    try {
      await onMarkAllRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Developer Notifications Inbox</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-mono tabular-nums font-bold text-amber-400">
                ({unreadCount} unread)
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400">
            Instant alerts delivered directly inside ZuzuStore when your APKs sell, get approved, or need submission fixes—no external email API needed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {browserAlertPermission === 'default' && (
            <button
              type="button"
              onClick={onEnableBrowserAlerts}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Enable Browser Alerts</span>
            </button>
          )}
          {browserAlertPermission === 'granted' && (
            <span className="px-3 py-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Browser Alerts Active</span>
            </span>
          )}
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={isMarkingAll}
              onClick={handleBulkRead}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isMarkingAll ? 'Marking...' : 'Mark All Read'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          {
            id: 'sale_developer',
            label: `Sales (${notifications.filter((n) => n.eventType === 'sale_developer').length})`
          },
          {
            id: 'reviews',
            label: `App Reviews (${notifications.filter((n) => n.eventType !== 'sale_developer').length})`
          }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              filter === tab.id
                ? 'bg-neutral-800 border-amber-500/50 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-20 rounded-xl bg-neutral-950 border border-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : visibleNotifications.length === 0 ? (
        <div className="p-10 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
          <Bell className="w-8 h-8 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No notifications in this view</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Whenever a user pays for your APK or an admin approves or reviews one of your submissions, the alert appears right here immediately.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map((item) => {
            const isSale = item.eventType === 'sale_developer';
            const isApproved = item.eventType === 'app_approved';
            const isRejected = item.eventType === 'app_rejected';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-colors ${
                  item.read
                    ? 'bg-neutral-950/70 border-neutral-800/80'
                    : 'bg-neutral-950 border-amber-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSale
                          ? 'bg-amber-950/50 border-amber-700/60 text-amber-400'
                          : isApproved
                          ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-400'
                          : 'bg-rose-950/50 border-rose-700/60 text-rose-400'
                      }`}
                    >
                      {isSale ? (
                        <DollarSign className="w-4 h-4" />
                      ) : isApproved ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                        <span
                          className={`font-semibold ${
                            isSale ? 'text-amber-300' : isApproved ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {isSale ? 'Sale Alert' : isApproved ? 'App Approved' : 'Submission Update'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                        {!item.read && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-400 font-bold">Unread</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                      <p className="text-xs text-neutral-300 leading-relaxed">{item.message}</p>

                      {isSale && item.netEarnings !== undefined && (
                        <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums text-neutral-400">
                          <span>
                            Gross:{' '}
                            <strong className="text-white">
                              {Number(item.grossAmount || 0).toLocaleString()} {item.currency || 'UGX'}
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Credited Net:{' '}
                            <strong className="text-emerald-400">
                              +{Number(item.netEarnings || 0).toLocaleString()} {item.currency || 'UGX'}
                            </strong>
                          </span>
                        </div>
                      )}

                      {isRejected && item.rejectionReason && (
                        <div className="mt-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-200">
                          <span className="font-semibold text-rose-300">Feedback: </span>
                          {item.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                    {item.appUrl && (
                      <a
                        href={item.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>View App</span>
                      </a>
                    )}

                    {!item.read && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleSingleRead(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white inline-flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{busyId === item.id ? 'Saving...' : 'Mark Read'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
