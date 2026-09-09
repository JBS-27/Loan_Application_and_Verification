"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, Skeleton } from "@/components/common/EmptyState";
import { ActivityTimeline } from "@/components/common/ActivityTimeline";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { PIPELINE_STAGES } from "@/lib/constants";
import type { ApplicationDTO, AuditEventDTO } from "@/lib/types";

type DashboardData = {
  stats: {
    total: number;
    pending: number;
    verified: number;
    needsReview: number;
    rejected: number;
    avgVerificationHours: number;
  };
  pipeline: Record<string, number>;
  workload: { pending: number; assignedToMe: number; overdue: number; highPriority: number };
  recent: ApplicationDTO[];
  activity: AuditEventDTO[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err.message || "Unable to load dashboard"));
  }, []);

  if (error) {
    return <EmptyState title="Dashboard unavailable" description={error} />;
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total applications", value: data.stats.total },
    { label: "Pending verification", value: data.stats.pending },
    { label: "Verified", value: data.stats.verified },
    { label: "Needs review", value: data.stats.needsReview },
    { label: "Rejected / failed", value: data.stats.rejected },
    { label: "Avg. verification time", value: `${data.stats.avgVerificationHours}h` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations dashboard"
        description="See what needs attention before you open a file."
        actions={
          <Link href="/applications/new">
            <Button>New application</Button>
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="surface-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className="num mt-2 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="surface-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Verification pipeline</h2>
          <p className="text-xs text-muted-foreground">Received → Decision</p>
        </div>
        <div className="grid gap-2 md:grid-cols-5">
          {PIPELINE_STAGES.map((stage, index) => (
            <div key={stage} className="rounded-lg bg-muted/70 px-3 py-3">
              <p className="text-xs text-muted-foreground">
                {index + 1}. {stage}
              </p>
              <p className="num mt-1 text-xl font-semibold">{data.pipeline[stage] || 0}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.8fr]">
        <section className="surface-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-base font-semibold">Recent applications</h2>
            <Link href="/applications" className="text-sm font-medium text-primary">
              View all
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Create an application or load demo data from Settings."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-y bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Applicant</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Submitted</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Issues</th>
                    <th className="px-3 py-2 font-medium">Reviewer</th>
                    <th className="px-5 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((app) => (
                    <tr key={app._id} className="border-b last:border-0">
                      <td className="px-5 py-3 font-medium">{app.applicationNumber}</td>
                      <td className="px-3 py-3">{app.applicant.fullName || "—"}</td>
                      <td className="px-3 py-3">{app.loanType}</td>
                      <td className="num px-3 py-3">{formatCurrency(app.principalAmount)}</td>
                      <td className="px-3 py-3">{formatDate(app.submittedAt || app.createdAt)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-3 py-3">{app.openIssueCount ?? 0}</td>
                      <td className="px-3 py-3">{app.assignedTo?.name || "Unassigned"}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/applications/${app._id}`} className="font-medium text-primary">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="surface-card p-5">
            <h2 className="text-base font-semibold">Verification workload</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Pending", data.workload.pending],
                ["Assigned to me", data.workload.assignedToMe],
                ["Overdue", data.workload.overdue],
                ["High priority", data.workload.highPriority],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-muted/70 px-3 py-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="num mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <Link href="/queue" className="mt-4 inline-block text-sm font-medium text-primary">
              Open queue
            </Link>
          </section>
          <section className="surface-card p-5">
            <h2 className="mb-4 text-base font-semibold">Recent activity</h2>
            <ActivityTimeline events={data.activity} />
          </section>
        </div>
      </div>
    </div>
  );
}
