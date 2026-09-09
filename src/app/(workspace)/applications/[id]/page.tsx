"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ActivityTimeline } from "@/components/common/ActivityTimeline";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, Skeleton } from "@/components/common/EmptyState";
import { Dropzone } from "@/components/documents/Dropzone";
import { ResultBadge, RiskBadge, SeverityBadge, StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/providers/ToastProvider";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { calculateEmi, formatCurrency, formatCurrencyExact, formatDate } from "@/lib/format";
import { categorySummary } from "@/lib/verification-summary";
import { documentCompleteness } from "@/lib/application-map";
import type { ApplicationDTO, DocumentDTO, IssueDTO, VerificationCheckDTO } from "@/lib/types";

const TABS = ["Overview", "Applicant", "Financials", "Documents", "Verification", "Issues", "Activity"] as const;

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { push } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [bundle, setBundle] = useState<any>(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [infoItems, setInfoItems] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<null | "Verified" | "Rejected" | "info">(null);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ role?: string } | null>(null);

  async function load() {
    const res = await fetch(`/api/applications/${params.id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setBundle(json);
  }

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam && TABS.includes(tabParam as (typeof TABS)[number])) {
      setTab(tabParam as (typeof TABS)[number]);
    }
    load().catch((err) => setError(err.message));
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setMe(data.user))
      .catch(() => {});
  }, [params.id]);

  const app: ApplicationDTO | undefined = bundle?.application;
  const documents: DocumentDTO[] = bundle?.documents || [];
  const checks: VerificationCheckDTO[] = bundle?.checks || [];
  const issues: IssueDTO[] = bundle?.issues || [];
  const canReview = me?.role === "staff" || me?.role === "admin" || me?.role === "reviewer";
  const completeness = useMemo(() => documentCompleteness(documents), [documents]);
  const summary = useMemo(() => categorySummary(checks), [checks]);
  const emi = app ? calculateEmi(app.principalAmount, app.interestRate, app.tenureMonths) : 0;

  if (error) {
    return (
      <EmptyState
        title="Application not found"
        description={error}
        action={
          <Link href="/applications">
            <Button>Back to applications</Button>
          </Link>
        }
      />
    );
  }

  if (!app) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const passed = checks.filter((c) => c.result === "PASS").length;
  const warnings = checks.filter((c) => c.result === "WARNING").length;
  const failed = checks.filter((c) => c.result === "FAIL").length;
  const pending = checks.filter((c) => c.result === "PENDING").length;

  async function act(path: string, body: unknown, success: string) {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      push(success, "success");
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="surface-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {app.applicationNumber} {app.isDemo ? "· Demo data" : ""}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{app.applicant.fullName || "Untitled applicant"}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={app.status} />
              <RiskBadge level={app.riskLevel} />
              <span className="text-sm text-muted-foreground">
                {app.loanType} · {formatCurrency(app.principalAmount)}
              </span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Assigned reviewer</p>
            <p className="font-medium text-foreground">{app.assignedTo?.name || "Unassigned"}</p>
            {canReview && (
              <Button
                variant="outline"
                className="mt-2"
                disabled={busy}
                onClick={() => act(`/api/applications/${app._id}/assign`, {}, "Assigned to you")}
              >
                Assign to me
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap ${tab === item ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <InfoCard title="Applicant" items={[
            ["Name", app.applicant.fullName],
            ["Email", app.applicant.email],
            ["Phone", app.applicant.phone],
            ["Employment", app.applicant.employmentType],
          ]} />
          <InfoCard title="Loan" items={[
            ["Type", app.loanType],
            ["Purpose", app.purpose || "—"],
            ["Amount", formatCurrency(app.principalAmount)],
            ["Tenure", `${app.tenureMonths} months`],
            ["Est. EMI", formatCurrencyExact(emi)],
          ]} />
          <InfoCard title="Financials" items={[
            ["Monthly income", formatCurrency(app.financial.monthlyIncome)],
            ["Expenses", formatCurrency(app.financial.monthlyExpenses)],
            ["Existing EMIs", formatCurrency(app.financial.existingEmis)],
            ["Employment duration", app.financial.employmentDurationMonths ? `${app.financial.employmentDurationMonths} mo` : "—"],
          ]} />
          <div className="surface-card p-4">
            <h3 className="font-semibold">Verification progress</h3>
            <p className="num mt-2 text-3xl font-semibold">{app.verificationScore ?? 0}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {passed} passed · {warnings} warnings · {failed} failed · {pending} pending
            </p>
          </div>
          <div className="surface-card p-4">
            <h3 className="font-semibold">Document completeness</h3>
            <p className="num mt-2 text-3xl font-semibold">{completeness.percent}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {completeness.uploaded}/{completeness.required} required documents
              {completeness.missing.length ? ` · Missing ${completeness.missing.join(", ")}` : ""}
            </p>
          </div>
          <div className="surface-card p-4">
            <h3 className="font-semibold">Decision status</h3>
            <p className="mt-2 text-sm">
              {app.decision?.status || "No verification decision yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {app.decision?.reason || "This is a verification outcome, not a loan approval."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Reviewer: {app.decision?.reviewerName || "—"} · {app.decision?.timestamp ? formatDate(app.decision.timestamp) : ""}
            </p>
          </div>
        </div>
      )}

      {tab === "Applicant" && (
        <div className="surface-card p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            {Object.entries({
              "Full name": app.applicant.fullName,
              "Date of birth": app.applicant.dateOfBirth,
              Phone: app.applicant.phone,
              Email: app.applicant.email,
              Address: app.applicant.address,
              "Employment type": app.applicant.employmentType,
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-medium">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {tab === "Financials" && (
        <div className="surface-card p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            {Object.entries({
              "Monthly income": formatCurrency(app.financial.monthlyIncome),
              "Monthly expenses": formatCurrency(app.financial.monthlyExpenses),
              "Existing EMIs": formatCurrency(app.financial.existingEmis),
              "Requested amount": formatCurrency(app.financial.requestedLoanAmount || app.principalAmount),
              Tenure: `${app.financial.loanTenure || app.tenureMonths} months`,
              "Employment duration": app.financial.employmentDurationMonths
                ? `${app.financial.employmentDurationMonths} months`
                : "Missing",
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {tab === "Documents" && (
        <div className="space-y-3">
          {DOCUMENT_TYPES.map((type) => {
            const doc = documents.find((item) => item.documentType === type);
            return (
              <div key={type} className="surface-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{type}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc ? `${doc.fileName} · ${doc.status} · confidence ${doc.confidence ?? "—"}%` : "Missing"}
                    </p>
                  </div>
                  {doc ? (
                    <Link href={`/documents/${doc._id}`} className="text-sm font-medium text-primary">
                      Open workspace
                    </Link>
                  ) : (
                    <div className="w-full sm:w-80">
                      <Dropzone
                        label={`Upload ${type}`}
                        onFile={async (file) => {
                          await fetch("/api/documents", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ loanId: app._id, documentType: type, ...file }),
                          });
                          push("Document uploaded", "success");
                          load();
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Verification" && (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-card p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase">Demo verification</p>
            <h3 className="mt-1 text-lg font-semibold">Verification health</h3>
            <p className="num mt-3 text-4xl font-semibold">{app.verificationScore ?? 0}%</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {passed} checks passed · {warnings} warnings · {failed} failed · {pending} pending
            </p>
            <div className="mt-4 space-y-2">
              {summary.map((item) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <span>{item.category}</span>
                  <ResultBadge result={item.result} />
                </div>
              ))}
            </div>
            {canReview && (
              <Button
                className="mt-4"
                disabled={busy}
                onClick={() => act(`/api/applications/${app._id}/verify`, {}, "Demo verification refreshed")}
              >
                Re-run demo checks
              </Button>
            )}
          </div>
          <div className="surface-card p-5">
            <h3 className="mb-3 font-semibold">Checks</h3>
            <div className="space-y-2">
              {checks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No checks yet. Submit the file or run verification.</p>
              ) : (
                checks.map((check) => (
                  <button
                    key={check._id}
                    type="button"
                    onClick={() => {
                      if (check.section === "applicant") setTab("Applicant");
                      else if (check.section === "financials") setTab("Financials");
                      else if (check.section === "documents") setTab("Documents");
                      else setTab("Overview");
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <span>
                      <span className="block text-sm font-medium">{check.label}</span>
                      <span className="block text-xs text-muted-foreground">{check.message}</span>
                    </span>
                    <ResultBadge result={check.result} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "Issues" && (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <EmptyState title="No issues" description="The rules engine has not raised any open items on this file." />
          ) : (
            issues.map((issue) => (
              <div key={issue._id} className="surface-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={issue.severity} />
                  <span className="text-xs text-muted-foreground">{issue.category} · {issue.status}</span>
                </div>
                <p className="mt-2 text-sm font-medium">{issue.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Source: {issue.source} · {formatDate(issue.createdAt)}
                </p>
                {canReview && issue.status !== "Resolved" && issue.status !== "Dismissed" && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        fetch(`/api/issues/${issue._id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "Investigating" }),
                        }).then(load)
                      }
                    >
                      Investigating
                    </Button>
                    <Button
                      onClick={() =>
                        fetch(`/api/issues/${issue._id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "Resolved", resolution: "Reviewed and accepted by officer." }),
                        }).then(() => {
                          push("Issue resolved", "success");
                          load();
                        })
                      }
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "Activity" && (
        <div className="surface-card p-5">
          <ActivityTimeline events={bundle.audit || []} />
        </div>
      )}

      {canReview && (
        <section className="surface-card p-5">
          <h2 className="text-base font-semibold">Review workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record a verification decision. This does not approve or decline a loan.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {summary.map((item) => (
              <div key={item.category} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>{item.category}</span>
                <ResultBadge result={item.result} />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Decision reason"
              className="min-h-20"
            />
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={infoItems.includes(type)}
                    onChange={(e) =>
                      setInfoItems((current) =>
                        e.target.checked ? [...current, type] : current.filter((item) => item !== type)
                      )
                    }
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => setConfirm("Verified")}>
              Approve verification
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setConfirm("info")}>
              Request more information
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => setConfirm("Rejected")}>
              Reject verification
            </Button>
          </div>
          <div className="mt-4 flex gap-2">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a review comment" className="h-10" />
            <Button
              variant="outline"
              disabled={!comment.trim() || busy}
              onClick={() =>
                act(`/api/applications/${app._id}/notes`, { content: comment }, "Comment added").then(() =>
                  setComment("")
                )
              }
            >
              Add comment
            </Button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === "Verified"
            ? "Approve verification?"
            : confirm === "Rejected"
              ? "Reject verification?"
              : "Request more information?"
        }
        description={
          confirm === "info"
            ? "This records a verification decision that more evidence is needed. It is not a loan decision."
            : "This records an application verification decision, not a credit approval."
        }
        confirmLabel="Confirm"
        tone={confirm === "Rejected" ? "danger" : "default"}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === "info") {
            act(
              `/api/applications/${app._id}/request-info`,
              { items: infoItems.length ? infoItems : ["Updated documents"], reason },
              "Information requested"
            );
          } else if (confirm) {
            act(
              `/api/applications/${app._id}/decision`,
              { status: confirm, reason: reason || `Verification ${confirm.toLowerCase()}` },
              "Decision recorded"
            );
          }
        }}
      />
    </div>
  );
}

function InfoCard({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="surface-card p-4">
      <h3 className="font-semibold">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
