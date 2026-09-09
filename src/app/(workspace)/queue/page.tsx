"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, Skeleton } from "@/components/common/EmptyState";
import { RiskBadge, StatusBadge } from "@/components/status/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ApplicationDTO } from "@/lib/types";

export default function QueuePage() {
  const [applications, setApplications] = useState<ApplicationDTO[]>([]);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => setApplications(data.applications || []))
      .finally(() => setLoading(false));
  }, []);

  const rows = applications.filter((app) => {
    if (filter === "mine") return Boolean(app.assignedTo);
    if (filter === "high") return app.priority === "High" || app.riskLevel === "High";
    return ["Submitted", "Verification Pending", "Needs Review", "More Information Requested"].includes(app.status);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Verification queue"
        description="Files waiting for a reviewer to check documents, issues, and consistency."
      />
      <div className="flex flex-wrap gap-2">
        {[
          ["active", "Active"],
          ["mine", "Assigned"],
          ["high", "High priority"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1 text-sm ${filter === value ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-4"><Skeleton className="h-24" /></div>
        ) : rows.length === 0 ? (
          <EmptyState title="Queue is clear" description="No applications currently match this view." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Application</th>
                  <th className="px-3 py-2 font-medium">Applicant</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((app) => (
                  <tr key={app._id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{app.applicationNumber}</td>
                    <td className="px-3 py-3">{app.applicant.fullName}</td>
                    <td className="num px-3 py-3">{formatCurrency(app.principalAmount)}</td>
                    <td className="px-3 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-3 py-3"><RiskBadge level={app.riskLevel} /></td>
                    <td className="px-3 py-3">{formatDate(app.dueAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/applications/${app._id}?tab=Verification`} className="font-medium text-primary">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
