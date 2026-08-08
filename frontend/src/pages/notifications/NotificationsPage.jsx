import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../../api/notifications.api';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getNotifications({
        page,
        limit: 15,
        unreadOnly: unreadOnly || undefined,
      });
      setItems(data?.data?.notifications || []);
      setPagination(data?.data?.pagination || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load notifications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkOne = async (id) => {
    try {
      await markAsRead(id);
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark as read');
    }
  };

  const handleMarkAll = async () => {
    setBusy(true);
    try {
      await markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All marked as read');
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const openNotification = async (n) => {
    if (!n.isRead) await handleMarkOne(n._id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Assignments, status changes, and system alerts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setUnreadOnly((u) => !u);
            }}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium',
              unreadOnly
                ? 'border-brand-200 bg-brand-50 text-brand-800'
                : 'border-border bg-white text-ink-700 hover:bg-ink-50'
            )}
          >
            {unreadOnly ? 'Showing unread' : 'Unread only'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-border bg-white p-2 text-ink-600 hover:bg-ink-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-ink-400">
            <Bell className="h-10 w-10 opacity-40" />
            <p className="mt-3 text-sm">No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const href =
                n.link ||
                (n.issue?._id ? `/issues/${n.issue._id}` : null) ||
                (n.asset?._id ? `/assets/${n.asset._id}` : null);

              const inner = (
                <div className="flex gap-3 px-5 py-4">
                  <span
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                      n.isRead ? 'bg-ink-200' : 'bg-brand-600'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm',
                          n.isRead
                            ? 'font-medium text-ink-700'
                            : 'font-semibold text-ink-900'
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="text-xs text-ink-400">
                        {n.createdAt
                          ? formatDistanceToNow(new Date(n.createdAt), {
                              addSuffix: true,
                            })
                          : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-600">{n.message}</p>
                    {(n.issue?.issueNumber || n.asset?.name) && (
                      <p className="mt-1 text-xs text-ink-400">
                        {n.issue?.issueNumber}
                        {n.issue?.issueNumber && n.asset?.name ? ' · ' : ''}
                        {n.asset?.name}
                      </p>
                    )}
                    <span className="mt-1 inline-block rounded bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">
                      {String(n.type || 'alert').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );

              return (
                <li key={n._id} className={cn(!n.isRead && 'bg-brand-50/30')}>
                  {href ? (
                    <Link
                      to={href}
                      onClick={() => openNotification(n)}
                      className="block transition hover:bg-ink-50/80"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full text-left hover:bg-ink-50/80"
                      onClick={() => openNotification(n)}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
            <p className="text-ink-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage(pagination.page - 1)}
                className="rounded-lg border border-border p-2 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage(pagination.page + 1)}
                className="rounded-lg border border-border p-2 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
