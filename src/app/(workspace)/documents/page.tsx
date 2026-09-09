"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, Skeleton } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/status/StatusBadge";
import { formatDateTime } from "@/lib/format";
import type { DocumentDTO } from "@/lib/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => setDocuments(data.documents || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Documents"
        description="Every uploaded file across the book. Open a document to run the demo verification panel."
      />
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="p-4"><Skeleton className="h-24" /></div>
        ) : documents.length === 0 ? (
          <EmptyState title="No documents yet" description="Upload files from an application to see them here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Document</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Uploaded</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                  <th className="px-3 py-2 font-medium">Issues</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{doc.fileName}</p>
                      {doc.isDemo ? <p className="text-xs text-muted-foreground">Demo document</p> : null}
                    </td>
                    <td className="px-3 py-3">{doc.documentType}</td>
                    <td className="px-3 py-3">{formatDateTime(doc.uploadedAt)}</td>
                    <td className="px-3 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-3 py-3">{doc.confidence ?? "—"}%</td>
                    <td className="px-3 py-3">{doc.issueCount ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/documents/${doc._id}`} className="font-medium text-primary">
                        Open
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
