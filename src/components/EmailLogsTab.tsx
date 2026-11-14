import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Send,
  Eye,
  X,
  Server,
  ShieldCheck,
  FileDown,
  ExternalLink
} from 'lucide-react';
import { EmailLogEntry, SmtpStatusInfo } from '../types';
import {
  fetchAdminEmailLogs,
  recordAdminManualDispatch,
  resendAdminEmailLog,
  verifyOrTestAdminSmtp
} from '../services/api';

interface EmailLogsTabProps {
  adminEmail?: string;
}

const EVENT_LABELS: Record<string, { label: string; style: string }> = {
  sale_buyer: {
    label: 'Buyer Receipt',
    style: 'text-emerald-300'
  },
  sale_developer: {
    label: 'Developer Sale',
    style: 'text-amber-300'
  },
  app_approved: {
    label: 'App Approved',
    style: 'text-cyan-300'
  },
  app_rejected: {
    label: 'App Rejected',
    style: 'text-rose-300'
  },
  smtp_test: {
    label: 'SMTP Test',
    style: 'text-neutral-300'
  }
};

function buildMailtoHref(entry: EmailLogEntry): string {
  const recipient = encodeURIComponent(entry.recipientEmail || '');
  const subject = encodeURIComponent(entry.subject || 'ZuzuStore Notification');
  // Keep body concise so browsers & OS mailers never truncate long URIs
  const rawBody = (entry.textBody || entry.subject || '').slice(0, 1400);
  const body = encodeURIComponent(rawBody);
  return `mailto:${recipient}?subject=${subject}&body=${body}`;
}

function buildAndDownloadEml(entry: EmailLogEntry): void {
  const boundary = `----=_ZuzuStore_${entry.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const dateHeader = new Date(entry.createdAt || Date.now()).toUTCString();
  const safeSubject = String(entry.subject || 'ZuzuStore Notification').replace(/[\r\n]+/g, ' ');
  const safeTo = entry.recipientName
    ? `"${entry.recipientName.replace(/"/g, '')}" <${entry.recipientEmail}>`
    : entry.recipientEmail;
  const plainText = entry.textBody || safeSubject;
  const htmlText = entry.htmlBody || `<p>${plainText}</p>`;

  const emlLines = [
    `From: "ZuzuStore by Protector Technologies" <notifications@protectortechnologies.com>`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    `Date: ${dateHeader}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    plainText,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    htmlText,
    ``,
    `--${boundary}--`
  ];

  const blob = new Blob([emlLines.join('\r\n')], { type: 'message/rfc822;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const slugPart = (entry.relatedAppName || entry.eventType || 'notification')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  anchor.href = url;
  anchor.download = `zuzustore-${slugPart || 'dispatch'}-${entry.id}.eml`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const EmailLogsTab: React.FC<EmailLogsTabProps> = ({ adminEmail }) => {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    deliveredInApp: 0,
    sent: 0,
    failed: 0,
    queuedNoSmtp: 0,
    manualDispatches: 0
  });
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered_in_app' | 'sent' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<EmailLogEntry | null>(null);
  const [testEmailInput, setTestEmailInput] = useState(adminEmail || '');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadEmailLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminEmailLogs();
      setLogs(res.logs || []);
      setSummary({
        total: res.summary?.total || 0,
        deliveredInApp: res.summary?.deliveredInApp || 0,
        sent: res.summary?.sent || 0,
        failed: res.summary?.failed || 0,
        queuedNoSmtp: res.summary?.queuedNoSmtp || 0,
        manualDispatches: res.summary?.manualDispatches || 0
      });
      setSmtpStatus(res.smtpStatus || null);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Unable to load dispatch logs.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmailLogs();
  }, []);

  const handleOpenMailApp = async (entry: EmailLogEntry) => {
    const href = buildMailtoHref(entry);
    window.location.href = href;
    try {
      const res = await recordAdminManualDispatch(entry.id);
      setFeedback({
        type: 'success',
        text: `Opened your mail app pre-filled for ${entry.recipientEmail}.`
      });
      if (previewEntry?.id === entry.id) {
        setPreviewEntry(res.log);
      }
      await loadEmailLogs();
    } catch (_) {}
  };

  const handleDownloadEml = async (entry: EmailLogEntry) => {
    buildAndDownloadEml(entry);
    try {
      const res = await recordAdminManualDispatch(entry.id);
      setFeedback({
        type: 'success',
        text: `Downloaded formatted .EML email file for ${entry.recipientEmail}.`
      });
      if (previewEntry?.id === entry.id) {
        setPreviewEntry(res.log);
      }
      await loadEmailLogs();
    } catch (_) {}
  };

  const handleResend = async (logId: string) => {
    setResendingId(logId);
    setFeedback(null);
    try {
      const res = await resendAdminEmailLog(logId);
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
      await loadEmailLogs();
      if (previewEntry?.id === logId && res.log) {
        setPreviewEntry(res.log);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Dispatch action failed.' });
    } finally {
      setResendingId(null);
    }
  };

  const handleVerifySmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingSmtp(true);
    setFeedback(null);
    try {
      const res = await verifyOrTestAdminSmtp(testEmailInput.trim() || undefined);
      setSmtpStatus(res.smtpStatus);
      setFeedback({
        type: res.verified ? 'success' : 'error',
        text: res.message
      });
      await loadEmailLogs();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'SMTP check failed.' });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const visibleLogs = logs.filter((entry) => {
    if (statusFilter === 'delivered_in_app') {
      if (entry.status !== 'ready_in_app' && entry.status !== 'queued_no_smtp') return false;
    } else if (statusFilter !== 'all' && entry.status !== statusFilter) {
      return false;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.recipientEmail?.toLowerCase().includes(q) ||
      entry.recipientName?.toLowerCase().includes(q) ||
      entry.subject?.toLowerCase().includes(q) ||
      entry.relatedAppName?.toLowerCase().includes(q) ||
      entry.relatedSaleId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Zero-API Notification Engine Header */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl border bg-emerald-950/60 border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">Zero-API Notification &amp; Dispatch Engine</h2>
                <span className="text-xs font-semibold text-emerald-400">
                  · Active (No External APIs Required)
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Developer alerts deliver automatically to each developer&apos;s Console Inbox, and buyers unlock Official Receipts immediately on checkout. Use <strong className="text-neutral-200">Mail App</strong> or <strong className="text-neutral-200">Download .EML</strong> below anytime to forward from your own email client.
              </p>
            </div>
          </div>

          {/* Optional SMTP Test (only relevant if server env vars happen to be added) */}
          {smtpStatus?.configured && (
            <form onSubmit={handleVerifySmtp} className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
              <input
                type="email"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                placeholder="Optional SMTP test email..."
                className="w-full sm:w-48 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-xs text-white placeholder-neutral-500 outline-none"
              />
              <button
                type="submit"
                disabled={isTestingSmtp}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {isTestingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Test Optional SMTP</span>
              </button>
            </form>
          )}
        </div>

        {/* Summary Counters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-800/80">
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] text-neutral-400 font-medium">Total Dispatches</div>
            <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">{summary.total}</div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] text-emerald-400 font-medium">In-App &amp; Receipts Active</div>
            <div className="text-xl font-bold text-emerald-300 font-mono tabular-nums mt-0.5">
              {summary.deliveredInApp + summary.sent}
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] text-amber-400 font-medium">Manual Mailto / .EML Sent</div>
            <div className="text-xl font-bold text-amber-300 font-mono tabular-nums mt-0.5">
              {summary.manualDispatches}
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] text-neutral-400 font-medium">Optional SMTP Delivery</div>
            <div className="text-xl font-bold text-neutral-200 font-mono tabular-nums mt-0.5">
              {smtpStatus?.configured ? summary.sent : 'Off (Zero-API)'}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `All (${summary.total})` },
            { id: 'delivered_in_app', label: `In-App Ready (${summary.deliveredInApp})` },
            { id: 'sent', label: `SMTP Sent (${summary.sent})` },
            { id: 'failed', label: `Errors (${summary.failed})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-neutral-800 border-amber-500/50 text-white'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipient, app, subject..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-amber-400 text-xs text-white placeholder-neutral-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={loadEmailLogs}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh dispatch logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dispatch Logs Table */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-11 rounded-lg bg-neutral-950 border border-neutral-800/70 animate-pulse" />
            ))}
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-2.5">
            <Mail className="w-8 h-8 text-neutral-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No notifications recorded yet</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Buyer receipts, developer sale alerts, and approval/rejection notices appear here automatically with 1-click Mail App and .EML export.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950/70 text-[11px] uppercase tracking-wider text-neutral-400">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Event</th>
                  <th className="py-3 px-4 font-semibold">Recipient</th>
                  <th className="py-3 px-4 font-semibold">Subject · App</th>
                  <th className="py-3 px-4 font-semibold">Delivery</th>
                  <th className="py-3 px-4 font-semibold text-right">Zero-API Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {visibleLogs.map((entry) => {
                  const eventMeta = EVENT_LABELS[entry.eventType] || EVENT_LABELS.smtp_test;
                  const isBusy = resendingId === entry.id;
                  const isInApp = entry.status === 'ready_in_app' || entry.status === 'queued_no_smtp';

                  return (
                    <tr key={entry.id} className="hover:bg-neutral-950/50 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-[11px] text-neutral-400 whitespace-nowrap">
                        {new Date(entry.sentAt || entry.lastAttemptAt || entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-semibold text-xs ${eventMeta.style}`}>
                          {eventMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white font-medium truncate max-w-[190px]">{entry.recipientEmail}</div>
                        {entry.recipientName && (
                          <div className="text-[11px] text-neutral-500 truncate max-w-[190px]">{entry.recipientName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-neutral-200 font-medium line-clamp-1 max-w-xs">{entry.subject}</div>
                        {entry.relatedAppName && (
                          <div className="text-[11px] text-neutral-500">App: {entry.relatedAppName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>SMTP Sent</span>
                          </span>
                        ) : isInApp ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>In-App Active</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-rose-400 font-semibold"
                            title={entry.errorMessage || 'Delivery failed'}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Failed</span>
                          </span>
                        )}
                        {(entry.manualDispatches || 0) > 0 && (
                          <span className="ml-2 text-[11px] font-mono tabular-nums text-amber-400">
                            · {entry.manualDispatches} manual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenMailApp(entry)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            title="Open pre-filled email in Gmail / Apple Mail / Outlook"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Mail App</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadEml(entry)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            title="Download RFC-5322 .EML with full HTML design"
                          >
                            <FileDown className="w-3 h-3 text-emerald-400" />
                            <span>.EML</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewEntry(entry)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Eye className="w-3 h-3 text-amber-400" />
                            <span>Preview</span>
                          </button>
                          {smtpStatus?.configured && (
                            <button
                              type="button"
                              onClick={() => handleResend(entry.id)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              <RefreshCw className={`w-3 h-3 ${isBusy ? 'animate-spin' : ''}`} />
                              <span>SMTP</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rendered Notification Preview Modal */}
      {previewEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Formatted Receipt &amp; Notification Preview</span>
                </div>
                <h3 className="text-sm font-bold text-white truncate mt-0.5">{previewEntry.subject}</h3>
                <p className="text-[11px] text-neutral-400 truncate">
                  To: {previewEntry.recipientName ? `${previewEntry.recipientName} <${previewEntry.recipientEmail}>` : previewEntry.recipientEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-neutral-950 overflow-auto p-3">
              <iframe
                title={`Dispatch Preview ${previewEntry.id}`}
                srcDoc={previewEntry.htmlBody}
                sandbox=""
                className="w-full h-[440px] rounded-xl border border-neutral-800 bg-neutral-950"
              />
            </div>

            <div className="px-5 py-3.5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-500 font-mono tabular-nums">
                Log ID: {previewEntry.id} · Manual Dispatches: {previewEntry.manualDispatches || 0}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadEml(previewEntry)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-100 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download .EML</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenMailApp(previewEntry)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Send via Mail App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
