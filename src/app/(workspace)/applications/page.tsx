"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, Skeleton } from "@/components/common/EmptyState";
import { RiskBadge, StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APPLICATION_STATUSES, LOAN_TYPES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ApplicationDTO } from "@/lib/types";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loanType, setLoanType] = useState("all");
  const [risk, setRisk] = useState("all");
  const [from, setFrom] = useState("");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const pageSize = 8;

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (loanType !== "all") params.set("loanType", loanType);
    if (risk !== "all") params.set("risk", risk);
    setLoading(true);
    fetch(`/api/applications?${params}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setApplications(json.applications || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, status, loanType, risk]);

  const filtered = useMemo(() => {
    let rows = [...applications];
    if (from) {
      const start = new Date(from).getTime();
      rows = rows.filter((row) => new Date(row.createdAt).getTime() >= start);
    }
    rows.sort((a, b) => {
      if (sort === "amount") return b.principalAmount - a.principalAmount;
      if (sort === "applicant") return a.applicant.fullName.localeCompare(b.applicant.fullName);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return rows;
  }, [applications, from, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q, status, loanType, risk, from, sort]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        description="Search, filter, and open files across the verification pipeline."
        actions={
          <Link href="/applications/new">
            <Button>New application</Button>
          </Link>
        }
      />

      <div className="surface-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, or ID"
            className="h-10 xl:col-span-2"
            aria-label="Search applications"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={loanType} onChange={(e) => setLoanType(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="all">All loan types</option>
            {LOAN_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="all">All risk</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" aria-label="From date" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2">
            <option value="updated">Sort by last update</option>
            <option value="amount">Sort by amount</option>
            <option value="applicant">Sort by applicant</option>
          </select>
          <p className="text-muted-foreground">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
            {selected.length ? ` · ${selected.length} selected` : ""}
          </p>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : error ? (
          <EmptyState title="Could not load applications" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No applications match"
            description="Try clearing filters or create a new application."
            action={
              <Link href="/applications/new">
                <Button>New application</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={rows.every((row) => selected.includes(row._id)) && rows.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelected([...new Set([...selected, ...rows.map((row) => row._id)])]);
                          else setSelected(selected.filter((id) => !rows.some((row) => row._id === id)));
                        }}
                      />
                    </th>
                    <th className="px-3 py-2 font-medium">Application</th>
                    <th className="px-3 py-2 font-medium">Applicant</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">Issues</th>
                    <th className="px-4 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((app) => (
                    <tr key={app._id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${app.applicationNumber}`}
                          checked={selected.includes(app._id)}
                          onChange={(e) =>
                            setSelected((current) =>
                              e.target.checked ? [...current, app._id] : current.filter((id) => id !== app._id)
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/applications/${app._id}`} className="font-medium text-primary">
                          {app.applicationNumber}
                        </Link>
                        {app.isDemo ? <span className="ml-2 text-[11px] text-muted-foreground">Demo</span> : null}
                      </td>
                      <td className="px-3 py-3">{app.applicant.fullName || "—"}</td>
                      <td className="px-3 py-3">{app.loanType}</td>
                      <td className="num px-3 py-3">{formatCurrency(app.principalAmount)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-3 py-3">
                        <RiskBadge level={app.riskLevel} />
                      </td>
                      <td className="px-3 py-3">{app.openIssueCount ?? 0}</td>
                      <td className="px-4 py-3">{formatDate(app.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {rows.map((app) => (
                <Link key={app._id} href={`/applications/${app._id}`} className="block rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{app.applicant.fullName || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{app.applicationNumber}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span>{app.loanType}</span>
                    <span className="num font-medium">{formatCurrency(app.principalAmount)}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button variant="outline" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
