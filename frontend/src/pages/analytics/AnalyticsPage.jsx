import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { format, subDays } from 'date-fns';
import {
  getTechnicianPerformance,
  getAnalyticsOverview,
} from '../../api/analytics.api';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

function defaultRange(preset) {
  const to = new Date();
  if (preset === 'week') return { from: subDays(to, 7), to };
  if (preset === 'month') return { from: subDays(to, 30), to };
  if (preset === 'quarter') return { from: subDays(to, 90), to };
  return { from: subDays(to, 30), to };
}

export default function AnalyticsPage() {
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState(() =>
    format(defaultRange('month').from, 'yyyy-MM-dd')
  );
  const [to, setTo] = useState(() => format(defaultRange('month').to, 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [techData, setTechData] = useState(null);
  const [overview, setOverview] = useState(null);

  const params = useMemo(() => ({ from, to }), [from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, oRes] = await Promise.all([
        getTechnicianPerformance(params),
        getAnalyticsOverview(params),
      ]);
      setTechData(tRes.data?.data || null);
      setOverview(oRes.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load analytics');
      setTechData(null);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const applyPreset = (p) => {
    setPreset(p);
    const r = defaultRange(p);
    setFrom(format(r.from, 'yyyy-MM-dd'));
    setTo(format(r.to, 'yyyy-MM-dd'));
  };

  const techs = techData?.technicians || [];
  const rankings = techData?.rankings || {};
  const totals = overview?.totals || {};
  const weeklyTrend = overview?.weeklyTrend || [];
  const worstAssets = overview?.worstAssets || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Performance over a date range — technician scorecards, rankings, and
            problem assets. Not a live ops snapshot.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Range filters — key difference vs Dashboard */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'week', label: 'Last 7 days' },
            { id: 'month', label: 'Last 30 days' },
            { id: 'quarter', label: 'Last 90 days' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset',
                preset === p.id
                  ? 'bg-brand-50 text-brand-800 ring-brand-600/20'
                  : 'bg-white text-ink-600 ring-border hover:bg-ink-50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:ml-auto">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase text-ink-400">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setPreset('custom');
                setFrom(e.target.value);
              }}
              className="rounded-lg border border-border px-2.5 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase text-ink-400">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setPreset('custom');
                setTo(e.target.value);
              }}
              className="rounded-lg border border-border px-2.5 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* Range totals — labeled as period metrics, not "open now" */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={TrendingUp}
              label="Opened in range"
              value={totals.opened ?? '—'}
            />
            <Metric
              icon={Users}
              label="Resolved in range"
              value={totals.resolved ?? '—'}
            />
            <Metric
              icon={Trophy}
              label="Resolve rate"
              value={
                totals.resolveRate != null ? `${totals.resolveRate}%` : '—'
              }
            />
            <Metric
              icon={AlertTriangle}
              label="SLA breached (range)"
              value={totals.slaBreached ?? '—'}
              tone="danger"
            />
          </div>

          {/* Technician performance table */}
          <div className="card overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-900">
                Technician performance
              </h2>
              <p className="text-xs text-ink-400">
                Ranked by composite score (resolved, critical, SLA, maintenance)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5">#</th>
                    <th className="px-3 py-2.5">Technician</th>
                    <th className="px-3 py-2.5">Resolved</th>
                    <th className="px-3 py-2.5">Assigned</th>
                    <th className="px-3 py-2.5">Open queue</th>
                    <th className="px-3 py-2.5">Avg hours</th>
                    <th className="px-3 py-2.5">SLA %</th>
                    <th className="px-3 py-2.5">Critical</th>
                    <th className="px-3 py-2.5">Maint. done</th>
                    <th className="px-5 py-2.5">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {techs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-5 py-10 text-center text-ink-400"
                      >
                        No technician data for this range
                      </td>
                    </tr>
                  ) : (
                    techs.map((row, i) => (
                      <tr key={row.technician._id}>
                        <td className="px-5 py-2.5 text-ink-400">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-ink-900">
                          {row.technician.name}
                        </td>
                        <td className="px-3 py-2.5">{row.resolvedInRange}</td>
                        <td className="px-3 py-2.5">{row.assignedInRange}</td>
                        <td className="px-3 py-2.5">{row.openAssigned}</td>
                        <td className="px-3 py-2.5">
                          {row.avgResolutionHours != null
                            ? row.avgResolutionHours
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {row.slaPercent != null ? (
                            <span
                              className={cn(
                                row.slaPercent >= 80
                                  ? 'text-emerald-700'
                                  : row.slaPercent >= 50
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                              )}
                            >
                              {row.slaPercent}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5">{row.criticalResolved}</td>
                        <td className="px-3 py-2.5">
                          {row.maintenanceCompleted}
                        </td>
                        <td className="px-5 py-2.5 font-semibold text-brand-800">
                          {row.score}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rankings */}
          <div className="grid gap-4 lg:grid-cols-3">
            <RankCard title="Top by resolved" items={rankings.byResolved} unit="" />
            <RankCard title="Best SLA %" items={rankings.bySla} unit="%" />
            <RankCard
              title="Heaviest open queue"
              items={rankings.byOpenLoad}
              unit=""
              tone="amber"
            />
          </div>

          {/* Weekly volume in range */}
          <div className="card p-4">
            <h2 className="mb-1 text-sm font-semibold text-ink-900">
              Weekly volume (selected range)
            </h2>
            <p className="mb-3 text-xs text-ink-400">
              Opened vs resolved by ISO week — not live status counts
            </p>
            {weeklyTrend.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-400">No trend data</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="opened"
                      name="Opened"
                      stroke="#0f766e"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="Resolved"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Worst assets */}
          <div className="card p-4">
            <h2 className="mb-1 text-sm font-semibold text-ink-900">
              Most reported assets (range)
            </h2>
            <p className="mb-3 text-xs text-ink-400">
              Failure ranking for replacement / deeper inspection decisions
            </p>
            {worstAssets.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">No data</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={worstAssets.map((a) => ({
                      name: a.assetCode || a.name || 'Asset',
                      count: a.count,
                      critical: a.critical,
                    }))}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="Issues" fill="#0f766e" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="critical" name="Critical" fill="#ef4444" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-xl font-bold text-ink-900">{value}</p>
      </div>
    </div>
  );
}

function RankCard({ title, items = [], unit, tone }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-ink-400">No data</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, i) => (
            <li
              key={item.name + i}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 text-ink-700">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    tone === 'amber'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-brand-50 text-brand-800'
                  )}
                >
                  {i + 1}
                </span>
                {item.name}
              </span>
              <span className="font-semibold text-ink-900">
                {item.value}
                {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
