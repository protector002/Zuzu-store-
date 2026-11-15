import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  BarChart3,
  Download,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  MonitorSmartphone,
  Layers
} from 'lucide-react';
import { AnalyticsDashboardData, StoreApp } from '../types';
import { fetchAdminAnalytics } from '../services/api';

interface AnalyticsDashboardTabProps {
  apps: StoreApp[];
}

type WindowDays = 7 | 14 | 30;
type TrendChartMode = 'area' | 'bar';

function formatNumber(n: number): string {
  return Number(n || 0).toLocaleString('en-US');
}

function getPlatformBarColor(platform: string): string {
  const p = String(platform || '').toLowerCase();
  if (p.includes('tv') || p.includes('fire')) return '#f59e0b';
  if (p.includes('windows') || p.includes('mac')) return '#6366f1';
  if (p.includes('ios')) return '#10b981';
  return '#06b6d4';
}

function exportAnalyticsCsv(data: AnalyticsDashboardData): void {
  const rows: string[] = [];
  rows.push('Section,Label,Metric 1,Metric 2,Metric 3,Metric 4');

  for (const pt of data.dailyTrends) {
    rows.push(
      `Daily Trend,"${pt.date}",Downloads=${pt.downloads},Visits=${pt.visits},PaidOrders=${pt.paidOrders},`
    );
  }

  for (const ver of data.topVersions) {
    rows.push(
      `Top Version,"${ver.appName.replace(/"/g, '""')}",Version=${ver.version},Platform=${ver.platform},Downloads=${ver.downloads},Share=${ver.sharePercent}%`
    );
  }

  for (const dev of data.deviceDistribution) {
    rows.push(
      `Visitor Device,"${dev.device}",Count=${dev.count},Share=${dev.sharePercent}%,,`
    );
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `zuzustore-analytics-${data.days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const DailyTrendTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; payload?: { date?: string; label?: string; paidOrders?: number } }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  const dlEntry = payload.find((p) => p.dataKey === 'downloads');
  const visitEntry = payload.find((p) => p.dataKey === 'visits');

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 shadow-xl text-xs space-y-1.5">
      <div className="font-semibold text-neutral-100 border-b border-neutral-800 pb-1">
        {row?.label} <span className="text-neutral-500 font-mono font-normal">({row?.date})</span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-cyan-400">APK Downloads</span>
        <span className="font-mono tabular-nums font-semibold text-white">
          {formatNumber(Number(dlEntry?.value || 0))}
        </span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-amber-400">Visitor Sessions</span>
        <span className="font-mono tabular-nums font-semibold text-white">
          {formatNumber(Number(visitEntry?.value || 0))}
        </span>
      </div>
      {typeof row?.paidOrders === 'number' && row.paidOrders > 0 && (
        <div className="flex items-center justify-between gap-5">
          <span className="text-emerald-400">Paid Orders</span>
          <span className="font-mono tabular-nums font-semibold text-white">
            {formatNumber(row.paidOrders)}
          </span>
        </div>
      )}
    </div>
  );
};

const VersionBarTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{
    payload?: {
      appName: string;
      version: string;
      platform: string;
      fileSize: string;
      downloads: number;
      sharePercent: number;
      releaseDate: string;
    };
  }>;
}> = ({ active, payload }) => {
  if (!active || !payload || !payload[0]?.payload) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 shadow-xl text-xs space-y-1.5 max-w-[260px]">
      <div className="font-semibold text-white truncate">
        {item.appName} <span className="text-cyan-400 font-mono">{item.version}</span>
      </div>
      <div className="text-[11px] text-neutral-400">
        {item.platform} · {item.fileSize} · {item.releaseDate}
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-neutral-800">
        <span className="text-neutral-300">Downloads</span>
        <span className="font-mono tabular-nums font-semibold text-white">
          {formatNumber(item.downloads)} ({item.sharePercent}%)
        </span>
      </div>
    </div>
  );
};

const DevicePieTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{
    payload?: {
      device: string;
      count: number;
      sharePercent: number;
      color: string;
    };
  }>;
}> = ({ active, payload }) => {
  if (!active || !payload || !payload[0]?.payload) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 shadow-xl text-xs space-y-1">
      <div className="font-semibold text-white">{item.device}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-neutral-400">Share</span>
        <span className="font-mono tabular-nums font-semibold text-white">
          {item.sharePercent}% ({formatNumber(item.count)})
        </span>
      </div>
    </div>
  );
};

export const AnalyticsDashboardTab: React.FC<AnalyticsDashboardTabProps> = ({ apps }) => {
  const [days, setDays] = useState<WindowDays>(30);
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [trendMode, setTrendMode] = useState<TrendChartMode>('area');
  const [analytics, setAnalytics] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeviceIndex, setActiveDeviceIndex] = useState<number | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await fetchAdminAnalytics(days, selectedAppId);
      setAnalytics(report);
    } catch (err: any) {
      setError(err?.message || 'Unable to load store analytics right now.');
    } finally {
      setLoading(false);
    }
  }, [days, selectedAppId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const totalDeviceEntries = analytics
    ? analytics.deviceDistribution.reduce((sum, d) => sum + d.count, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2>Store Analytics &amp; Telemetry</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Last {days} days
            <span aria-hidden="true"> · </span>
            {selectedAppId === 'all'
              ? `All ${apps.length} catalog apps`
              : analytics?.appOptions.find((o) => o.id === selectedAppId)?.name || 'Filtered app'}
            <span aria-hidden="true"> · </span>
            {analytics?.deviceDataSource === 'live_telemetry'
              ? 'Live visitor & download telemetry'
              : 'Catalog platform telemetry'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Window Segmented Switch */}
          <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
            {([7, 14, 30] as WindowDays[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setDays(w)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  days === w
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {w} Days
              </button>
            ))}
          </div>

          {/* App Scope Filter */}
          <select
            aria-label="Filter analytics by app"
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 max-w-[210px] truncate cursor-pointer"
          >
            <option value="all">All Store Apps ({apps.length})</option>
            {(analytics?.appOptions || apps.map((a) => ({ id: a.id, name: a.name }))).map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            disabled={!analytics}
            onClick={() => analytics && exportAnalyticsCsv(analytics)}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl flex items-center justify-between gap-4 text-xs text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800/70 text-white rounded-lg font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading && !analytics ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="h-28 bg-neutral-900 border border-neutral-800 rounded-xl p-5" />
            ))}
          </div>
          <div className="h-80 bg-neutral-900 border border-neutral-800 rounded-xl p-5" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-neutral-900 border border-neutral-800 rounded-xl p-5" />
            <div className="h-96 bg-neutral-900 border border-neutral-800 rounded-xl p-5" />
          </div>
        </div>
      ) : analytics ? (
        <>
          {/* 4-Column KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-neutral-400">Total APK Downloads</span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-white font-mono tabular-nums">
                  {formatNumber(analytics.summary.totalAllTimeDownloads)}
                </span>
                <span className="text-xs text-cyan-400 font-mono tabular-nums">
                  +{formatNumber(analytics.summary.windowDownloads)} ({days}d)
                </span>
              </div>
              <span className="mt-2 text-xs text-neutral-500">
                Across {formatNumber(analytics.summary.activeAppsCount)} active store listings
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-neutral-400">Tracked Visitor Sessions</span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-white font-mono tabular-nums">
                  {formatNumber(analytics.summary.windowVisits)}
                </span>
                <span className="text-xs text-amber-400 font-mono tabular-nums">
                  {days}-day window
                </span>
              </div>
              <span className="mt-2 text-xs text-neutral-500">
                {analytics.summary.paidOrdersWindow > 0
                  ? `${formatNumber(analytics.summary.paidOrdersWindow)} completed paid orders in window`
                  : 'Unique storefront & TV hub sessions'}
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-neutral-400">Top App Version</span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold text-white truncate" title={analytics.summary.topVersionLabel}>
                  {analytics.summary.topVersionLabel}
                </span>
              </div>
              <span className="mt-2 text-xs text-neutral-400 font-mono tabular-nums">
                {formatNumber(analytics.summary.topVersionDownloads)} downloads · {analytics.summary.trackedVersionsCount} releases
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-neutral-400">Leading Visitor Device</span>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold text-white truncate">
                  {analytics.summary.topDeviceLabel}
                </span>
                <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums shrink-0">
                  {analytics.summary.topDeviceShare}%
                </span>
              </div>
              <span className="mt-2 text-xs text-neutral-500">
                {analytics.deviceDataSource === 'live_telemetry'
                  ? 'Measured from visitor User-Agent sessions'
                  : 'Measured from catalog target platforms'}
              </span>
            </div>
          </div>

          {/* Chart 1: Daily Download Trends */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
                  <h3 className="text-sm font-semibold text-white">Daily Download &amp; Visitor Trends</h3>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Daily APK package downloads and visitor sessions over the last {days} days
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-4 text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
                    <span>Downloads</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    <span>Visits</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTrendMode('area')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      trendMode === 'area' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Area
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMode('bar')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      trendMode === 'bar' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Bars
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {trendMode === 'area' ? (
                  <AreaChart data={analytics.dailyTrends} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="zuzuDownloadsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="zuzuVisitsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#737373"
                      tick={{ fill: '#a3a3a3', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#262626' }}
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="#737373"
                      tick={{ fill: '#a3a3a3', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<DailyTrendTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="downloads"
                      name="APK Downloads"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#zuzuDownloadsGrad)"
                      activeDot={{ r: 4, fill: '#06b6d4', stroke: '#0a0a0a', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      name="Visitor Sessions"
                      stroke="#f59e0b"
                      strokeWidth={1.75}
                      fillOpacity={1}
                      fill="url(#zuzuVisitsGrad)"
                      activeDot={{ r: 4, fill: '#f59e0b', stroke: '#0a0a0a', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={analytics.dailyTrends} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#737373"
                      tick={{ fill: '#a3a3a3', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#262626' }}
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="#737373"
                      tick={{ fill: '#a3a3a3', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<DailyTrendTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="downloads" name="APK Downloads" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="visits" name="Visitor Sessions" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          {/* Bottom 2-Column Split: Top-Performing App Versions & Visitor Device Distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            {/* Chart 2: Top-Performing App Versions */}
            <section className="xl:col-span-7 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h3 className="text-sm font-semibold text-white">Top-Performing App Versions</h3>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Ranked APK builds by total recorded downloads across platforms
                  </p>
                </div>
                <span className="text-xs text-neutral-500 font-mono tabular-nums whitespace-nowrap shrink-0">
                  Top {analytics.topVersions.length} releases
                </span>
              </div>

              {analytics.topVersions.length === 0 ? (
                <div className="py-14 text-center border border-dashed border-neutral-800 rounded-xl">
                  <p className="text-sm font-medium text-neutral-300">No app versions published yet</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Upload an APK release to start tracking version adoption.
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-full h-[270px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.topVersions.slice(0, 7)}
                        layout="vertical"
                        margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                      >
                        <CartesianGrid stroke="#262626" strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          stroke="#737373"
                          tick={{ fill: '#a3a3a3', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#262626' }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={155}
                          stroke="#737373"
                          tick={{ fill: '#e5e5e5', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<VersionBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="downloads" radius={[0, 4, 4, 0]} maxBarSize={22}>
                          {analytics.topVersions.slice(0, 7).map((entry) => (
                            <Cell key={entry.key} fill={getPlatformBarColor(entry.platform)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Clean Tabular Breakdown */}
                  <div className="overflow-x-auto border-t border-neutral-800 pt-3">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-neutral-500 border-b border-neutral-800">
                          <th className="py-2 pr-3 font-medium">App &amp; Version</th>
                          <th className="py-2 px-3 font-medium">Platform</th>
                          <th className="py-2 px-3 font-medium">Released</th>
                          <th className="py-2 pl-3 text-right font-medium">Downloads</th>
                          <th className="py-2 pl-3 text-right font-medium">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/70">
                        {analytics.topVersions.slice(0, 6).map((ver) => (
                          <tr key={ver.key} className="hover:bg-neutral-800/40 transition-colors">
                            <td className="py-2.5 pr-3 text-neutral-200 font-medium truncate max-w-[190px]">
                              {ver.appName}{' '}
                              <span className="text-cyan-400 font-mono">{ver.version}</span>
                            </td>
                            <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap">
                              {ver.platform}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-500 font-mono tabular-nums whitespace-nowrap">
                              {ver.releaseDate}
                            </td>
                            <td className="py-2.5 pl-3 text-right text-white font-mono tabular-nums font-medium">
                              {formatNumber(ver.downloads)}
                            </td>
                            <td className="py-2.5 pl-3 text-right text-neutral-400 font-mono tabular-nums">
                              {ver.sharePercent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* Chart 3: Visitor Device Distribution */}
            <section className="xl:col-span-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <h3 className="text-sm font-semibold text-white">Visitor Device Distribution</h3>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {analytics.deviceDataSource === 'live_telemetry'
                      ? 'Client User-Agent breakdown across storefront visits & downloads'
                      : 'Target platform share derived from live store catalog'}
                  </p>
                </div>
              </div>

              {analytics.deviceDistribution.length === 0 ? (
                <div className="py-14 text-center border border-dashed border-neutral-800 rounded-xl">
                  <p className="text-sm font-medium text-neutral-300">No device telemetry recorded yet</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Device metrics appear automatically as visitors browse and download APKs.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5 flex-1 justify-between">
                  <div className="relative w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.deviceDistribution}
                          dataKey="count"
                          nameKey="device"
                          cx="50%"
                          cy="50%"
                          innerRadius={64}
                          outerRadius={94}
                          paddingAngle={2}
                          stroke="#171717"
                          strokeWidth={2}
                          onMouseEnter={(_, index) => setActiveDeviceIndex(index)}
                          onMouseLeave={() => setActiveDeviceIndex(null)}
                        >
                          {analytics.deviceDistribution.map((entry, idx) => (
                            <Cell
                              key={entry.device}
                              fill={entry.color}
                              opacity={activeDeviceIndex === null || activeDeviceIndex === idx ? 1 : 0.45}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<DevicePieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center Donut Summary */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] text-neutral-400">
                        {activeDeviceIndex !== null && analytics.deviceDistribution[activeDeviceIndex]
                          ? analytics.deviceDistribution[activeDeviceIndex].device
                          : analytics.deviceDataSource === 'live_telemetry'
                          ? 'Tracked Pings'
                          : 'Platform Units'}
                      </span>
                      <span className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">
                        {activeDeviceIndex !== null && analytics.deviceDistribution[activeDeviceIndex]
                          ? `${analytics.deviceDistribution[activeDeviceIndex].sharePercent}%`
                          : formatNumber(totalDeviceEntries)}
                      </span>
                    </div>
                  </div>

                  {/* Device Distribution Breakdown List */}
                  <div className="space-y-3 border-t border-neutral-800 pt-4">
                    {analytics.deviceDistribution.map((item, idx) => (
                      <div
                        key={item.device}
                        onMouseEnter={() => setActiveDeviceIndex(idx)}
                        onMouseLeave={() => setActiveDeviceIndex(null)}
                        className="space-y-1.5 cursor-default"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-neutral-200 font-medium">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.device}</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono tabular-nums">
                            <span className="text-neutral-400">{formatNumber(item.count)}</span>
                            <span className="text-white font-semibold w-12 text-right">
                              {item.sharePercent}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-opacity duration-150"
                            style={{
                              width: `${Math.max(item.sharePercent, 2)}%`,
                              backgroundColor: item.color,
                              opacity: activeDeviceIndex === null || activeDeviceIndex === idx ? 1 : 0.45
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
};
