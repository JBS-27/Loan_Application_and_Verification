import { REQUIRED_DOCUMENTS } from "./constants";
import { normalizeStatus } from "./format";
import { idOf } from "./serialize";
import type {
  ApplicationDTO,
  ApplicantProfile,
  DocumentDTO,
  FinancialProfile,
  PipelineStage,
} from "./types";

const LEGACY_DOC_TYPE: Record<string, string> = {
  KYC: "Identity Proof",
  Other: "Employment Proof",
};

const LEGACY_DOC_STATUS: Record<string, DocumentDTO["status"]> = {
  Pending: "Uploaded",
  Rejected: "Failed",
};

export function pipelineForStatus(status: string): PipelineStage {
  const normalized = normalizeStatus(status);
  if (normalized === "Draft" || normalized === "Submitted") return "Received";
  if (normalized === "More Information Requested") return "Documents";
  if (normalized === "Verification Pending") return "Verification";
  if (normalized === "Needs Review") return "Review";
  return "Decision";
}

export function mapApplicant(loan: Record<string, unknown>): ApplicantProfile {
  const applicant = (loan.applicant || {}) as Partial<ApplicantProfile>;
  const user = loan.user as { name?: string; email?: string } | undefined;
  const details = (loan.applicantDetails || {}) as { employmentStatus?: string };
  return {
    fullName: applicant.fullName || user?.name || "",
    dateOfBirth: applicant.dateOfBirth || "",
    phone: applicant.phone || "",
    email: applicant.email || user?.email || "",
    address: applicant.address || "",
    employmentType: applicant.employmentType || details.employmentStatus || "",
  };
}

export function mapFinancial(loan: Record<string, unknown>): FinancialProfile {
  const financial = (loan.financial || {}) as Partial<FinancialProfile>;
  const details = (loan.applicantDetails || {}) as { income?: number };
  return {
    monthlyIncome: financial.monthlyIncome ?? details.income,
    monthlyExpenses: financial.monthlyExpenses,
    existingEmis: financial.existingEmis,
    requestedLoanAmount: financial.requestedLoanAmount ?? (loan.principalAmount as number),
    loanTenure: financial.loanTenure ?? (loan.tenureMonths as number),
    employmentDurationMonths:
      financial.employmentDurationMonths ?? (loan.employmentLengthMonths as number | undefined),
  };
}

export function mapApplication(
  loan: Record<string, unknown>,
  extras?: { issueCount?: number; openIssueCount?: number }
): ApplicationDTO {
  const user = loan.user as { _id?: unknown; name?: string; email?: string } | undefined;
  const assigned = loan.assignedTo as
    | { _id?: unknown; name?: string; email?: string; role?: string }
    | string
    | undefined;
  const decision = loan.decision as ApplicationDTO["decision"];
  const status = normalizeStatus(loan.status as string);

  return {
    _id: idOf(loan._id),
    applicationNumber:
      (loan.applicationNumber as string) || `LF-${idOf(loan._id).slice(-6).toUpperCase()}`,
    user: user
      ? { _id: idOf(user._id || user), name: user.name || "Unknown", email: user.email || "" }
      : undefined,
    loanType: String(loan.loanType || "Personal"),
    purpose: (loan.purpose as string) || "",
    principalAmount: Number(loan.principalAmount || 0),
    interestRate: Number(loan.interestRate || 0),
    tenureMonths: Number(loan.tenureMonths || 0),
    status,
    pipelineStage: (loan.pipelineStage as PipelineStage) || pipelineForStatus(status),
    priority: (loan.priority as "Normal" | "High") || "Normal",
    isDemo: Boolean(loan.isDemo),
    applicant: mapApplicant(loan),
    financial: mapFinancial(loan),
    verificationScore: loan.verificationScore as number | undefined,
    riskLevel: loan.riskLevel as ApplicationDTO["riskLevel"],
    assignedTo:
      assigned && typeof assigned === "object"
        ? {
            _id: idOf(assigned._id),
            name: assigned.name || "Unassigned",
            email: assigned.email || "",
            role: assigned.role,
          }
        : null,
    decision: decision
      ? {
          ...decision,
          timestamp: decision.timestamp
            ? new Date(decision.timestamp).toISOString()
            : undefined,
        }
      : null,
    requestedInfo: (loan.requestedInfo as string[]) || [],
    createdAt: new Date(loan.createdAt as string).toISOString(),
    updatedAt: new Date((loan.updatedAt as string) || (loan.createdAt as string)).toISOString(),
    submittedAt: loan.submittedAt ? new Date(loan.submittedAt as string).toISOString() : undefined,
    dueAt: loan.dueAt ? new Date(loan.dueAt as string).toISOString() : undefined,
    issueCount: extras?.issueCount,
    openIssueCount: extras?.openIssueCount,
  };
}

export function mapDocument(doc: Record<string, unknown>): DocumentDTO {
  const reviewer = doc.reviewer as { _id?: unknown; name?: string } | undefined;
  const rawType = String(doc.documentType || "Other");
  const rawStatus = String(doc.status || "Uploaded");
  return {
    _id: idOf(doc._id),
    loan: idOf(doc.loan),
    user: doc.user ? idOf(doc.user) : undefined,
    documentType: LEGACY_DOC_TYPE[rawType] || rawType,
    fileName: (doc.fileName as string) || "document",
    fileUrl: String(doc.fileUrl || ""),
    mimeType: (doc.mimeType as string) || "application/octet-stream",
    status: LEGACY_DOC_STATUS[rawStatus] || (rawStatus as DocumentDTO["status"]),
    confidence: doc.confidence as number | undefined,
    reviewer: reviewer?._id ? { _id: idOf(reviewer._id), name: reviewer.name || "Reviewer" } : null,
    issueCount: Number(doc.issueCount || 0),
    extracted: (doc.extracted as DocumentDTO["extracted"]) || {},
    qualityOk: doc.qualityOk !== false,
    isDemo: Boolean(doc.isDemo),
    uploadedAt: new Date((doc.uploadedAt as string) || Date.now()).toISOString(),
  };
}

export function documentCompleteness(documents: DocumentDTO[]) {
  const present = new Set(documents.map((doc) => doc.documentType));
  const missing = REQUIRED_DOCUMENTS.filter((type) => !present.has(type));
  const verified = documents.filter((doc) => doc.status === "Verified").length;
  return {
    required: REQUIRED_DOCUMENTS.length,
    uploaded: REQUIRED_DOCUMENTS.length - missing.length,
    missing,
    verified,
    percent: Math.round(((REQUIRED_DOCUMENTS.length - missing.length) / REQUIRED_DOCUMENTS.length) * 100),
  };
}

export async function nextApplicationNumber(LoanModel: unknown) {
  const model = LoanModel as { countDocuments: () => Promise<number> };
  const count = await model.countDocuments();
  return `LF-${new Date().getFullYear()}-${String(1001 + count).padStart(4, "0")}`;
}
