"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/EmptyState";
import { PIPELINE_STAGES } from "@/lib/constants";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <Skeleton className="h-64" />;

  const max = Math.max(...PIPELINE_STAGES.map((stage) => data.pipeline[stage] || 0), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Operational counts from the current book. These are verification metrics, not credit performance."
      />
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Applications", data.stats.total],
          ["Needs review", data.stats.needsReview],
          ["Verified", data.stats.verified],
          ["Avg hours", data.stats.avgVerificationHours],
        ].map(([label, value]) => (
          <div key={String(label)} className="surface-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="num mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <section className="surface-card p-5">
        <h2 className="font-semibold">Pipeline distribution</h2>
        <div className="mt-4 space-y-3">
          {PIPELINE_STAGES.map((stage) => {
            const value = data.pipeline[stage] || 0;
            return (
              <div key={stage}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{stage}</span>
                  <span className="num">{value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(value / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
