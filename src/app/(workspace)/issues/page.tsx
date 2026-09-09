"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, Skeleton } from "@/components/common/EmptyState";
import { SeverityBadge } from "@/components/status/StatusBadge";
import { formatDateTime } from "@/lib/format";
import { ISSUE_SEVERITIES, ISSUE_STATUSES } from "@/lib/constants";
import type { IssueDTO } from "@/lib/types";

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueDTO[]>([]);
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (severity !== "all") params.set("severity", severity);
    setLoading(true);
    fetch(`/api/issues?${params}`)
      .then((res) => res.json())
      .then((data) => setIssues(data.issues || []))
      .finally(() => setLoading(false));
  }, [status, severity]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Issues & flags"
        description="Every risk flag is tied to a rule, a document, or a reviewer note — never a hidden score."
      />
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
          <option value="all">All statuses</option>
          {ISSUE_STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
          <option value="all">All severities</option>
          {ISSUE_SEVERITIES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {loading ? (
          <Skeleton className="h-24" />
        ) : issues.length === 0 ? (
          <EmptyState title="No issues in this view" description="Adjust filters or open an application to create a flag." />
        ) : (
          issues.map((issue) => (
            <div key={issue._id} className="surface-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={issue.severity} />
                <span className="text-xs text-muted-foreground">{issue.category} · {issue.status}</span>
              </div>
              <p className="mt-2 font-medium">{issue.message}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {issue.applicantName || "Application"} · {issue.applicationNumber || ""} · {issue.source} · {formatDateTime(issue.createdAt)}
              </p>
              <Link href={`/applications/${issue.loan}?tab=Issues`} className="mt-2 inline-block text-sm font-medium text-primary">
                Open file
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
