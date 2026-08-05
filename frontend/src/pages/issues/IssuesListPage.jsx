import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { getIssues } from '../../api/issues.api';
import { ISSUE_STATUS, PRIORITY } from '../../constants';
import { IssueStatusBadge, PriorityBadge } from '../../components/ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

export default function IssuesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const isCritical = searchParams.get('isCritical') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, sortBy: 'reportedAt', sortOrder: 'desc' };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (isCritical === 'true') params.isCritical = true;
      const asset = searchParams.get('asset');
      if (asset) params.asset = asset;

      const { data } = await getIssues(params);
      setIssues(data?.data?.issues || []);
      setPagination(data?.data?.pagination || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load issues');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority, isCritical, searchParams]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const applySearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search.trim()) next.set('search', search.trim());
    else next.delete('search');
    next.set('page', '1');
    setSearchParams(next);
  };

  const goPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Issues
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Track, assign, and resolve asset issues through the workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchIssues}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <form
        onSubmit={applySearch}
        className="card flex flex-col gap-3 p-4 lg:flex-row lg:flex-wrap lg:items-end"
      >
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-500">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, issue number…"
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
            />
          </div>
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-ink-500">Status</label>
          <select
            value={status}
            onChange={(e) => setFilter('status', e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
          >
            <option value="">All statuses</option>
            {Object.values(ISSUE_STATUS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-36">
          <label className="mb-1 block text-xs font-medium text-ink-500">Priority</label>
          <select
            value={priority}
            onChange={(e) => setFilter('priority', e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
          >
            <option value="">All</option>
            {Object.values(PRIORITY).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('isCritical', isCritical === 'true' ? '' : 'true')}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium',
              isCritical === 'true'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-border text-ink-600 hover:bg-ink-50'
            )}
          >
            <Filter className="mr-1 inline h-3.5 w-3.5" />
            Critical
          </button>
          <button
            type="submit"
            className="rounded-lg bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900"
          >
            Search
          </button>
        </div>
      </form>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-ink-50 text-xs font-medium uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3">Issue</th>
                    <th className="px-3 py-3">Asset</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Assigned</th>
                    <th className="px-3 py-3">Reported</th>
                    <th className="px-5 py-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {issues.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-ink-400">
                        No issues found
                      </td>
                    </tr>
                  ) : (
                    issues.map((issue) => (
                      <tr key={issue._id} className="hover:bg-ink-50/70">
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
                            <span className="block text-xs text-ink-400">
                              {issue.asset.assetCode}
                            </span>
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
                        <td className="px-3 py-3 text-xs text-ink-500">
                          {issue.reportedAt
                            ? formatDistanceToNow(new Date(issue.reportedAt), {
                                addSuffix: true,
                              })
                            : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            to={`/issues/${issue._id}`}
                            className="inline-flex rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
                <p className="text-ink-500">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => goPage(pagination.prevPage)}
                    className="rounded-lg border border-border p-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!pagination.hasNextPage}
                    onClick={() => goPage(pagination.nextPage)}
                    className="rounded-lg border border-border p-2 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
