import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Plus,
  Calendar,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getSchedules,
  createSchedule,
  completeSchedule,
  cancelSchedule,
} from '../../api/maintenance.api';
import { getAssets } from '../../api/assets.api';
import { getTechnicians } from '../../api/users.api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const FREQUENCIES = ['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Overdue'];

const statusStyle = {
  Scheduled: 'bg-sky-50 text-sky-800 ring-sky-600/15',
  'In Progress': 'bg-amber-50 text-amber-800 ring-amber-600/15',
  Completed: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  Cancelled: 'bg-ink-100 text-ink-600 ring-ink-500/10',
  Overdue: 'bg-red-50 text-red-800 ring-red-600/15',
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [assets, setAssets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    asset: '',
    title: '',
    description: '',
    scheduledDate: '',
    frequency: 'One-time',
    assignedTo: '',
    priority: 'Medium',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (status) params.status = status;
      const { data } = await getSchedules(params);
      setItems(data?.data?.schedules || []);
      setPagination(data?.data?.pagination || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load schedules');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canManage) return;
    getAssets({ limit: 100 })
      .then(({ data }) => setAssets(data?.data?.assets || []))
      .catch(() => setAssets([]));
    getTechnicians()
      .then(({ data }) => setTechnicians(data?.data?.technicians || []))
      .catch(() => setTechnicians([]));
  }, [canManage]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.asset || !form.title || !form.scheduledDate) {
      toast.error('Asset, title and date are required');
      return;
    }
    setBusy(true);
    try {
      await createSchedule({
        ...form,
        assignedTo: form.assignedTo || undefined,
      });
      toast.success('Maintenance scheduled');
      setShowForm(false);
      setForm({
        asset: '',
        title: '',
        description: '',
        scheduledDate: '',
        frequency: 'One-time',
        assignedTo: '',
        priority: 'Medium',
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const onComplete = async (id) => {
    if (!window.confirm('Mark this maintenance as completed?')) return;
    try {
      await completeSchedule(id);
      toast.success('Marked complete');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const onCancel = async (id) => {
    if (!window.confirm('Cancel this schedule?')) return;
    try {
      await cancelSchedule(id);
      toast.success('Cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Preventive schedules, due dates, and completion tracking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <Plus className="h-4 w-4" />
              Schedule
            </button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <form onSubmit={onCreate} className="card grid gap-3 p-5 sm:grid-cols-2">
          <h2 className="sm:col-span-2 text-sm font-semibold text-ink-900">
            New maintenance schedule
          </h2>
          <Field label="Asset *">
            <select
              className={inp}
              value={form.asset}
              onChange={(e) => setForm({ ...form, asset: e.target.value })}
              required
            >
              <option value="">Select asset…</option>
              {assets.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.assetCode} – {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title *">
            <input
              className={inp}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Filter cleaning, calibration…"
            />
          </Field>
          <Field label="Scheduled date *">
            <input
              type="date"
              className={inp}
              value={form.scheduledDate}
              onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              required
            />
          </Field>
          <Field label="Frequency">
            <select
              className={inp}
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assign technician">
            <select
              className={inp}
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            >
              <option value="">Unassigned</option>
              {technicians.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className={inp}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              className={inp}
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Create schedule'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-ink-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
            !status ? 'bg-brand-50 text-brand-800 ring-brand-600/20' : 'bg-white text-ink-600 ring-border'
          )}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
              status === s ? 'bg-brand-50 text-brand-800 ring-brand-600/20' : 'bg-white text-ink-600 ring-border'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-ink-400">
            <Calendar className="h-10 w-10 opacity-40" />
            <p className="mt-3 text-sm">No maintenance schedules</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((s) => (
              <li
                key={s._id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{s.title}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                        statusStyle[s.status] || statusStyle.Scheduled
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {s.asset?.name || 'Asset'}{' '}
                    <span className="font-mono text-xs text-ink-400">
                      {s.asset?.assetCode}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Due{' '}
                    {s.scheduledDate
                      ? format(new Date(s.scheduledDate), 'MMM d, yyyy')
                      : '—'}
                    {s.frequency ? ` · ${s.frequency}` : ''}
                    {s.assignedTo?.name ? ` · ${s.assignedTo.name}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {s.status !== 'Completed' && s.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => onComplete(s._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Complete
                    </button>
                  )}
                  {canManage && s.status !== 'Completed' && s.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => onCancel(s._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-between border-t border-border px-5 py-3 text-sm text-ink-500">
            <span>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}
                className="disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inp =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15';

function Field({ label, children, className }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-ink-500">{label}</label>
      {children}
    </div>
  );
}
