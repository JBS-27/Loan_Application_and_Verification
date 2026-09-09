"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState, Skeleton } from "@/components/common/EmptyState";
import { ResultBadge, StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDateTime } from "@/lib/format";
import type { DocumentDTO } from "@/lib/types";

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const [doc, setDoc] = useState<DocumentDTO | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/documents/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setDoc(json.document);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  if (error) return <EmptyState title="Document not found" description={error} />;
  if (!doc) return <Skeleton className="h-80" />;

  const checks = [
    ["Document present", "PASS", "A file is attached to this application."],
    ["Name matches application", doc.extracted?.name ? "PASS" : "PENDING", doc.extracted?.name || "No extracted name"],
    ["Date valid", doc.extracted?.date ? "PASS" : "PENDING", doc.extracted?.date || "No date detected"],
    ["Required fields detected", doc.extracted ? "PASS" : "PENDING", "Simulated field extraction"],
    ["Document quality acceptable", doc.qualityOk ? "PASS" : "WARNING", doc.qualityOk ? "Quality looks acceptable" : "Quality flagged"],
    ["Information consistency", doc.status === "Failed" ? "FAIL" : "WARNING", "Compare against the application file"],
  ] as const;

  async function updateStatus(status: string) {
    setBusy(true);
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return push(json.error || "Update failed", "error");
    push("Document status updated", "success");
    load();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="surface-card overflow-hidden">
        <div className="border-b px-5 py-4">
          <p className="text-xs text-muted-foreground">Demo document preview</p>
          <h1 className="text-lg font-semibold">{doc.fileName}</h1>
          <p className="text-sm text-muted-foreground">
            {doc.documentType} · uploaded {formatDateTime(doc.uploadedAt)}
          </p>
        </div>
        <div className="bg-muted/40 p-4">
          {doc.fileUrl?.startsWith("data:image") || doc.mimeType?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.fileUrl} alt={doc.fileName} className="mx-auto max-h-[32rem] rounded-lg bg-white" />
          ) : (
            <div className="rounded-lg bg-white p-8 text-center text-sm text-muted-foreground">
              Preview is unavailable for this file type. The file is stored for this demo session.
            </div>
          )}
        </div>
      </section>
      <section className="surface-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Verification panel</h2>
          <StatusBadge status={doc.status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          These are simulated checks. LendFlow is not connected to a bureau, OCR vendor, or government ID service.
        </p>
        <div className="mt-4 space-y-2">
          {checks.map(([label, result, message]) => (
            <div key={label} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{label}</p>
                <ResultBadge result={result} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{message}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Demo confidence score: <span className="font-medium text-foreground">{doc.confidence ?? 72}%</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => updateStatus("Verified")}>Mark verified</Button>
          <Button variant="outline" disabled={busy} onClick={() => updateStatus("Needs Review")}>Needs review</Button>
          <Button variant="destructive" disabled={busy} onClick={() => updateStatus("Failed")}>Mark failed</Button>
        </div>
        <Link href={`/applications/${doc.loan}`} className="mt-4 inline-block text-sm font-medium text-primary">
          Back to application
        </Link>
      </section>
    </div>
  );
}
