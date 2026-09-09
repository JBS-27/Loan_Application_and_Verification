import { cn } from "@/lib/utils";
import { normalizeStatus } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Submitted: "bg-sky-50 text-sky-800",
  "Verification Pending": "bg-amber-50 text-amber-800",
  "Needs Review": "bg-orange-50 text-orange-800",
  Verified: "bg-emerald-50 text-emerald-800",
  Rejected: "bg-red-50 text-red-800",
  "More Information Requested": "bg-violet-50 text-violet-800",
};

const RISK_STYLES: Record<string, string> = {
  Low: "bg-emerald-50 text-emerald-800",
  Medium: "bg-amber-50 text-amber-800",
  High: "bg-red-50 text-red-800",
};

const RESULT_STYLES: Record<string, string> = {
  PASS: "bg-emerald-50 text-emerald-800",
  WARNING: "bg-amber-50 text-amber-800",
  FAIL: "bg-red-50 text-red-800",
  PENDING: "bg-slate-100 text-slate-700",
};

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-50 text-red-800",
  MEDIUM: "bg-amber-50 text-amber-800",
  LOW: "bg-slate-100 text-slate-700",
};

export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const value = normalizeStatus(status);
  return <Pill className={STATUS_STYLES[value] || STATUS_STYLES.Draft}>{value}</Pill>;
}

export function RiskBadge({ level }: { level?: string | null }) {
  if (!level) return <Pill className="bg-slate-100 text-slate-600">Not scored</Pill>;
  return <Pill className={RISK_STYLES[level] || RISK_STYLES.Low}>{level} risk</Pill>;
}

export function ResultBadge({ result }: { result: string }) {
  return <Pill className={RESULT_STYLES[result] || RESULT_STYLES.PENDING}>{result}</Pill>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Pill className={SEVERITY_STYLES[severity] || SEVERITY_STYLES.LOW}>{severity}</Pill>;
}
