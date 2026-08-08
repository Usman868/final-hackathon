import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Wrench,
  MapPin,
  Calendar,
  Shield,
  Loader2,
  Sparkles,
  Check,
  Pencil,
  RotateCcw,
  AlertCircle,
  X,
  Layers,
  HeartPulse,
  Box,
} from "lucide-react";
import { format } from "date-fns";
import {
  getPublicAsset,
  reportPublicIssue,
  runTriage,
} from "../../api/public.api";
import {
  AssetStatusBadge,
  PriorityBadge,
} from "../../components/ui/StatusBadge";
import { ISSUE_CATEGORIES, PRIORITY } from "../../constants";
import toast from "react-hot-toast";
import { cn } from "../../utils/cn";

/**
 * Standalone public page – NO app sidebar.
 * Safe asset info + report flow with human-reviewed AI triage.
 */
export default function PublicAssetPage() {
  const { publicId } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getPublicAsset(publicId);
      const a = data?.data?.asset;
      if (!a) {
        setError("Asset data unavailable");
        setAsset(null);
        return;
      }
      setAsset(a);
    } catch (err) {
      setError(err.response?.data?.message || "Asset not found");
      setAsset(null);
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <PublicShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </PublicShell>
    );
  }

  if (error || !asset) {
    return (
      <PublicShell>
        <div className="card mx-auto max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold text-ink-900">
            Asset not found
          </h1>
          <p className="mt-1 text-sm text-ink-500">{error}</p>
        </div>
      </PublicShell>
    );
  }

  if (submitted) {
    return (
      <PublicShell>
        <div className="card mx-auto max-w-md p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink-900">
            Issue reported
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Thank you. Your report has been received.
          </p>
          <p className="mt-3 font-mono text-sm font-medium text-brand-700">
            {submitted.issueNumber}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Status: {submitted.status}
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(null);
              setShowReport(false);
              load();
            }}
            className="mt-6 text-sm font-medium text-brand-700 hover:underline"
          >
            Back to asset
          </button>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-lg space-y-4 sm:max-w-2xl">
        {/* Asset header card */}
        <div className="card overflow-hidden">
          <div className="border-b border-border bg-ink-50/80 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  {asset.organizationName || "Asset"}
                </p>
                <h1 className="mt-0.5 text-xl font-bold text-ink-900 sm:text-2xl">
                  {asset.name}
                </h1>
                <p className="mt-1 font-mono text-sm text-brand-700">
                  {asset.assetCode}
                </p>
              </div>
              <AssetStatusBadge status={asset.status} />
            </div>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6">
            <InfoRow icon={MapPin} label="Location" value={asset.location} />
            <InfoRow
              icon={Calendar}
              label="Last service"
              value={
                asset.lastServiceDate
                  ? format(new Date(asset.lastServiceDate), "MMM d, yyyy")
                  : "—"
              }
            />
            <InfoRow
              icon={Calendar}
              label="Next service"
              value={
                asset.nextServiceDate
                  ? format(new Date(asset.nextServiceDate), "MMM d, yyyy")
                  : "—"
              }
            />
            <InfoRow icon={Layers} label="Category" value={asset.category} />
            <InfoRow
              icon={HeartPulse}
              label="Condition"
              value={asset.condition || "—"}
            />
            <InfoRow
              icon={Box}
              label="Model"
              value={
                [asset.manufacturer, asset.model].filter(Boolean).join(" · ") ||
                "—"
              }
            />
          </div>

          {asset.description ? (
            <div className="border-t border-border px-5 py-4 sm:px-6">
              <p className="text-xs font-medium text-ink-400">About</p>
              <p className="mt-1 text-sm text-ink-700">{asset.description}</p>
            </div>
          ) : null}
        </div>

        {/* Safe history */}
        <div className="card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink-900">
              Activity history
            </h2>
            <p className="text-xs text-ink-400">Public-safe timeline only</p>
          </div>
          <ul className="divide-y divide-border">
            {(Array.isArray(asset.history) ? asset.history : []).length ===
            0 ? (
              <li className="px-5 py-8 text-center text-sm text-ink-400">
                No public activity yet
              </li>
            ) : (
              (Array.isArray(asset.history) ? asset.history : []).map((h) => (
                <li key={h._id} className="flex gap-3 px-5 py-3.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-800">{h.description}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {h.actorName || "System"}
                      {h.createdAt
                        ? ` · ${format(new Date(h.createdAt), "MMM d, yyyy")}`
                        : ""}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Report CTA or form */}
        {!showReport ? (
          <div className="card border-danger-100 bg-danger-50/30 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 shrink-0 text-danger-600" />
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    Found an issue with this asset?
                  </p>
                  <p className="text-xs text-ink-500">
                    No login required. AI helps structure your report — you
                    review before submit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={asset.isRetired || asset.status === "Retired"}
                onClick={() => setShowReport(true)}
                className="shrink-0 rounded-lg bg-danger-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Report issue
              </button>
            </div>
          </div>
        ) : (
          <ReportIssueForm
            asset={asset}
            publicId={publicId}
            onCancel={() => setShowReport(false)}
            onSuccess={(issue) => setSubmitted(issue)}
          />
        )}

        <p className="text-center text-xs text-ink-400">
          Managed with MaintainIQ ·{" "}
          <Link to="/login" className="text-brand-700 hover:underline">
            Staff login
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}

function PublicShell({ children }) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4 sm:max-w-2xl sm:px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
            <Wrench className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-ink-900">MaintainIQ</span>
          <span className="text-ink-300">|</span>
          <span className="text-xs text-ink-400">Public asset</span>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-border bg-surface-muted/60 p-3">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" /> : null}
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="truncate text-sm font-medium text-ink-800">{value}</p>
      </div>
    </div>
  );
}

/**
 * Multi-step: describe → AI triage → human review/edit → submit
 */
function ReportIssueForm({ asset, publicId, onCancel, onSuccess }) {
  const [step, setStep] = useState("form"); // form | review | submitting
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");

  // Editable triage fields (human can change)
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(PRIORITY.MEDIUM);
  const [category, setCategory] = useState("");
  const [possibleCauses, setPossibleCauses] = useState([]);
  const [initialChecks, setInitialChecks] = useState([]);
  const [triageMeta, setTriageMeta] = useState(null);
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestTriage = async () => {
    if (!description.trim() || description.trim().length < 10) {
      toast.error("Please describe the issue (at least 10 characters)");
      return;
    }
    setBusy(true);
    try {
      const { data } = await runTriage({
        complaint: description.trim(),
        publicId,
      });
      const t = data.data.triage;
      setTitle(t.title || "");
      setPriority(t.priority || PRIORITY.MEDIUM);
      setCategory(t.category || "");
      setPossibleCauses(t.possibleCauses || []);
      setInitialChecks(t.initialChecks || []);
      setTriageMeta(t);
      setEdited(false);
      setStep("review");
      toast.success(
        t.source === "openai"
          ? "AI suggestion ready — please review"
          : "Suggestion ready (offline fallback) — please review",
      );
    } catch (err) {
      // Still allow manual report without AI
      toast.error(
        err.response?.data?.message || "AI unavailable — continue manually",
      );
      setTitle(description.trim().slice(0, 80));
      setPriority(PRIORITY.MEDIUM);
      setCategory("");
      setPossibleCauses([]);
      setInitialChecks([]);
      setTriageMeta({ wasAISuggested: false, source: "none" });
      setStep("review");
    } finally {
      setBusy(false);
    }
  };

  const markEdited = () => setEdited(true);

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setBusy(true);
    setStep("submitting");
    try {
      const aiTriage = triageMeta
        ? {
            title,
            category,
            priority,
            possibleCauses,
            initialChecks,
            wasAISuggested: Boolean(triageMeta.wasAISuggested),
            wasEditedByUser: edited,
            wasAccepted: true,
            wasRejected: false,
            source: triageMeta.source,
            generatedAt: triageMeta.generatedAt,
          }
        : undefined;

      const { data } = await reportPublicIssue(publicId, {
        title: title.trim(),
        description: description.trim(),
        priority,
        category: category || undefined,
        reporterName: reporterName.trim() || undefined,
        reporterEmail: reporterEmail.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
        aiTriage,
      });
      onSuccess(data.data.issue);
      toast.success("Issue submitted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Submit failed");
      setStep("review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink-900">
            Report an issue
          </h2>
          <p className="text-xs text-ink-500">
            {asset.name} · {asset.assetCode}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {step === "form" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">
              What&apos;s wrong? *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Describe what you observed, when it started, and any safety concerns…"
              className={field}
            />
            <p className="mt-1 text-right text-xs text-ink-400">
              {description.length}/2000
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Your name
              </label>
              <input
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className={field}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Phone
              </label>
              <input
                value={reporterPhone}
                onChange={(e) => setReporterPhone(e.target.value)}
                className={field}
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500">
              Email
            </label>
            <input
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              className={field}
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={requestTriage}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Get AI suggestion & review
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(step === "review" || step === "submitting") && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
            <Sparkles className="h-3.5 w-3.5" />
            Review AI fields below. Edit anything before accepting.
            {edited && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                Edited by you
              </span>
            )}
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-ink-700">
              Title * <Pencil className="h-3 w-3 text-ink-400" />
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markEdited();
              }}
              className={field}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  markEdited();
                }}
                className={field}
              >
                {Object.values(PRIORITY).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  markEdited();
                }}
                className={field}
              >
                <option value="">Select…</option>
                {ISSUE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">
              Description *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={field}
            />
          </div>

          {possibleCauses.length > 0 && (
            <div className="rounded-xl border border-border bg-ink-50/80 p-3">
              <p className="text-xs font-semibold text-ink-700">
                Possible causes
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink-600">
                {possibleCauses.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {initialChecks.length > 0 && (
            <div className="rounded-xl border border-border bg-ink-50/80 p-3">
              <p className="text-xs font-semibold text-ink-700">
                Initial safety checks
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink-600">
                {initialChecks.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Accept & submit issue
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={requestTriage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              <RotateCcw className="h-4 w-4" /> Regenerate AI
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep("form")}
              className="rounded-lg px-3 py-2.5 text-sm text-ink-500 hover:text-ink-800"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const field =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15";
