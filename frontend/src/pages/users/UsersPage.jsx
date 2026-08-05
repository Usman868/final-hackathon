import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  RefreshCw,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getUsers, createUser, setUserActive } from '../../api/users.api';
import { ROLES } from '../../constants';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Za-z]/, 'Must include a letter')
    .regex(/[0-9]/, 'Must include a number'),
  role: z.enum([ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.TECHNICIAN]),
  phone: z.string().max(20).optional().or(z.literal('')),
});

const ROLE_BADGE = {
  ADMIN: 'bg-violet-50 text-violet-800 ring-violet-600/15',
  SUPERVISOR: 'bg-sky-50 text-sky-800 ring-sky-600/15',
  TECHNICIAN: 'bg-teal-50 text-teal-800 ring-teal-600/15',
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: ROLES.TECHNICIAN,
      phone: '',
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (roleFilter) params.role = roleFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await getUsers(params);
      setUsers(data?.data?.users || []);
      setPagination(data?.data?.pagination || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (values) => {
    setSubmitting(true);
    try {
      await createUser({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
        phone: values.phone?.trim() || undefined,
      });
      toast.success(`${values.role} account created`);
      reset();
      setShowForm(false);
      setPage(1);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create user');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user) => {
    const next = !user.isActive;
    const label = next ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${label} ${user.name}?`)) return;
    try {
      await setUserActive(user._id, next);
      toast.success(next ? 'User activated' : 'User deactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Users
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Create staff accounts: Admin, Supervisor, or Technician.
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
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <UserPlus className="h-4 w-4" />
            {showForm ? 'Close form' : 'Add user'}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onCreate)}
          className="card space-y-4 p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold text-ink-900">Register new user</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" error={errors.name}>
              <input className={inp} placeholder="Jane Doe" {...register('name')} />
            </Field>
            <Field label="Email *" error={errors.email}>
              <input
                type="email"
                className={inp}
                placeholder="jane@company.com"
                {...register('email')}
              />
            </Field>
            <Field label="Password *" error={errors.password}>
              <input
                type="password"
                className={inp}
                placeholder="Min 8 chars, letter + number"
                {...register('password')}
              />
            </Field>
            <Field label="Role *" error={errors.role}>
              <select className={inp} {...register('role')}>
                <option value={ROLES.TECHNICIAN}>Technician</option>
                <option value={ROLES.SUPERVISOR}>Supervisor</option>
                <option value={ROLES.ADMIN}>Admin</option>
              </select>
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input className={inp} placeholder="Optional" {...register('phone')} />
            </Field>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setShowForm(false);
              }}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-500">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  load();
                }
              }}
              placeholder="Name or email…"
              className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
            />
          </div>
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-ink-500">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
          >
            <option value="">All roles</option>
            <option value={ROLES.ADMIN}>Admin</option>
            <option value={ROLES.SUPERVISOR}>Supervisor</option>
            <option value={ROLES.TECHNICIAN}>Technician</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load();
          }}
          className="rounded-lg bg-ink-800 px-4 py-2 text-sm font-medium text-white hover:bg-ink-900"
        >
          Apply
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-ink-50 text-xs font-medium uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Joined</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-ink-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="hover:bg-ink-50/70">
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink-900">{u.name}</p>
                          <p className="text-xs text-ink-400">{u.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                              ROLE_BADGE[u.role] || 'bg-ink-100 text-ink-600'
                            )}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-ink-600">{u.phone || '—'}</td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
                                : 'bg-red-50 text-red-800 ring-red-600/15'
                            )}
                          >
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-500">
                          {u.createdAt
                            ? format(new Date(u.createdAt), 'MMM d, yyyy')
                            : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleActive(u)}
                            className="text-xs font-medium text-ink-600 hover:text-brand-700"
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-border p-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
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

const inp =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15';

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error.message}</p>}
    </div>
  );
}
