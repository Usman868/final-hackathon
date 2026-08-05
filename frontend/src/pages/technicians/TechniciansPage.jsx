import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Users, Mail, Phone, Wrench } from 'lucide-react';
import { getTechnicians } from '../../api/users.api';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getTechnicians();
      setTechnicians(data?.data?.technicians || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load technicians');
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Technicians
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Active technicians available for issue assignment.
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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
        </div>
      ) : technicians.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-ink-400">
          <Users className="h-10 w-10 opacity-40" />
          <p className="mt-3 text-sm">No active technicians found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {technicians.map((t) => (
            <div key={t._id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                  {(t.name || 'T')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{t.name}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                    {t.role || 'TECHNICIAN'}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-ink-600">
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-ink-400" />
                  <span className="truncate">{t.email}</span>
                </li>
                {t.phone ? (
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-ink-400" />
                    {t.phone}
                  </li>
                ) : null}
                {t.skills?.length > 0 ? (
                  <li className="flex items-start gap-2">
                    <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="text-xs text-ink-500">{t.skills.join(' · ')}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
