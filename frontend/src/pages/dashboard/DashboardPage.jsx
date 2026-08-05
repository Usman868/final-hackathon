import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  Users,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Clock,
  Activity,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { getDashboardSummary } from '../../api/dashboard.api';
import { IssueStatusBadge, PriorityBadge } from '../../components/ui/StatusBadge';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { pickData, safeArray, formatDateSafe, formatDistanceSafe } from '../../utils/safe';

const PIE_COLORS = ['#0d9488', '#0ea5e9', '#d97706', '#dc2626', '#8b5cf6', '#64748b', '#16a34a', '#e11d48'];

function StatCard({ label, value, hint, icon: Icon, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className={cn('rounded-lg p-2', accent || 'bg-brand-50 text-brand-700')}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-ink-900">
        {value ?? '—'}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await getDashboardSummary();
      setSummary(pickData(data, 'summary', null) || data?.data?.summary || null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load dashboard';
      setError(msg);
      if (isRefresh) toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const cards = useMemo(() => {
    const c = summary?.cards || {};
    return [
      {
        label: 'Total Assets',
        value: c.totalAssets,
        hint: 'Registered in system',
        icon: Boxes,
        accent: 'bg-brand-50 text-brand-700',
      },
      {
        label: 'Open Issues',
        value: c.openIssues,
        hint: 'Need attention',
        icon: AlertTriangle,
        accent: 'bg-amber-50 text-amber-700',
      },
      {
        label: 'Critical',
        value: c.criticalIssues,
        hint: 'High priority open',
        icon: AlertTriangle,
        accent: 'bg-red-50 text-red-700',
      },
      {
        label: 'Technicians',
        value: c.technicians,
        hint: 'Active staff',
        icon: Users,
        accent: 'bg-sky-50 text-sky-700',
      },
      {
        label: 'Operational',
        value: c.operationalAssets,
        hint: 'Assets running normally',
        icon: CheckCircle2,
        accent: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Under work',
        value: c.underMaintenance,
        hint: 'Inspection or maintenance',
        icon: Wrench,
        accent: 'bg-violet-50 text-violet-700',
      },
    ];
  }, [summary]);

  const priorityChartData = useMemo(() => {
    const p = summary?.issuesByPriority || {};
    return Object.entries(p)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [summary]);

  const statusChartData = useMemo(() => {
    const s = summary?.issuesByStatus || {};
    return Object.entries(s)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [summary]);

  const categoryChartData = useMemo(() => {
    return (summary?.assetsByCategory || []).map((row) => ({
      name: row.category,
      count: row.count,
    }));
  }, [summary]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm text-ink-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-3 text-lg font-semibold text-ink-900">Couldn’t load dashboard</h2>
        <p className="mt-1 text-sm text-ink-500">{error}</p>
        <button
          type="button"
          onClick={() => fetchSummary()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Live view of
            assets and issues.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchSummary(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-1">
          <h2 className="text-sm font-semibold text-ink-900">Issues by priority</h2>
          <p className="text-xs text-ink-400">Distribution of all issues</p>
          <div className="mt-4 h-56">
            {priorityChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {priorityChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-5 xl:col-span-1">
          <h2 className="text-sm font-semibold text-ink-900">Issues by status</h2>
          <p className="text-xs text-ink-400">Workflow snapshot</p>
          <div className="mt-4 h-56">
            {statusChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {statusChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2 xl:col-span-1">
          <h2 className="text-sm font-semibold text-ink-900">Assets by category</h2>
          <p className="text-xs text-ink-400">Inventory mix</p>
          <div className="mt-4 h-56">
            {categoryChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Lists row */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Critical */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Critical issues</h2>
            <Link
              to="/issues?isCritical=true"
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(summary?.criticalIssues || []).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-ink-400">No critical open issues</li>
            ) : (
              summary.criticalIssues.map((issue) => (
                <li key={issue._id}>
                  <Link
                    to={`/issues/${issue._id}`}
                    className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-ink-50"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{issue.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {issue.issueNumber}
                        {issue.asset?.name ? ` · ${issue.asset.name}` : ''}
                      </p>
                    </div>
                    <PriorityBadge priority={issue.priority} />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Upcoming services */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Upcoming services</h2>
            <Link to="/assets" className="text-xs font-medium text-brand-700 hover:underline">
              Assets
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(summary?.upcomingServices || []).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-ink-400">
                No services due in the next 30 days
              </li>
            ) : (
              summary.upcomingServices.map((asset) => (
                <li key={asset._id}>
                  <Link
                    to={`/assets/${asset._id}`}
                    className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-ink-50"
                  >
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{asset.name}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {asset.assetCode}
                        {asset.location ? ` · ${asset.location}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-ink-600">
                      {asset.nextServiceDate
                        ? format(new Date(asset.nextServiceDate), 'MMM d')
                        : '—'}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Recent activity */}
        <div className="card flex flex-col lg:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Recent activity</h2>
            <Activity className="h-4 w-4 text-ink-400" />
          </div>
          <ul className="divide-y divide-border">
            {(summary?.recentActivities || []).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-ink-400">No recent activity</li>
            ) : (
              summary.recentActivities.slice(0, 8).map((item) => (
                <li key={item._id} className="flex gap-3 px-5 py-3.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-800 line-clamp-2">{item.description}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {item.actorName || item.actor?.name || 'System'}
                      {item.createdAt
                        ? ` · ${formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}`
                        : ''}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Recent issues table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink-900">Recent issues</h2>
          <Link
            to="/issues"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            All issues <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-ink-50 text-xs font-medium uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">Issue</th>
                <th className="px-3 py-3">Asset</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Assigned</th>
                <th className="px-5 py-3">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(summary?.recentIssues || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-ink-400">
                    No issues yet
                  </td>
                </tr>
              ) : (
                summary.recentIssues.map((issue) => (
                  <tr key={issue._id} className="hover:bg-ink-50/80">
                    <td className="px-5 py-3">
                      <Link
                        to={`/issues/${issue._id}`}
                        className="font-medium text-ink-900 hover:text-brand-700"
                      >
                        {issue.title}
                      </Link>
                      <p className="text-xs text-ink-400">{issue.issueNumber}</p>
                    </td>
                    <td className="px-3 py-3 text-ink-600">
                      {issue.asset?.name || '—'}
                      {issue.asset?.assetCode ? (
                        <span className="block text-xs text-ink-400">{issue.asset.assetCode}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <IssueStatusBadge status={issue.status} />
                    </td>
                    <td className="px-3 py-3 text-ink-600">
                      {issue.assignedTo?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-500">
                      {issue.reportedAt
                        ? formatDistanceToNow(new Date(issue.reportedAt), { addSuffix: true })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-ink-400">
      No data yet
    </div>
  );
}
