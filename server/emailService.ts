import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export type EmailEventType =
  | 'sale_buyer'
  | 'sale_developer'
  | 'app_approved'
  | 'app_rejected'
  | 'smtp_test';

export type EmailDeliveryStatus = 'ready_in_app' | 'sent' | 'failed' | 'queued_no_smtp';

export interface EmailLogEntry {
  id: string;
  eventType: EmailEventType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  status: EmailDeliveryStatus;
  errorMessage?: string;
  relatedAppId?: string;
  relatedAppName?: string;
  relatedSaleId?: string;
  messageId?: string;
  attempts: number;
  manualDispatches?: number;
  lastManualDispatchAt?: string;
  createdAt: string;
  lastAttemptAt?: string;
  sentAt?: string;
}

export interface DeveloperNotification {
  id: string;
  developerId: string;
  developerEmail: string;
  eventType: 'sale_developer' | 'app_approved' | 'app_rejected';
  title: string;
  message: string;
  relatedAppId?: string;
  relatedAppName?: string;
  relatedSaleId?: string;
  grossAmount?: number;
  netEarnings?: number;
  currency?: string;
  appUrl?: string;
  rejectionReason?: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

export interface SmtpStatusInfo {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  userMasked: string;
  fromEmail: string;
  fromName: string;
}

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const EMAIL_LOGS_FILE = path.join(DATA_DIR, 'email-logs.json');
const DEV_NOTIFS_FILE = path.join(DATA_DIR, 'developer-notifications.json');

let memoryEmailLogs: EmailLogEntry[] = [];
let memoryDevNotifs: DeveloperNotification[] = [];
let firestoreSyncHandler: ((entry: EmailLogEntry) => Promise<void>) | null = null;
let firestoreDevNotifSyncHandler: ((notif: DeveloperNotification) => Promise<void>) | null = null;

export function registerEmailLogFirestoreSync(handler: (entry: EmailLogEntry) => Promise<void>): void {
  firestoreSyncHandler = handler;
}

export function registerDeveloperNotificationFirestoreSync(
  handler: (notif: DeveloperNotification) => Promise<void>
): void {
  firestoreDevNotifSyncHandler = handler;
}

export function hydrateDeveloperNotificationsFromCloud(cloudNotifs: DeveloperNotification[]): void {
  const existing = getAllDeveloperNotifications();
  const map = new Map<string, DeveloperNotification>();
  for (const item of existing) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of cloudNotifs) {
    if (!item?.id) continue;
    const prev = map.get(item.id);
    if (!prev || (item.read && !prev.read)) {
      map.set(item.id, item);
    }
  }
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  saveDevNotifications(merged.slice(0, 800));
}

function getAllDeveloperNotifications(): DeveloperNotification[] {
  try {
    if (!fs.existsSync(DEV_NOTIFS_FILE)) {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DEV_NOTIFS_FILE, '[]', 'utf-8');
      return memoryDevNotifs;
    }
    const raw = fs.readFileSync(DEV_NOTIFS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryDevNotifs = parsed;
      return parsed;
    }
  } catch (_) {}
  return memoryDevNotifs || [];
}

function saveDevNotifications(notifs: DeveloperNotification[]): void {
  memoryDevNotifs = notifs;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DEV_NOTIFS_FILE, JSON.stringify(notifs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[ZeroApiNotif] Unable to persist developer-notifications.json:', err);
  }
}

export function createDeveloperNotification(
  input: Omit<DeveloperNotification, 'read' | 'createdAt'> & { id?: string; createdAt?: string; read?: boolean }
): DeveloperNotification {
  const all = getAllDeveloperNotifications();
  const existing = input.id ? all.find((n) => n.id === input.id) : undefined;
  if (existing) return existing;

  const entry: DeveloperNotification = {
    ...input,
    id: input.id || `devn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    developerId: String(input.developerId || '').trim(),
    developerEmail: String(input.developerEmail || '').trim().toLowerCase(),
    read: Boolean(input.read),
    createdAt: input.createdAt || new Date().toISOString()
  };

  all.unshift(entry);
  saveDevNotifications(all.slice(0, 800));
  if (firestoreDevNotifSyncHandler) {
    firestoreDevNotifSyncHandler(entry).catch(() => {});
  }
  return entry;
}

export function getDeveloperNotificationsForAccount(developerId: string, developerEmail: string): DeveloperNotification[] {
  const normId = String(developerId || '').trim();
  const normEmail = String(developerEmail || '').trim().toLowerCase();
  return getAllDeveloperNotifications().filter((n) => {
    const matchId = normId && n.developerId === normId;
    const matchEmail = normEmail && n.developerEmail?.toLowerCase() === normEmail;
    return Boolean(matchId || matchEmail);
  });
}

export function markDeveloperNotificationRead(
  notifId: string,
  developerId: string,
  developerEmail: string
): DeveloperNotification | null {
  const all = getAllDeveloperNotifications();
  const normId = String(developerId || '').trim();
  const normEmail = String(developerEmail || '').trim().toLowerCase();
  const idx = all.findIndex(
    (n) => n.id === notifId && ((normId && n.developerId === normId) || (normEmail && n.developerEmail?.toLowerCase() === normEmail))
  );
  if (idx === -1) return null;

  const updated: DeveloperNotification = {
    ...all[idx],
    read: true,
    readAt: all[idx].readAt || new Date().toISOString()
  };
  all[idx] = updated;
  saveDevNotifications(all);
  if (firestoreDevNotifSyncHandler) {
    firestoreDevNotifSyncHandler(updated).catch(() => {});
  }
  return updated;
}

export function markAllDeveloperNotificationsRead(developerId: string, developerEmail: string): number {
  const all = getAllDeveloperNotifications();
  const normId = String(developerId || '').trim();
  const normEmail = String(developerEmail || '').trim().toLowerCase();
  const now = new Date().toISOString();
  let updatedCount = 0;

  const next = all.map((n) => {
    const belongs = (normId && n.developerId === normId) || (normEmail && n.developerEmail?.toLowerCase() === normEmail);
    if (belongs && !n.read) {
      updatedCount += 1;
      const marked = { ...n, read: true, readAt: now };
      if (firestoreDevNotifSyncHandler) {
        firestoreDevNotifSyncHandler(marked).catch(() => {});
      }
      return marked;
    }
    return n;
  });

  if (updatedCount > 0) {
    saveDevNotifications(next);
  }
  return updatedCount;
}

export function hydrateEmailLogsFromCloud(cloudLogs: EmailLogEntry[]): void {
  const existing = getEmailLogs();
  const map = new Map<string, EmailLogEntry>();
  for (const item of existing) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of cloudLogs) {
    if (!item?.id) continue;
    const prev = map.get(item.id);
    if (!prev || (item.attempts || 0) >= (prev.attempts || 0)) {
      map.set(item.id, item);
    }
  }
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  saveEmailLogs(merged.slice(0, 500));
}

export function getEmailLogs(): EmailLogEntry[] {
  try {
    if (!fs.existsSync(EMAIL_LOGS_FILE)) {
      fs.writeFileSync(EMAIL_LOGS_FILE, '[]', 'utf-8');
      return memoryEmailLogs;
    }
    const raw = fs.readFileSync(EMAIL_LOGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryEmailLogs = parsed;
      return parsed;
    }
  } catch (_) {}
  return memoryEmailLogs || [];
}

function saveEmailLogs(logs: EmailLogEntry[]): void {
  memoryEmailLogs = logs;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[EmailService] Unable to persist email-logs.json:', err);
  }
}

function upsertEmailLog(entry: EmailLogEntry): EmailLogEntry {
  const logs = getEmailLogs();
  const idx = logs.findIndex((l) => l.id === entry.id);
  if (idx !== -1) {
    logs[idx] = entry;
  } else {
    logs.unshift(entry);
  }
  saveEmailLogs(logs.slice(0, 500));
  if (firestoreSyncHandler) {
    firestoreSyncHandler(entry).catch(() => {});
  }
  return entry;
}

export function markEmailLogManuallyDispatched(logId: string): EmailLogEntry | null {
  const logs = getEmailLogs();
  const entry = logs.find((l) => l.id === logId);
  if (!entry) return null;

  const updated: EmailLogEntry = {
    ...entry,
    manualDispatches: (entry.manualDispatches || 0) + 1,
    lastManualDispatchAt: new Date().toISOString()
  };
  return upsertEmailLog(updated);
}

function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return !trimmed || trimmed.startsWith('MY_') || trimmed === 'undefined' || trimmed === 'null';
}

function getSmtpConfig() {
  const user = !isPlaceholder(process.env.SMTP_USER) ? process.env.SMTP_USER!.trim() : '';
  const pass = !isPlaceholder(process.env.SMTP_PASS) ? process.env.SMTP_PASS!.trim() : '';
  const explicitHost = !isPlaceholder(process.env.SMTP_HOST) ? process.env.SMTP_HOST!.trim() : '';
  const host = explicitHost || (user.toLowerCase().endsWith('@gmail.com') ? 'smtp.gmail.com' : '');
  const port = Number(process.env.SMTP_PORT || 465) || 465;
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
      : port === 465;
  const fromEmail = !isPlaceholder(process.env.SMTP_FROM_EMAIL)
    ? process.env.SMTP_FROM_EMAIL!.trim()
    : user || 'notifications@protectortechnologies.com';
  const fromName = !isPlaceholder(process.env.SMTP_FROM_NAME)
    ? process.env.SMTP_FROM_NAME!.trim()
    : 'ZuzuStore by Protector Technologies';

  const configured = Boolean(host && user && pass);
  return { configured, host, port, secure, user, pass, fromEmail, fromName };
}

function maskEmailOrUser(input: string): string {
  if (!input) return 'Not configured';
  const parts = input.split('@');
  if (parts.length !== 2) {
    return input.length > 4 ? `${input.slice(0, 2)}***${input.slice(-2)}` : '***';
  }
  const [name, domain] = parts;
  const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name[0] || '*'}***`;
  return `${maskedName}@${domain}`;
}

export function getSmtpStatusInfo(): SmtpStatusInfo {
  const cfg = getSmtpConfig();
  return {
    configured: cfg.configured,
    host: cfg.host || 'Not configured',
    port: cfg.port,
    secure: cfg.secure,
    userMasked: maskEmailOrUser(cfg.user),
    fromEmail: cfg.fromEmail,
    fromName: cfg.fromName
  };
}

function createTransporter() {
  const cfg = getSmtpConfig();
  if (!cfg.configured) return null;

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000
  });
}

export function getPublicAppBaseUrl(overrideOrigin?: string): string {
  if (overrideOrigin && /^https?:\/\//i.test(overrideOrigin)) {
    return overrideOrigin.replace(/\/+$/, '');
  }
  const envUrl = !isPlaceholder(process.env.APP_URL) ? process.env.APP_URL!.trim() : '';
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://ais-pre-mcvpifgrbayrpgfswtklfi-460717176468.europe-west3.run.app';
}

function escapeHtml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toEmailSlug(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildAppPublicUrl(appItem: any, baseUrl: string): string {
  const baseSlug = toEmailSlug(appItem?.slug || appItem?.name || appItem?.id || 'app') || 'app';
  return `${baseUrl}/app/${encodeURIComponent(`${baseSlug}--${appItem.id}`)}`;
}

function wrapBrandedEmailHtml({
  badgeLabel,
  badgeBg,
  badgeText,
  headline,
  subtitle,
  bodyHtml,
  ctaUrl,
  ctaLabel,
  secondaryUrl,
  secondaryLabel
}: {
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  headline: string;
  subtitle: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  secondaryUrl?: string;
  secondaryLabel?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e4e4e7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090b;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#18181b;border:1px solid #27272a;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #27272a;background:linear-gradient(135deg,#18181b 0%,#27180c 100%);">
              <div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#f59e0b;margin-bottom:10px;">
                ZuzuStore &bull; Protector Technologies
              </div>
              <span style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;background-color:${badgeBg};color:${badgeText};margin-bottom:12px;">
                ${escapeHtml(badgeLabel)}
              </span>
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#ffffff;">
                ${escapeHtml(headline)}
              </h1>
              <p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#a1a1aa;">
                ${escapeHtml(subtitle)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;font-size:14px;line-height:1.6;color:#d4d4d8;">
              ${bodyHtml}
              ${
                ctaUrl && ctaLabel
                  ? `<div style="margin-top:24px;text-align:center;">
                      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 26px;background-color:#f59e0b;color:#09090b;font-size:14px;font-weight:800;text-decoration:none;border-radius:10px;">
                        ${escapeHtml(ctaLabel)}
                      </a>
                    </div>`
                  : ''
              }
              ${
                secondaryUrl && secondaryLabel
                  ? `<div style="margin-top:14px;text-align:center;">
                      <a href="${escapeHtml(secondaryUrl)}" style="color:#38bdf8;font-size:13px;font-weight:600;text-decoration:underline;">
                        ${escapeHtml(secondaryLabel)}
                      </a>
                    </div>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #27272a;background-color:#121215;font-size:12px;line-height:1.5;color:#71717a;">
              <div style="font-weight:600;color:#a1a1aa;">Protector Technologies &mdash; Official ZuzuStore Distribution</div>
              <div>Automated transactional notice. Do not share your private download token link publicly.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function dispatchEmail({
  id,
  eventType,
  recipientEmail,
  recipientName,
  subject,
  htmlBody,
  textBody,
  relatedAppId,
  relatedAppName,
  relatedSaleId
}: {
  id?: string;
  eventType: EmailEventType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  relatedAppId?: string;
  relatedAppName?: string;
  relatedSaleId?: string;
}): Promise<EmailLogEntry> {
  const cleanRecipient = String(recipientEmail || '').trim();
  const entryId = id || `mail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Idempotency guard: avoid sending the exact same deterministic event email twice once already sent
  if (id) {
    const existing = getEmailLogs().find((l) => l.id === id);
    if (existing && existing.status === 'sent') {
      return existing;
    }
  }

  const now = new Date().toISOString();
  const baseEntry: EmailLogEntry = {
    id: entryId,
    eventType,
    recipientEmail: cleanRecipient,
    recipientName,
    subject,
    htmlBody,
    textBody,
    status: 'ready_in_app',
    relatedAppId,
    relatedAppName,
    relatedSaleId,
    attempts: 1,
    manualDispatches: 0,
    createdAt: now,
    lastAttemptAt: now
  };

  if (!cleanRecipient || !cleanRecipient.includes('@')) {
    return upsertEmailLog({
      ...baseEntry,
      status: 'failed',
      errorMessage: 'Recipient email address is missing or invalid.'
    });
  }

  const cfg = getSmtpConfig();
  const transporter = createTransporter();

  // Zero-API mode by default: immediately recorded as Delivered In-App & Ready for Mailto/.EML
  if (!cfg.configured || !transporter) {
    return upsertEmailLog({
      ...baseEntry,
      status: 'ready_in_app',
      errorMessage: undefined
    });
  }

  try {
    const info = await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: recipientName ? `"${recipientName}" <${cleanRecipient}>` : cleanRecipient,
      subject,
      text: textBody,
      html: htmlBody
    });

    return upsertEmailLog({
      ...baseEntry,
      status: 'sent',
      errorMessage: undefined,
      messageId: info.messageId,
      sentAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error(`[EmailService] Failed sending "${eventType}" to ${cleanRecipient}:`, err?.message || err);
    return upsertEmailLog({
      ...baseEntry,
      status: 'failed',
      errorMessage: err?.message || 'SMTP transport failed to deliver email.'
    });
  }
}

export async function resendEmailLogById(logId: string): Promise<EmailLogEntry | null> {
  const logs = getEmailLogs();
  const entry = logs.find((l) => l.id === logId);
  if (!entry) return null;

  const now = new Date().toISOString();
  const nextAttempts = (entry.attempts || 0) + 1;
  const cfg = getSmtpConfig();
  const transporter = createTransporter();

  if (!cfg.configured || !transporter) {
    return upsertEmailLog({
      ...entry,
      status: 'ready_in_app',
      attempts: nextAttempts,
      lastAttemptAt: now,
      errorMessage: undefined
    });
  }

  try {
    const info = await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: entry.recipientName ? `"${entry.recipientName}" <${entry.recipientEmail}>` : entry.recipientEmail,
      subject: entry.subject,
      text: entry.textBody || entry.subject,
      html: entry.htmlBody
    });

    return upsertEmailLog({
      ...entry,
      status: 'sent',
      errorMessage: undefined,
      messageId: info.messageId,
      attempts: nextAttempts,
      lastAttemptAt: now,
      sentAt: new Date().toISOString()
    });
  } catch (err: any) {
    return upsertEmailLog({
      ...entry,
      status: 'failed',
      errorMessage: err?.message || 'SMTP resend failed.',
      attempts: nextAttempts,
      lastAttemptAt: now
    });
  }
}

export async function verifyAndOptionallySendTestEmail(testRecipientEmail?: string): Promise<{
  verified: boolean;
  smtpStatus: SmtpStatusInfo;
  message: string;
  log?: EmailLogEntry;
}> {
  const smtpStatus = getSmtpStatusInfo();
  const transporter = createTransporter();

  if (!smtpStatus.configured || !transporter) {
    return {
      verified: false,
      smtpStatus,
      message:
        'SMTP credentials are not set yet. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS on the server.'
    };
  }

  try {
    await transporter.verify();
  } catch (err: any) {
    return {
      verified: false,
      smtpStatus,
      message: `SMTP connection verification failed: ${err?.message || 'Unable to connect to mail server.'}`
    };
  }

  if (testRecipientEmail && testRecipientEmail.includes('@')) {
    const htmlBody = wrapBrandedEmailHtml({
      badgeLabel: 'SMTP Diagnostic Test',
      badgeBg: '#064e3b',
      badgeText: '#6ee7b7',
      headline: 'ZuzuStore Mail Server Connected',
      subtitle: 'Your transactional SMTP configuration is active and delivering emails properly.',
      bodyHtml: `
        <p style="margin:0 0 12px;">This test confirms that <strong>ZuzuStore by Protector Technologies</strong> can send live notifications over SMTP for:</p>
        <ul style="margin:0;padding-left:18px;color:#d4d4d8;">
          <li>Buyer APK purchase confirmation receipts &amp; download access links</li>
          <li>Developer instant sale &amp; net earnings alerts</li>
          <li>Developer app approval &amp; submission review updates</li>
        </ul>
      `,
      ctaUrl: getPublicAppBaseUrl(),
      ctaLabel: 'Open ZuzuStore'
    });

    const log = await dispatchEmail({
      eventType: 'smtp_test',
      recipientEmail: testRecipientEmail.trim(),
      recipientName: 'Super Admin',
      subject: 'ZuzuStore SMTP Verification Successful',
      htmlBody,
      textBody: 'ZuzuStore SMTP Verification Successful. Automated buyer & developer email alerts are active.'
    });

    return {
      verified: log.status === 'sent',
      smtpStatus,
      message:
        log.status === 'sent'
          ? `SMTP verified and test email sent to ${testRecipientEmail.trim()}.`
          : `SMTP verified handshake, but test send reported: ${log.errorMessage}`,
      log
    };
  }

  return {
    verified: true,
    smtpStatus,
    message: `SMTP server verified (${smtpStatus.host}:${smtpStatus.port}).`
  };
}

/**
 * Send both the Buyer Payment Receipt (+ download link) and Developer Sale Alert for a confirmed sale.
 */
export async function sendCompletedSaleEmails({
  sale,
  appItem,
  developerName,
  developerEmail,
  walletBalance,
  baseUrlOverride
}: {
  sale: {
    id: string;
    appId: string;
    appName: string;
    developerId?: string;
    customerName: string;
    customerEmail: string;
    grossAmount: number;
    adminCommissionPercent: number;
    adminCommissionAmount: number;
    developerNetAmount: number;
    currency: string;
    paymentMethod: string;
    livepayReference?: string;
    downloadToken?: string;
    completedAt?: string;
    createdAt: string;
  };
  appItem?: any;
  developerName?: string;
  developerEmail: string;
  walletBalance?: number;
  baseUrlOverride?: string;
}): Promise<{ buyerLog: EmailLogEntry; developerLog: EmailLogEntry }> {
  const baseUrl = getPublicAppBaseUrl(baseUrlOverride);
  const appSlugUrl = appItem ? buildAppPublicUrl(appItem, baseUrl) : baseUrl;
  const directDownloadUrl = sale.downloadToken
    ? `${baseUrl}/api/apps/${encodeURIComponent(sale.appId)}/download?token=${encodeURIComponent(sale.downloadToken)}`
    : appSlugUrl;
  const receiptUrl = sale.downloadToken
    ? `${baseUrl}/receipt/${encodeURIComponent(sale.id)}?token=${encodeURIComponent(sale.downloadToken)}`
    : `${baseUrl}/receipt/${encodeURIComponent(sale.id)}`;
  const txDate = new Date(sale.completedAt || sale.createdAt || Date.now()).toUTCString();
  const formattedGross = `${Number(sale.grossAmount || 0).toLocaleString()} ${sale.currency || 'UGX'}`;
  const formattedFee = `${Number(sale.adminCommissionAmount || 0).toLocaleString()} ${sale.currency || 'UGX'}`;
  const formattedNet = `${Number(sale.developerNetAmount || 0).toLocaleString()} ${sale.currency || 'UGX'}`;

  // 1. Buyer Payment Receipt & Download Access
  const buyerHtml = wrapBrandedEmailHtml({
    badgeLabel: 'Payment Confirmed',
    badgeBg: '#064e3b',
    badgeText: '#6ee7b7',
    headline: `Your ${sale.appName} APK is ready to download`,
    subtitle: `Hi ${sale.customerName || 'Customer'}, your payment has been verified and your download link is unlocked.`,
    bodyHtml: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:12px;padding:16px;">
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Application</td><td align="right" style="padding:5px 0;color:#ffffff;font-weight:700;font-size:13px;">${escapeHtml(sale.appName)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Amount Paid</td><td align="right" style="padding:5px 0;color:#f59e0b;font-weight:800;font-size:13px;">${escapeHtml(formattedGross)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Payment Method</td><td align="right" style="padding:5px 0;color:#e4e4e7;font-size:13px;">${escapeHtml(sale.paymentMethod)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Receipt Reference</td><td align="right" style="padding:5px 0;color:#e4e4e7;font-family:monospace;font-size:12px;">${escapeHtml(sale.livepayReference || sale.id)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Confirmed Date</td><td align="right" style="padding:5px 0;color:#a1a1aa;font-size:12px;">${escapeHtml(txDate)}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;">
        Download your verified APK immediately or open your permanent Official Receipt anytime.
      </p>
    `,
    ctaUrl: directDownloadUrl,
    ctaLabel: 'Download APK Now',
    secondaryUrl: receiptUrl,
    secondaryLabel: 'Open Official ZuzuStore Receipt'
  });

  const buyerText = [
    `ZuzuStore by Protector Technologies — Payment Confirmed`,
    `Hi ${sale.customerName || 'Customer'},`,
    `Your payment of ${formattedGross} for ${sale.appName} is confirmed.`,
    `Receipt Ref: ${sale.livepayReference || sale.id}`,
    `Official Receipt: ${receiptUrl}`,
    `Start Download: ${directDownloadUrl}`,
    `App Page: ${appSlugUrl}`
  ].join('\n');

  const buyerLog = await dispatchEmail({
    id: `sale_${sale.id}_buyer`,
    eventType: 'sale_buyer',
    recipientEmail: sale.customerEmail,
    recipientName: sale.customerName,
    subject: `Payment Confirmed: Download ${sale.appName} (${formattedGross}) — ZuzuStore`,
    htmlBody: buyerHtml,
    textBody: buyerText,
    relatedAppId: sale.appId,
    relatedAppName: sale.appName,
    relatedSaleId: sale.id
  });

  // 2. Developer Sale & Earnings Alert
  const devWalletFormatted =
    walletBalance !== undefined
      ? `${Number(walletBalance).toLocaleString()} ${sale.currency || 'UGX'}`
      : formattedNet;

  const resolvedDevId = sale.developerId || appItem?.submittedBy?.id || developerEmail;
  createDeveloperNotification({
    id: `notif_sale_${sale.id}`,
    developerId: resolvedDevId,
    developerEmail,
    eventType: 'sale_developer',
    title: `New Sale: +${formattedNet} from ${sale.appName}`,
    message: `${sale.customerName || 'A customer'} completed payment of ${formattedGross}. Your wallet was credited +${formattedNet} (${sale.adminCommissionPercent}% fee applied).`,
    relatedAppId: sale.appId,
    relatedAppName: sale.appName,
    relatedSaleId: sale.id,
    grossAmount: sale.grossAmount,
    netEarnings: sale.developerNetAmount,
    currency: sale.currency || 'UGX',
    appUrl: appSlugUrl
  });

  const devHtml = wrapBrandedEmailHtml({
    badgeLabel: 'New Paid App Sale',
    badgeBg: '#451a03',
    badgeText: '#fcd34d',
    headline: `You earned ${formattedNet} from ${sale.appName}`,
    subtitle: `Hi ${developerName || 'Developer'}, a customer completed Mobile Money payment for your APK.`,
    bodyHtml: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:12px;padding:16px;">
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">App Sold</td><td align="right" style="padding:5px 0;color:#ffffff;font-weight:700;font-size:13px;">${escapeHtml(sale.appName)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Buyer</td><td align="right" style="padding:5px 0;color:#e4e4e7;font-size:13px;">${escapeHtml(sale.customerName || 'Customer')}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Gross Sale Price</td><td align="right" style="padding:5px 0;color:#e4e4e7;font-size:13px;">${escapeHtml(formattedGross)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Platform Commission (${sale.adminCommissionPercent}%)</td><td align="right" style="padding:5px 0;color:#f87171;font-size:13px;">-${escapeHtml(formattedFee)}</td></tr>
        <tr><td style="padding:8px 0 4px;color:#ffffff;font-weight:700;font-size:14px;border-top:1px solid #27272a;">Net Credited to Wallet</td><td align="right" style="padding:8px 0 4px;color:#34d399;font-weight:800;font-size:14px;border-top:1px solid #27272a;">+${escapeHtml(formattedNet)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Available Wallet Balance</td><td align="right" style="padding:5px 0;color:#fcd34d;font-weight:700;font-size:13px;">${escapeHtml(devWalletFormatted)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Sale Reference</td><td align="right" style="padding:5px 0;color:#a1a1aa;font-family:monospace;font-size:12px;">${escapeHtml(sale.livepayReference || sale.id)}</td></tr>
      </table>
    `,
    ctaUrl: appSlugUrl,
    ctaLabel: `View ${sale.appName} Listing`,
    secondaryUrl: baseUrl,
    secondaryLabel: 'Open Developer Console & Wallet on ZuzuStore'
  });

  const devText = [
    `ZuzuStore Developer Alert — New Sale Confirmed`,
    `Hi ${developerName || 'Developer'},`,
    `Someone just purchased ${sale.appName} for ${formattedGross}.`,
    `Net earnings credited to your wallet: +${formattedNet} (after ${sale.adminCommissionPercent}% platform fee).`,
    `Available wallet balance: ${devWalletFormatted}.`,
    `App link: ${appSlugUrl}`
  ].join('\n');

  const developerLog = await dispatchEmail({
    id: `sale_${sale.id}_developer`,
    eventType: 'sale_developer',
    recipientEmail: developerEmail,
    recipientName: developerName || 'Developer',
    subject: `New Sale (+${formattedNet}): ${sale.appName} Purchased — ZuzuStore`,
    htmlBody: devHtml,
    textBody: devText,
    relatedAppId: sale.appId,
    relatedAppName: sale.appName,
    relatedSaleId: sale.id
  });

  return { buyerLog, developerLog };
}

/**
 * Send developer notification (In-App Inbox + Dispatch Log) when their submitted APK is approved and live on ZuzuStore.
 */
export async function sendAppApprovedEmail({
  appItem,
  developerEmail,
  developerName,
  baseUrlOverride
}: {
  appItem: any;
  developerEmail: string;
  developerName?: string;
  baseUrlOverride?: string;
}): Promise<EmailLogEntry> {
  const baseUrl = getPublicAppBaseUrl(baseUrlOverride);
  const liveAppUrl = buildAppPublicUrl(appItem, baseUrl);
  const isPaid = appItem?.pricing?.type === 'paid' && Number(appItem?.pricing?.price || 0) > 0;
  const priceText = isPaid
    ? `${Number(appItem.pricing.price).toLocaleString()} ${appItem.pricing.currency || 'UGX'}`
    : 'Free APK';

  const resolvedDevId = appItem?.submittedBy?.id || developerEmail;
  createDeveloperNotification({
    id: `notif_approval_${appItem.id}_${Date.now()}`,
    developerId: resolvedDevId,
    developerEmail,
    eventType: 'app_approved',
    title: `Approved & Live: "${appItem.name}" is published`,
    message: `Your submission v${appItem.currentVersion || '1.0.0'} (${priceText}) passed Protector Technologies review and is now live for users to download or purchase.`,
    relatedAppId: appItem.id,
    relatedAppName: appItem.name,
    appUrl: liveAppUrl
  });

  const htmlBody = wrapBrandedEmailHtml({
    badgeLabel: 'App Approved & Live',
    badgeBg: '#064e3b',
    badgeText: '#6ee7b7',
    headline: `"${appItem.name}" is now live on ZuzuStore!`,
    subtitle: `Congratulations ${developerName || 'Developer'}, your APK passed Protector Technologies review and is published for users.`,
    bodyHtml: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090b;border:1px solid #27272a;border-radius:12px;padding:16px;">
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Application</td><td align="right" style="padding:5px 0;color:#ffffff;font-weight:700;font-size:13px;">${escapeHtml(appItem.name)}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Version Published</td><td align="right" style="padding:5px 0;color:#e4e4e7;font-family:monospace;font-size:13px;">v${escapeHtml(appItem.currentVersion || '1.0.0')}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Category</td><td align="right" style="padding:5px 0;color:#e4e4e7;font-size:13px;">${escapeHtml(appItem.category || 'Apps')}</td></tr>
        <tr><td style="padding:5px 0;color:#a1a1aa;font-size:13px;">Pricing</td><td align="right" style="padding:5px 0;color:#f59e0b;font-weight:700;font-size:13px;">${escapeHtml(priceText)}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#d4d4d8;">
        Share your direct app link with users so they can open and ${isPaid ? 'buy/download' : 'download'} your APK immediately:
      </p>
      <p style="margin:8px 0 0;font-size:12px;font-family:monospace;color:#38bdf8;word-break:break-all;">
        ${escapeHtml(liveAppUrl)}
      </p>
    `,
    ctaUrl: liveAppUrl,
    ctaLabel: 'Open Live App Page',
    secondaryUrl: baseUrl,
    secondaryLabel: 'Manage App in Developer Console'
  });

  const textBody = [
    `Congratulations ${developerName || 'Developer'}!`,
    `Your application "${appItem.name}" (v${appItem.currentVersion || '1.0.0'}) has been approved and is now live on ZuzuStore.`,
    `Direct Share Link: ${liveAppUrl}`
  ].join('\n');

  return dispatchEmail({
    id: `approval_${appItem.id}_${Date.now()}`,
    eventType: 'app_approved',
    recipientEmail: developerEmail,
    recipientName: developerName || 'Developer',
    subject: `Approved & Published: "${appItem.name}" is now live on ZuzuStore!`,
    htmlBody,
    textBody,
    relatedAppId: appItem.id,
    relatedAppName: appItem.name
  });
}

/**
 * Send developer notification (In-App Inbox + Dispatch Log) when an app submission is rejected.
 */
export async function sendAppRejectedEmail({
  appItem,
  developerEmail,
  developerName,
  reason,
  baseUrlOverride
}: {
  appItem: any;
  developerEmail: string;
  developerName?: string;
  reason: string;
  baseUrlOverride?: string;
}): Promise<EmailLogEntry> {
  const baseUrl = getPublicAppBaseUrl(baseUrlOverride);
  const cleanReason = String(reason || 'Does not meet store security or content guidelines.').trim();

  const resolvedDevId = appItem?.submittedBy?.id || developerEmail;
  createDeveloperNotification({
    id: `notif_rejection_${appItem.id}_${Date.now()}`,
    developerId: resolvedDevId,
    developerEmail,
    eventType: 'app_rejected',
    title: `Review Update: "${appItem.name}" needs changes`,
    message: `Your submission v${appItem.currentVersion || '1.0.0'} was returned by review: ${cleanReason}`,
    relatedAppId: appItem.id,
    relatedAppName: appItem.name,
    rejectionReason: cleanReason
  });

  const htmlBody = wrapBrandedEmailHtml({
    badgeLabel: 'Submission Needs Updates',
    badgeBg: '#4c0519',
    badgeText: '#fda4af',
    headline: `Action required for "${appItem.name}"`,
    subtitle: `Hi ${developerName || 'Developer'}, our review team requested changes before "${appItem.name}" can be published.`,
    bodyHtml: `
      <div style="background-color:#1c1917;border:1px solid #7f1d1d;border-radius:12px;padding:16px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#fda4af;margin-bottom:6px;">
          Reviewer Feedback
        </div>
        <div style="font-size:14px;color:#ffffff;line-height:1.5;">
          ${escapeHtml(cleanReason)}
        </div>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#d4d4d8;">
        Please update your APK build or metadata in the Developer Console and resubmit for review.
      </p>
    `,
    ctaUrl: baseUrl,
    ctaLabel: 'Open ZuzuStore Developer Console'
  });

  const textBody = [
    `Hi ${developerName || 'Developer'},`,
    `Your submission "${appItem.name}" (v${appItem.currentVersion || '1.0.0'}) requires updates before publication.`,
    `Reviewer Feedback: ${cleanReason}`,
    `Sign in to your Developer Console at ${baseUrl} to update and resubmit.`
  ].join('\n');

  return dispatchEmail({
    id: `rejection_${appItem.id}_${Date.now()}`,
    eventType: 'app_rejected',
    recipientEmail: developerEmail,
    recipientName: developerName || 'Developer',
    subject: `Submission Review Update: "${appItem.name}" requires changes — ZuzuStore`,
    htmlBody,
    textBody,
    relatedAppId: appItem.id,
    relatedAppName: appItem.name
  });
}
