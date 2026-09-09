import type {
  APPLICATION_STATUSES,
  CHECK_RESULTS,
  DECISION_STATES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  LOAN_TYPES,
  PIPELINE_STAGES,
} from "./constants";

export type Role = "customer" | "staff" | "admin" | "loan_officer" | "reviewer";
export type DisplayRole = "Loan Officer" | "Reviewer" | "Admin";

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type LoanType = (typeof LOAN_TYPES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type CheckResult = (typeof CHECK_RESULTS)[number];
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export type DecisionState = (typeof DECISION_STATES)[number];

export type SessionUser = {
  _id: string;
  name: string;
  email: string;
  role: Role;
};

export type ApplicantProfile = {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  employmentType: string;
};

export type FinancialProfile = {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  existingEmis?: number;
  requestedLoanAmount?: number;
  loanTenure?: number;
  employmentDurationMonths?: number;
};

export type ApplicationDecision = {
  status?: DecisionState;
  reason?: string;
  reviewerId?: string;
  reviewerName?: string;
  timestamp?: string;
  outstandingIssues?: string[];
};

export type ApplicationDTO = {
  _id: string;
  applicationNumber: string;
  user?: { _id: string; name: string; email: string };
  loanType: string;
  purpose?: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  status: ApplicationStatus;
  pipelineStage: PipelineStage;
  priority: "Normal" | "High";
  isDemo?: boolean;
  applicant: ApplicantProfile;
  financial: FinancialProfile;
  verificationScore?: number;
  riskLevel?: "Low" | "Medium" | "High";
  assignedTo?: { _id: string; name: string; email: string; role?: string } | null;
  decision?: ApplicationDecision | null;
  requestedInfo?: string[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  dueAt?: string;
  issueCount?: number;
  openIssueCount?: number;
};

export type DocumentDTO = {
  _id: string;
  loan: string;
  user?: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  status: DocumentStatus;
  confidence?: number;
  reviewer?: { _id: string; name: string } | null;
  issueCount?: number;
  extracted?: {
    name?: string;
    date?: string;
    income?: number;
    address?: string;
    employer?: string;
  };
  qualityOk?: boolean;
  isDemo?: boolean;
  uploadedAt: string;
};

export type VerificationCheckDTO = {
  _id: string;
  loan: string;
  code: string;
  category: IssueCategory;
  label: string;
  result: CheckResult;
  message: string;
  section: string;
  createdAt: string;
};

export type IssueDTO = {
  _id: string;
  loan: string;
  applicationNumber?: string;
  applicantName?: string;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  source: string;
  status: IssueStatus;
  assignedTo?: { _id: string; name: string } | null;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditEventDTO = {
  _id: string;
  loan?: string;
  applicationNumber?: string;
  actorId?: string;
  actorName: string;
  action: string;
  details: string;
  createdAt: string;
};
