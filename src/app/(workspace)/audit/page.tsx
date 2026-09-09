"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, Skeleton } from "@/components/common/EmptyState";
import { formatDateTime } from "@/lib/format";

export default function AuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit trail"
        description="Every important action on an application is recorded with an actor, timestamp, and detail."
      />
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-4"><Skeleton className="h-24" /></div>
        ) : events.length === 0 ? (
          <EmptyState title="No audit events" description="Activity appears here after applications are created or reviewed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                  <th className="px-4 py-2 font-medium">Application</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event._id} className="border-b last:border-0">
                    <td className="px-4 py-3">{formatDateTime(event.createdAt)}</td>
                    <td className="px-3 py-3">{event.actorName}</td>
                    <td className="px-3 py-3 font-medium">{event.action}</td>
                    <td className="px-3 py-3 text-muted-foreground">{event.details}</td>
                    <td className="px-4 py-3">
                      {event.loan ? (
                        <Link href={`/applications/${event.loan}`} className="text-primary">
                          {event.applicationNumber || "Open"}
                        </Link>
                      ) : (
                        "—"
                      )}
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
