import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  Loader2,
  Eye,
  QrCode,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getAssets } from '../../api/assets.api';
import { ASSET_STATUS, ASSET_CATEGORIES } from '../../constants';
import { AssetStatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = Object.values(ASSET_STATUS);

export default function AssetsListPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [assets, setAssets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const page = parseInt(searchParams.get('page') || '1', 10);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (category) params.category = category;

      const { data } = await getAssets(params);
      setAssets(data?.data?.assets || []);
      setPagination(data?.data?.pagination || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, category]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const applyFilters = (e) => {
    e?.preventDefault();
    const next = new URLSearchParams();
    if (search.trim()) next.set('search', search.trim());
    if (status) next.set('status', status);
    if (category) next.set('category', category);
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setSearchParams({});
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
            Assets
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Search, filter, and manage registered equipment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchAssets()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          {isAdmin && (
            <Link
              to="/assets/new"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <Plus className="h-4 w-4" />
              Add asset
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={applyFilters}
        className="card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-500">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, code, location…"
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
            />
          </div>
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-ink-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-ink-500">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
          >
            <option value="">All categories</option>
            {ASSET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-border px-3 py-2 text-sm text-ink-600 hover:bg-ink-50"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-ink-50 text-xs font-medium uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3">Asset</th>
                    <th className="px-3 py-3">Code</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Technician</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-ink-400">
                        No assets match your filters
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
                      <tr key={asset._id} className="hover:bg-ink-50/70">
                        <td className="px-5 py-3">
                          <Link
                            to={`/assets/${asset._id}`}
                            className="font-medium text-ink-900 hover:text-brand-700"
                          >
                            {asset.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-ink-600">
                          {asset.assetCode}
                        </td>
                        <td className="px-3 py-3 text-ink-600">{asset.category}</td>
                        <td className="max-w-[140px] truncate px-3 py-3 text-ink-600">
                          {asset.location}
                        </td>
                        <td className="px-3 py-3">
                          <AssetStatusBadge status={asset.status} />
                        </td>
                        <td className="px-3 py-3 text-ink-600">
                          {asset.assignedTechnician?.name || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <Link
                              to={`/assets/${asset._id}`}
                              className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/assets/${asset._id}?tab=qr`}
                              className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                              title="QR"
                            >
                              <QrCode className="h-4 w-4" />
                            </Link>
                          </div>
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
                  Page {pagination.page} of {pagination.totalPages} · {pagination.totalDocs}{' '}
                  total
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
