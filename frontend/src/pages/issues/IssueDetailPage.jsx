import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  UserPlus,
  ChevronDown,
  Upload,
  Trash2,
  ImagePlus,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getIssueById,
  assignIssue,
  transitionStatus,
  updateIssue,
  uploadEvidence,
  deleteEvidence,
} from '../../api/issues.api';
import { getTechnicians } from '../../api/users.api';
import {
  ISSUE_STATUS,
  ISSUE_STATUS_TRANSITIONS,
  PRIORITY,
} from '../../constants';
import {
  IssueStatusBadge,
  PriorityBadge,
} from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isSupervisor, isTechnician } = useAuth();

  const [issue, setIssue] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [techId, setTechId] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [parts, setParts] = useState([{ name: '', quantity: '1', unitCost: '' }]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const canAssign = isAdmin || isSupervisor;
  const allowedNext = useMemo(() => {
    if (!issue) return [];
    return ISSUE_STATUS_TRANSITIONS[issue.status] || [];
  }, [issue]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getIssueById(id);
      const iss = data?.data?.issue;
      if (!iss) {
        toast.error('Issue data unavailable');
        navigate('/issues');
        return;
      }
      setIssue(iss);
      setInspectionNotes(iss.inspectionNotes || '');
      setMaintenanceNotes(iss.maintenanceNotes || '');
      setLaborCost(iss.laborCost != null ? String(iss.laborCost) : '');
      setLaborHours(iss.laborHours != null ? String(iss.laborHours) : '');
      if (iss.laborHours && iss.laborCost && Number(iss.laborHours) > 0) {
        setHourlyRate(String(Math.round((Number(iss.laborCost) / Number(iss.laborHours)) * 100) / 100));
      } else {
        setHourlyRate('');
      }
      if (iss.parts?.length) {
        setParts(
          iss.parts.map((p) => ({
            name: p.name || '',
            quantity: String(p.quantity ?? 1),
            unitCost: p.unitCost != null ? String(p.unitCost) : '',
          }))
        );
      } else {
        setParts([{ name: '', quantity: '1', unitCost: '' }]);
      }
      setTechId(iss.assignedTo?._id || '');
      setNextStatus('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Issue not found');
      navigate('/issues');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canAssign) return;
    getTechnicians()
      .then(({ data }) => setTechnicians(data?.data?.technicians || []))
      .catch(() => {});
  }, [canAssign]);


  const buildPartsPayload = () =>
    parts
      .map((row) => ({
        name: row.name.trim(),
        quantity: parseInt(row.quantity, 10) || 1,
        unitCost: parseFloat(row.unitCost) || 0,
      }))
      .filter((row) => row.name);

  const partsSubtotal = parts.reduce((sum, row) => {
    const q = parseInt(row.quantity, 10) || 0;
    const c = parseFloat(row.unitCost) || 0;
    return sum + q * c;
  }, 0);
  const laborNum = parseFloat(laborCost) || 0;
  const liveTotal = Math.round((partsSubtotal + laborNum) * 100) / 100;

  const syncLaborFromHoursRate = (hours, rate) => {
    const h = parseFloat(hours);
    const r = parseFloat(rate);
    if (!Number.isNaN(h) && !Number.isNaN(r) && h >= 0 && r >= 0) {
      setLaborCost(String(Math.round(h * r * 100) / 100));
    }
  };

  const updatePartRow = (index, field, value) => {
    setParts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addPartRow = () => {
    setParts((prev) => [...prev, { name: '', quantity: '1', unitCost: '' }]);
  };

  const removePartRow = (index) => {
    setParts((prev) =>
      prev.length <= 1 ? [{ name: '', quantity: '1', unitCost: '' }] : prev.filter((_, i) => i !== index)
    );
  };

  const handleAssign = async () => {
    if (!techId) {
      toast.error('Select a technician');
      return;
    }
    setBusy(true);
    try {
      const { data } = await assignIssue(id, techId);
      if (data?.data?.issue) setIssue(data.data.issue);
      toast.success('Technician assigned');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assign failed');
    } finally {
      setBusy(false);
    }
  };

  const handleTransition = async () => {
    if (!nextStatus) {
      toast.error('Select a new status');
      return;
    }
    if (
      nextStatus === ISSUE_STATUS.RESOLVED &&
      !maintenanceNotes.trim()
    ) {
      toast.error('Maintenance notes are required before resolving');
      return;
    }
    setBusy(true);
    try {
      const payload = { status: nextStatus };
      if (inspectionNotes.trim()) payload.inspectionNotes = inspectionNotes.trim();
      if (maintenanceNotes.trim()) payload.maintenanceNotes = maintenanceNotes.trim();
      if (laborHours !== '') payload.laborHours = parseFloat(laborHours) || 0;
      if (laborCost !== '') payload.laborCost = parseFloat(laborCost) || 0;
      const partsPayload = buildPartsPayload();
      if (partsPayload.length) payload.parts = partsPayload;
      const { data } = await transitionStatus(id, payload);
      if (data?.data?.issue) setIssue(data.data.issue);
      setNextStatus('');
      toast.success(`Status → ${nextStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveNotes = async () => {
    setBusy(true);
    try {
      const payload = {
        inspectionNotes: inspectionNotes.trim() || undefined,
        maintenanceNotes: maintenanceNotes.trim() || undefined,
        laborHours: laborHours !== '' ? parseFloat(laborHours) || 0 : undefined,
        laborCost: laborCost !== '' ? parseFloat(laborCost) || 0 : undefined,
        parts: buildPartsPayload(),
      };
      const { data } = await updateIssue(id, payload);
      if (data?.data?.issue) setIssue(data.data.issue);
      toast.success('Notes saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };


  const onFilesSelected = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length > 5) {
      toast.error('Maximum 5 files per upload');
      return;
    }
    setSelectedFiles(list);
  };

  const handleUploadEvidence = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Select at least one image or video');
      return;
    }
    setUploadingEvidence(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));
      const { data } = await uploadEvidence(id, formData);
      if (data?.data?.issue) setIssue(data.data.issue);
      setSelectedFiles([]);
      toast.success(`${data.data.uploaded?.length || selectedFiles.length} file(s) uploaded`);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Upload failed. Check Cloudinary config and file type/size.'
      );
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    if (!window.confirm('Remove this evidence file?')) return;
    try {
      const { data } = await deleteEvidence(id, evidenceId);
      if (data?.data?.issue) setIssue(data.data.issue);
      toast.success('Evidence removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!issue) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            to="/issues"
            className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-4 w-4" /> Issues
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
              {issue.title}
            </h1>
            <PriorityBadge priority={issue.priority} />
            <IssueStatusBadge status={issue.status} />
            {issue.isCritical && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/15">
                Critical
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {issue.issueNumber}
            {issue.reportedAt
              ? ` · Reported ${format(new Date(issue.reportedAt), 'MMM d, yyyy · HH:mm')}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="self-start rounded-lg border border-border bg-white p-2 text-ink-600 hover:bg-ink-50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Main */}
        <div className="space-y-4 xl:col-span-2">
          {/* Meta cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetaCard
              label="Asset"
              value={issue.asset?.name}
              sub={issue.asset?.assetCode}
              link={issue.asset?._id ? `/assets/${issue.asset._id}` : null}
            />
            <MetaCard
              label="Reporter"
              value={issue.reporterName || '—'}
              sub={issue.reporterEmail || issue.reporterPhone}
            />
            <MetaCard
              label="Assigned"
              value={issue.assignedTo?.name || 'Unassigned'}
              sub={issue.assignedTo?.email}
            />
            <MetaCard label="Category" value={issue.category || '—'} />
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
              {issue.description}
            {(issue.dueAt || issue.slaHours) && (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                issue.slaBreached
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : new Date(issue.dueAt) < new Date()
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-brand-100 bg-brand-50/50 text-brand-900'
              }`}>
                <span className="font-semibold">SLA</span>
                {issue.slaHours ? ` · ${issue.slaHours}h response window` : ''}
                {issue.dueAt
                  ? ` · due ${new Date(issue.dueAt).toLocaleString()}`
                  : ''}
                {issue.slaBreached ? ' · BREACHED' : ''}
                {issue.firstRespondedAt
                  ? ` · first response ${new Date(issue.firstRespondedAt).toLocaleString()}`
                  : ''}
              </div>
            )}
            </p>
          </div>

          {/* Notes */}
          <div className="card space-y-4 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink-900">Work notes</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Inspection notes
              </label>
              <textarea
                rows={3}
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                className={ta}
                placeholder="Findings from inspection…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Maintenance notes <span className="text-danger-600">*</span> (required to resolve)
              </label>
              <textarea
                rows={3}
                value={maintenanceNotes}
                onChange={(e) => setMaintenanceNotes(e.target.value)}
                className={ta}
                placeholder="Work performed…"
              />
            </div>

            {/* Labor: hours × rate → cost */}
            <div>
              <p className="mb-2 text-xs font-medium text-ink-500">Labor</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] text-ink-400">Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={laborHours}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLaborHours(v);
                      syncLaborFromHoursRate(v, hourlyRate);
                    }}
                    className={inp}
                    placeholder="1.5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-ink-400">Hourly rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHourlyRate(v);
                      syncLaborFromHoursRate(laborHours, v);
                    }}
                    className={inp}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-ink-400">Labor cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className={inp}
                    placeholder="Auto or override"
                  />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-ink-400">
                Cost fills from hours × rate; you can override labor cost.
              </p>
            </div>

            {/* Parts table */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-ink-500">Parts used</p>
                <button
                  type="button"
                  onClick={addPartRow}
                  className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
                >
                  + Add row
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead className="bg-ink-50 text-[11px] uppercase text-ink-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Part name</th>
                      <th className="w-20 px-2 py-2 font-medium">Qty</th>
                      <th className="w-24 px-2 py-2 font-medium">Unit cost</th>
                      <th className="w-12 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parts.map((row, index) => (
                      <tr key={index}>
                        <td className="px-2 py-1.5 sm:px-3">
                          <input
                            value={row.name}
                            onChange={(e) => updatePartRow(index, 'name', e.target.value)}
                            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                            placeholder="e.g. Air filter"
                          />
                        </td>
                        <td className="px-1 py-1.5 sm:px-2">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => updatePartRow(index, 'quantity', e.target.value)}
                            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                          />
                        </td>
                        <td className="px-1 py-1.5 sm:px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unitCost}
                            onChange={(e) => updatePartRow(index, 'unitCost', e.target.value)}
                            className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removePartRow(index)}
                            className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove part row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg bg-ink-50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-ink-600">
                Parts {partsSubtotal.toFixed(2)} + Labor {laborNum.toFixed(2)}
              </span>
              <span className="font-semibold text-ink-900">
                Total (preview): {liveTotal.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleSaveNotes}
              className="rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Save notes
            </button>
          </div>

          {/* Evidence gallery + upload */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink-900">
                Evidence ({issue.evidence?.length || 0})
              </h2>
              <p className="text-xs text-ink-400">
                JPEG, PNG, WebP, GIF, MP4, WebM · max 15 MB · up to 5 files
              </p>
            </div>

            {(issue.evidence?.length || 0) === 0 ? (
              <p className="mt-4 text-center text-sm text-ink-400">No evidence uploaded yet</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(issue.evidence || []).map((ev) => (
                  <div
                    key={ev._id || ev.public_id || ev.url}
                    className="group relative overflow-hidden rounded-lg border border-border"
                  >
                    <a href={ev.url} target="_blank" rel="noreferrer" className="block">
                      {ev.resource_type === 'video' || ev.url?.includes('/video/') ? (
                        <div className="flex h-28 items-center justify-center bg-ink-100 text-xs text-ink-500">
                          Video
                        </div>
                      ) : (
                        <img
                          src={ev.url}
                          alt=""
                          className="h-28 w-full object-cover"
                        />
                      )}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvidence(ev._id)}
                      className="absolute right-1.5 top-1.5 rounded-md bg-ink-900/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-border pt-4">
              <label className="mb-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-ink-50/50 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50/30">
                <ImagePlus className="h-6 w-6 text-ink-400" />
                <span className="text-sm font-medium text-ink-700">
                  {selectedFiles.length
                    ? `${selectedFiles.length} file(s) selected`
                    : 'Click to select photos or videos'}
                </span>
                <span className="text-xs text-ink-400">Field name: files (multipart)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={onFilesSelected}
                />
              </label>
              {selectedFiles.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-ink-500">
                  {selectedFiles.map((f) => (
                    <li key={f.name + f.size}>
                      {f.name} ({Math.round(f.size / 1024)} KB)
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                disabled={uploadingEvidence || selectedFiles.length === 0}
                onClick={handleUploadEvidence}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadingEvidence ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload evidence
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          {/* Status workflow */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900">Status workflow</h2>
            <ol className="mt-3 space-y-2">
              {Object.values(ISSUE_STATUS).map((s) => {
                const isCurrent = issue.status === s;
                const isPast =
                  Object.values(ISSUE_STATUS).indexOf(s) <
                  Object.values(ISSUE_STATUS).indexOf(issue.status);
                return (
                  <li
                    key={s}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      isCurrent
                        ? 'font-semibold text-brand-800'
                        : isPast
                          ? 'text-ink-500'
                          : 'text-ink-400'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        isCurrent
                          ? 'bg-brand-600'
                          : isPast
                            ? 'bg-ink-300'
                            : 'bg-ink-200'
                      )}
                    />
                    {s}
                  </li>
                );
              })}
            </ol>

            {allowedNext.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <label className="block text-xs font-medium text-ink-500">
                  Update status
                </label>
                <div className="relative">
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className={cn(inp, 'appearance-none pr-8')}
                  >
                    <option value="">Select next status</option>
                    {allowedNext.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                </div>
                <button
                  type="button"
                  disabled={busy || !nextStatus}
                  onClick={handleTransition}
                  className="w-full rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  {busy ? 'Updating…' : 'Update status'}
                </button>
              </div>
            )}
          </div>

          {/* Assign — only when workflow allows (Reported / Reopened) */}
          {canAssign && (
            <div className="card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <UserPlus className="h-4 w-4" />
                {issue.assignedTo ? 'Technician' : 'Assign technician'}
              </h2>

              {issue.assignedTo && (
                <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700">
                  Assigned to{' '}
                  <span className="font-semibold text-ink-900">
                    {issue.assignedTo.name}
                  </span>
                  {issue.assignedTo.email ? (
                    <span className="text-ink-500"> · {issue.assignedTo.email}</span>
                  ) : null}
                </p>
              )}

              {(issue.status === ISSUE_STATUS.REPORTED ||
                issue.status === ISSUE_STATUS.REOPENED) && (
                <>
                  <select
                    value={techId}
                    onChange={(e) => setTechId(e.target.value)}
                    className={cn(inp, 'mt-3')}
                  >
                    <option value="">Select technician</option>
                    {technicians.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !techId}
                    onClick={handleAssign}
                    className="mt-3 w-full rounded-lg bg-ink-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-ink-900 disabled:opacity-50"
                  >
                    {issue.assignedTo ? 'Reassign' : 'Assign'}
                  </button>
                </>
              )}

              {issue.assignedTo &&
                issue.status !== ISSUE_STATUS.REPORTED &&
                issue.status !== ISSUE_STATUS.REOPENED && (
                  <p className="mt-2 text-xs text-ink-400">
                    Reassign is only available when status is Reported or Reopened.
                  </p>
                )}
            </div>
          )}

          {/* AI triage (stored as issue.aiTriage on backend) */}
          {issue.aiTriage && (
            <div className="card border-brand-100 bg-brand-50/40 p-5">
              <h2 className="text-sm font-semibold text-brand-900">AI triage</h2>
              <p className="mt-1 text-xs text-brand-800/80">
                {issue.aiTriage.wasEditedByUser
                  ? 'AI suggested — human edited before accept'
                  : issue.aiTriage.wasAISuggested
                    ? 'AI suggested fields were used'
                    : issue.aiTriage.wasAccepted
                      ? 'AI suggestion accepted'
                      : 'AI analysis recorded'}
                {issue.aiTriage.source ? ` · source: ${issue.aiTriage.source}` : ''}
              </p>
              {(issue.aiTriage.title || issue.aiTriage.suggestedTitle) && (
                <p className="mt-2 text-sm font-medium text-ink-800">
                  Suggested title:{' '}
                  {issue.aiTriage.title || issue.aiTriage.suggestedTitle}
                </p>
              )}
              {(issue.aiTriage.possibleCauses || []).length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-ink-700">
                  {issue.aiTriage.possibleCauses.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
              {(issue.aiTriage.initialChecks || []).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-ink-600">Initial checks</p>
                  <ul className="mt-0.5 list-inside list-disc text-sm text-ink-700">
                    {issue.aiTriage.initialChecks.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value, sub, link }) {
  const content = (
    <>
      <p className="text-xs text-ink-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-ink-900">{value || '—'}</p>
      {sub ? <p className="truncate text-xs text-ink-500">{sub}</p> : null}
    </>
  );
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      {link ? (
        <Link to={link} className="block hover:text-brand-700">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}

const inp =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15';
const ta = inp + ' resize-y';
