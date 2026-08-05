import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { getAuditLogs } from '../../api/audit.api';
import toast from 'react-hot-toast';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAuditLogs({ page, limit: 25 });
      setLogs(data?.data?.logs || []);
      setPagination(data?.data?.pagination || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load audit log');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Audit log
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Admin actions: user changes, asset retirement, and more.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-ink-400">
            <Shield className="h-10 w-10 opacity-40" />
            <p className="mt-3 text-sm">No audit entries yet</p>
            <p className="text-xs">Retire an asset or create a user to generate logs.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log._id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900">{log.summary}</p>
                  <span className="text-xs text-ink-400">
                    {log.createdAt
                      ? format(new Date(log.createdAt), 'MMM d, yyyy · HH:mm')
                      : ''}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  <span className="rounded bg-ink-50 px-1.5 py-0.5 font-medium uppercase tracking-wide text-ink-600">
                    {log.action}
                  </span>
                  {log.actorName || log.actor?.name
                    ? ` · ${log.actorName || log.actor?.name}`
                    : ''}
                  {log.actorRole || log.actor?.role
                    ? ` (${log.actorRole || log.actor?.role})`
                    : ''}
                  {log.targetType ? ` · ${log.targetType}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-between border-t border-border px-5 py-3 text-sm">
            <span className="text-ink-500">
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
