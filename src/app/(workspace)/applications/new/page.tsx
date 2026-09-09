"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { Dropzone } from "@/components/documents/Dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOCUMENT_TYPES, EMPLOYMENT_TYPES, LOAN_TYPES } from "@/lib/constants";
import { calculateEmi, formatCurrencyExact, isValidEmail } from "@/lib/format";
import { useToast } from "@/components/providers/ToastProvider";

const STEPS = ["Applicant", "Financials", "Application", "Documents", "Review"];

type DocFile = { fileName: string; mimeType: string; fileUrl: string };

export default function NewApplicationPage() {
  const router = useRouter();
  const { push } = useToast();
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState("");
  const [rates, setRates] = useState<Record<string, number>>({});

  const [applicant, setApplicant] = useState({
    fullName: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    address: "",
    employmentType: "",
  });
  const [financial, setFinancial] = useState({
    monthlyIncome: "",
    monthlyExpenses: "",
    existingEmis: "",
    requestedLoanAmount: "",
    loanTenure: "",
    employmentDurationMonths: "",
  });
  const [details, setDetails] = useState({
    loanType: "Personal",
    purpose: "",
    requestedAmount: "",
    preferredTenure: "",
  });
  const [docs, setDocs] = useState<Record<string, DocFile | undefined>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setRates(data.settings?.rates || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const amount = Number(details.requestedAmount || financial.requestedLoanAmount || 0);
  const tenure = Number(details.preferredTenure || financial.loanTenure || 0);
  const rate = rates[details.loanType] ?? 12.5;
  const emi = useMemo(() => calculateEmi(amount, rate, tenure), [amount, rate, tenure]);

  function mark<T extends object>(setter: (value: T) => void) {
    return (value: T) => {
      setDirty(true);
      setter(value);
    };
  }

  const stepErrors = [
    !applicant.fullName || !applicant.dateOfBirth || !applicant.phone || !isValidEmail(applicant.email) || !applicant.address || !applicant.employmentType,
    !financial.monthlyIncome || !financial.monthlyExpenses || financial.existingEmis === "" || !financial.requestedLoanAmount || !financial.loanTenure,
    !details.loanType || !details.purpose || !details.requestedAmount || !details.preferredTenure,
    false,
    false,
  ];

  async function persist(submit: boolean) {
    setSaving(true);
    setError("");
    const payload = {
      applicant,
      financial: {
        monthlyIncome: Number(financial.monthlyIncome || 0),
        monthlyExpenses: Number(financial.monthlyExpenses || 0),
        existingEmis: Number(financial.existingEmis || 0),
        requestedLoanAmount: amount,
        loanTenure: tenure,
        employmentDurationMonths: Number(financial.employmentDurationMonths || 0),
      },
      loanType: details.loanType,
      purpose: details.purpose,
      submit,
    };

    try {
      const res = await fetch(draftId ? `/api/applications/${draftId}` : "/api/applications", {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const id = data.applicationId || data.loan?._id;
      setDraftId(id);
      setDirty(false);

      const uploads = Object.entries(docs).filter(([, file]) => file);
      for (const [documentType, file] of uploads) {
        await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loanId: id, documentType, ...file }),
        });
      }

      push(submit ? "Application submitted" : "Draft saved", "success");
      if (submit) router.push(`/applications/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="New application"
        description="Capture the file in five steps. You can save a draft at any time."
      />

      <ol className="grid grid-cols-5 gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className={`rounded-lg px-2 py-2 text-center text-xs font-medium ${index === step ? "bg-primary text-primary-foreground" : index < step ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
            <span className="hidden sm:inline">{index + 1}. {label}</span>
            <span className="sm:hidden">{index + 1}</span>
          </li>
        ))}
      </ol>

      <div className="surface-card p-5 sm:p-6">
        {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" id="fullName">
              <Input id="fullName" value={applicant.fullName} onChange={(e) => mark(setApplicant)({ ...applicant, fullName: e.target.value })} className="h-10" />
            </Field>
            <Field label="Date of birth *" id="dob">
              <Input id="dob" type="date" value={applicant.dateOfBirth} onChange={(e) => mark(setApplicant)({ ...applicant, dateOfBirth: e.target.value })} className="h-10" />
            </Field>
            <Field label="Phone *" id="phone">
              <Input id="phone" value={applicant.phone} onChange={(e) => mark(setApplicant)({ ...applicant, phone: e.target.value })} className="h-10" />
            </Field>
            <Field label="Email *" id="email">
              <Input id="email" type="email" value={applicant.email} onChange={(e) => mark(setApplicant)({ ...applicant, email: e.target.value })} className="h-10" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address *" id="address">
                <Input id="address" value={applicant.address} onChange={(e) => mark(setApplicant)({ ...applicant, address: e.target.value })} className="h-10" />
              </Field>
            </div>
            <Field label="Employment type *" id="employment">
              <select id="employment" value={applicant.employmentType} onChange={(e) => mark(setApplicant)({ ...applicant, employmentType: e.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm">
                <option value="">Select</option>
                {EMPLOYMENT_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monthly income *" id="income">
              <Input id="income" type="number" value={financial.monthlyIncome} onChange={(e) => mark(setFinancial)({ ...financial, monthlyIncome: e.target.value })} className="h-10" />
            </Field>
            <Field label="Monthly expenses *" id="expenses">
              <Input id="expenses" type="number" value={financial.monthlyExpenses} onChange={(e) => mark(setFinancial)({ ...financial, monthlyExpenses: e.target.value })} className="h-10" />
            </Field>
            <Field label="Existing EMIs *" id="emis">
              <Input id="emis" type="number" value={financial.existingEmis} onChange={(e) => mark(setFinancial)({ ...financial, existingEmis: e.target.value })} className="h-10" />
            </Field>
            <Field label="Requested loan amount *" id="amount">
              <Input id="amount" type="number" value={financial.requestedLoanAmount} onChange={(e) => {
                mark(setFinancial)({ ...financial, requestedLoanAmount: e.target.value });
                setDetails((current) => ({ ...current, requestedAmount: e.target.value }));
              }} className="h-10" />
            </Field>
            <Field label="Loan tenure (months) *" id="tenure">
              <Input id="tenure" type="number" value={financial.loanTenure} onChange={(e) => {
                mark(setFinancial)({ ...financial, loanTenure: e.target.value });
                setDetails((current) => ({ ...current, preferredTenure: e.target.value }));
              }} className="h-10" />
            </Field>
            <Field label="Employment duration (months)" id="empMonths">
              <Input id="empMonths" type="number" value={financial.employmentDurationMonths} onChange={(e) => mark(setFinancial)({ ...financial, employmentDurationMonths: e.target.value })} className="h-10" />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loan type *" id="type">
              <select id="type" value={details.loanType} onChange={(e) => mark(setDetails)({ ...details, loanType: e.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm">
                {LOAN_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Requested amount *" id="reqAmount">
              <Input id="reqAmount" type="number" value={details.requestedAmount} onChange={(e) => mark(setDetails)({ ...details, requestedAmount: e.target.value })} className="h-10" />
            </Field>
            <Field label="Preferred tenure (months) *" id="prefTenure">
              <Input id="prefTenure" type="number" value={details.preferredTenure} onChange={(e) => mark(setDetails)({ ...details, preferredTenure: e.target.value })} className="h-10" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Purpose *" id="purpose">
                <Input id="purpose" value={details.purpose} onChange={(e) => mark(setDetails)({ ...details, purpose: e.target.value })} className="h-10" />
              </Field>
            </div>
            {emi > 0 && (
              <div className="sm:col-span-2 rounded-lg bg-muted px-4 py-3 text-sm">
                Estimated EMI at {rate}%: <span className="num font-semibold">{formatCurrencyExact(emi)}</span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Identity, address, and income proofs are required for a complete file. Uploads stay in this demo database.
            </p>
            {DOCUMENT_TYPES.map((type) => (
              <div key={type} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{type}</span>
                  {docs[type] ? <span className="text-emerald-700">{docs[type]?.fileName}</span> : <span className="text-muted-foreground">Not uploaded</span>}
                </div>
                <Dropzone label={`Upload ${type}`} onFile={(file) => { setDirty(true); setDocs((current) => ({ ...current, [type]: file })); }} />
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-sm">
            <Summary title="Applicant" items={[
              ["Name", applicant.fullName],
              ["Email", applicant.email],
              ["Phone", applicant.phone],
              ["Address", applicant.address],
              ["Employment", applicant.employmentType],
            ]} />
            <Summary title="Loan" items={[
              ["Type", details.loanType],
              ["Purpose", details.purpose],
              ["Amount", details.requestedAmount],
              ["Tenure", `${details.preferredTenure} months`],
              ["Est. EMI", formatCurrencyExact(emi)],
            ]} />
            <Summary title="Documents" items={DOCUMENT_TYPES.map((type) => [type, docs[type]?.fileName || "Missing"])} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <Button variant="outline" onClick={() => persist(false)} disabled={saving}>
            {saving ? "Saving..." : "Save draft"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={step === 0 || saving} onClick={() => setStep((s) => s - 1)}>
              Previous
            </Button>
            {step < STEPS.length - 1 ? (
              <Button disabled={stepErrors[step] || saving} onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            ) : (
              <Button disabled={saving} onClick={() => persist(true)}>
                {saving ? "Submitting..." : "Submit for verification"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Summary({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="rounded-lg bg-muted/70 p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <dl className="space-y-1">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
