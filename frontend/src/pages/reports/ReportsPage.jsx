import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileDown,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Boxes,
  Wrench,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getDashboardSummary } from "../../api/dashboard.api";
import {
  PriorityBadge,
  IssueStatusBadge,
} from "../../components/ui/StatusBadge";
import { pickData } from "../../utils/safe";
import toast from "react-hot-toast";
import { cn } from "../../utils/cn";

const PIE_COLORS = [
  "#0f766e",
  "#0d9488",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#64748b",
  "#8b5cf6",
];

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getDashboardSummary();
      setSummary(
        pickData(data, "summary", null) || data?.data?.summary || null,
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load report data");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = summary?.cards || {};
  const issuesByStatus = Object.entries(summary?.issuesByStatus || {}).map(
    ([name, value]) => ({
      name,
      value: Number(value) || 0,
    }),
  );
  const issuesByPriority = Object.entries(summary?.issuesByPriority || {}).map(
    ([name, value]) => ({
      name,
      value: Number(value) || 0,
    }),
  );
  const assetsByCategory = (summary?.assetsByCategory || []).map((row) => ({
    name: row._id || row.category || row.name || "Other",
    value: row.count ?? row.value ?? 0,
  }));

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      // Tailwind v4 uses oklch(); html2canvas cannot parse it — inline RGB + strip CSS
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const win = clonedDoc.defaultView || window;
          const props = [
            "color",
            "background-color",
            "border-top-color",
            "border-right-color",
            "border-bottom-color",
            "border-left-color",
            "outline-color",
            "fill",
            "stroke",
            "box-shadow",
          ];
          clonedDoc.body.querySelectorAll("*").forEach((el) => {
            try {
              const cs = win.getComputedStyle(el);
              props.forEach((prop) => {
                const val = cs.getPropertyValue(prop);
                if (val) el.style.setProperty(prop, val);
              });
            } catch {
              /* ignore */
            }
          });
          clonedDoc
            .querySelectorAll('style, link[rel="stylesheet"]')
            .forEach((n) => n.remove());
        },
      });

      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.setFontSize(14);
      pdf.text("MaintainIQ – Operations Report", margin, 8);
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text(
        `Generated ${format(new Date(), "MMM d, yyyy HH:mm")}`,
        margin,
        13,
      );

      position = 16;
      pdf.addImage(img, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(img, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`MaintainIQ-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="card p-10 text-center text-ink-500">
        Report data unavailable.
        <button
          type="button"
          onClick={load}
          className="mt-3 block w-full text-brand-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Reports
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Operations snapshot — export as PDF for sharing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export PDF
          </button>
        </div>
      </div>

      <div
        ref={reportRef}
        className="space-y-5 rounded-xl bg-surface-muted p-1 sm:p-0"
      >
        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            icon={Boxes}
            label="Total assets"
            value={cards.totalAssets ?? cards.assets ?? "—"}
          />
          <Kpi
            icon={AlertTriangle}
            label="Open issues"
            value={cards.openIssues ?? cards.issuesOpen ?? "—"}
            tone="amber"
          />
          <Kpi
            icon={Activity}
            label="Critical open"
            value={cards.criticalIssues ?? cards.critical ?? "—"}
            tone="danger"
          />
          <Kpi
            icon={Wrench}
            label="Technicians"
            value={cards.technicians ?? cards.activeTechnicians ?? "—"}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Issues by status
            </h2>
            {issuesByStatus.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={issuesByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {issuesByStatus.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Issues by priority
            </h2>
            {issuesByPriority.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={issuesByPriority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {assetsByCategory.length > 0 && (
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Assets by category
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={assetsByCategory}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0d9488" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tables */}
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900">
              Critical / recent issues
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-5 py-2.5">Issue</th>
                  <th className="px-3 py-2.5">Priority</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Asset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(summary.criticalIssues?.length
                  ? summary.criticalIssues
                  : summary.recentIssues || []
                ).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-ink-400"
                    >
                      No issues to show
                    </td>
                  </tr>
                ) : (
                  (summary.criticalIssues?.length
                    ? summary.criticalIssues
                    : summary.recentIssues || []
                  ).map((iss) => (
                    <tr key={iss._id || iss.issueNumber}>
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-ink-900">
                          {iss.issueNumber}
                        </p>
                        <p className="text-xs text-ink-500 line-clamp-1">
                          {iss.title}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <PriorityBadge priority={iss.priority} />
                      </td>
                      <td className="px-3 py-2.5">
                        <IssueStatusBadge status={iss.status} />
                      </td>
                      <td className="px-5 py-2.5 text-ink-600">
                        {iss.asset?.name || iss.asset?.assetCode || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(summary.upcomingServices || []).length > 0 && (
          <div className="card overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-900">
                Upcoming services (30 days)
              </h2>
            </div>
            <ul className="divide-y divide-border">
              {summary.upcomingServices.map((a) => (
                <li
                  key={a._id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <span className="font-medium text-ink-800">
                    {a.name}{" "}
                    <span className="font-mono text-xs text-ink-400">
                      {a.assetCode}
                    </span>
                  </span>
                  <span className="text-xs text-ink-500">
                    {a.nextServiceDate
                      ? format(new Date(a.nextServiceDate), "MMM d, yyyy")
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          tone === "danger"
            ? "bg-red-50 text-red-600"
            : tone === "amber"
              ? "bg-amber-50 text-amber-700"
              : "bg-brand-50 text-brand-700",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-xl font-bold text-ink-900">{value}</p>
      </div>
    </div>
  );
}

function EmptyChart() {
  return <p className="py-16 text-center text-sm text-ink-400">No data</p>;
}
