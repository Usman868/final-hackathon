import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Download,
  Copy,
  ExternalLink,
  Printer,
  MapPin,
  Calendar,
  User,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import {
  getAssetById,
  getAssetQR,
  getAssetHistory,
  retireAsset,
} from '../../api/assets.api';
import { AssetStatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../constants';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

export default function AssetDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [asset, setAsset] = useState(null);
  const [qr, setQr] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') === 'qr' ? 'qr' : 'overview');
  const [retiring, setRetiring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assetRes, qrRes, histRes] = await Promise.all([
        getAssetById(id),
        getAssetQR(id).catch(() => null),
        getAssetHistory(id, { limit: 20 }).catch(() => null),
      ]);
      const a = assetRes?.data?.data?.asset;
      if (!a) throw new Error('Asset data unavailable');
      setAsset(a);
      if (qrRes?.data?.data) setQr(qrRes.data.data);
      if (histRes) setHistory(histRes?.data?.data?.history || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Asset not found');
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const publicUrl =
    qr?.publicUrl ||
    (asset ? `${window.location.origin}/public/asset/${asset.publicId}` : '');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Public link copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const downloadQr = () => {
    const svg = document.getElementById('asset-qr-svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset?.assetCode || 'asset'}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRetire = async () => {
    if (!window.confirm('Retire this asset permanently? This cannot be undone casually.')) {
      return;
    }
    setRetiring(true);
    try {
      await retireAsset(id, 'Retired from admin UI');
      toast.success('Asset retired');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to retire');
    } finally {
      setRetiring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/assets"
            className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-4 w-4" /> Assets
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{asset.name}</h1>
            <AssetStatusBadge status={asset.status} />
          </div>
          <p className="mt-1 font-mono text-sm text-brand-700">{asset.assetCode}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {isAdmin && asset.status !== 'Retired' && (
            <>
              <Link
                to={`/assets/${id}/edit`}
                className="rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                Edit
              </Link>
              <button
                type="button"
                disabled={retiring}
                onClick={handleRetire}
                className="rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-2 text-sm font-medium text-danger-700 hover:bg-danger-100 disabled:opacity-50"
              >
                Retire
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'qr', label: 'QR & label' },
          { id: 'history', label: 'History' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-medium transition',
              tab === t.id
                ? 'border-brand-600 text-brand-800'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card space-y-4 p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-ink-900">Asset information</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Category" value={asset.category} />
              <Info label="Condition" value={asset.condition} />
              <Info label="Location" value={asset.location} icon={MapPin} />
              <Info label="Model" value={asset.model || '—'} />
              <Info label="Manufacturer" value={asset.manufacturer || '—'} />
              <Info
                label="Assigned technician"
                value={asset.assignedTechnician?.name || 'Unassigned'}
                icon={User}
              />
              <Info
                label="Last service"
                value={
                  asset.lastServiceDate
                    ? format(new Date(asset.lastServiceDate), 'MMM d, yyyy')
                    : '—'
                }
                icon={Calendar}
              />
              <Info
                label="Next service"
                value={
                  asset.nextServiceDate
                    ? format(new Date(asset.nextServiceDate), 'MMM d, yyyy')
                    : '—'
                }
                icon={Calendar}
              />
            </dl>
            {asset.description ? (
              <div>
                <p className="text-xs font-medium text-ink-400">Description</p>
                <p className="mt-1 text-sm text-ink-700">{asset.description}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink-900">Counters</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-ink-50 p-3 text-center">
                  <p className="text-2xl font-bold text-ink-900">{asset.totalIssues ?? 0}</p>
                  <p className="text-xs text-ink-500">Total issues</p>
                </div>
                <div className="rounded-lg bg-ink-50 p-3 text-center">
                  <p className="text-2xl font-bold text-ink-900">{asset.openIssues ?? 0}</p>
                  <p className="text-xs text-ink-500">Open issues</p>
                </div>
              </div>
              <Link
                to={`/issues?asset=${asset._id}`}
                className="mt-4 block text-center text-sm font-medium text-brand-700 hover:underline"
              >
                View related issues
              </Link>
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="card flex items-center justify-between p-4 text-sm font-medium text-ink-800 hover:bg-ink-50"
            >
              Open public page
              <ExternalLink className="h-4 w-4 text-ink-400" />
            </a>
          </div>
        </div>
      )}

      {tab === 'qr' && (
        <div className="card max-w-xl p-6">
          <h2 className="text-sm font-semibold text-ink-900">QR code</h2>
          <p className="mt-1 text-xs text-ink-500">
            Encodes only the public asset URL — no private data.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="rounded-xl border border-border bg-white p-4">
              <QRCode
                id="asset-qr-svg"
                value={publicUrl}
                size={180}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <p className="break-all font-mono text-xs text-ink-600">{publicUrl}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-ink-50"
                >
                  <Copy className="h-4 w-4" /> Copy link
                </button>
                <button
                  type="button"
                  onClick={downloadQr}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-ink-50"
                >
                  <Download className="h-4 w-4" /> Download QR
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-ink-50"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
              {qr?.label && (
                <div className="mt-4 rounded-lg border border-dashed border-border bg-ink-50 p-3 text-xs text-ink-600">
                  <p className="font-semibold text-ink-800">{qr.label.organizationName}</p>
                  <p>{qr.label.assetName}</p>
                  <p className="font-mono">{qr.label.assetCode}</p>
                  <p>{qr.label.location}</p>
                  <p className="mt-1 text-ink-400">{qr.label.scanInstruction}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Permanent timeline</h2>
            <p className="text-xs text-ink-400">Append-only — not casually editable</p>
          </div>
          <ul className="divide-y divide-border">
            {history.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-ink-400">No history yet</li>
            ) : (
              history.map((h) => (
                <li key={h._id} className="flex gap-3 px-5 py-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-800">{h.description}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {h.actorName || h.actor?.name || 'System'}
                      {h.createdAt
                        ? ` · ${format(new Date(h.createdAt), 'MMM d, yyyy · HH:mm')}`
                        : ''}
                      {h.issueNumber ? ` · ${h.issueNumber}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-ink-400">
                    {h.action?.replace(/_/g, ' ')}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="flex gap-2">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /> : null}
      <div>
        <dt className="text-xs text-ink-400">{label}</dt>
        <dd className="text-sm font-medium text-ink-800">{value}</dd>
      </div>
    </div>
  );
}
