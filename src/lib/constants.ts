export const APP_NAME = "LendFlow";
export const APP_TAGLINE = "Verify smarter. Decide with confidence.";

export const DEMO_PASSWORD = "LendFlow!demo";

export const DEMO_ACCOUNTS = [
  {
    name: "Maya Ellison",
    email: "officer@lendflow.demo",
    role: "customer" as const,
    title: "Loan Officer",
  },
  {
    name: "Arjun Kapoor",
    email: "reviewer@lendflow.demo",
    role: "staff" as const,
    title: "Reviewer",
  },
  {
    name: "Helen Cho",
    email: "admin@lendflow.demo",
    role: "admin" as const,
    title: "Admin",
  },
] as const;

export const LOAN_TYPES = [
  "Home",
  "Auto",
  "Personal",
  "Education",
  "Business",
] as const;

export const EMPLOYMENT_TYPES = [
  "Salaried",
  "Self-Employed",
  "Business Owner",
  "Contract",
  "Retired",
] as const;

export const APPLICATION_STATUSES = [
  "Draft",
  "Submitted",
  "Verification Pending",
  "Needs Review",
  "Verified",
  "Rejected",
  "More Information Requested",
] as const;

export const LEGACY_STATUS_MAP: Record<string, (typeof APPLICATION_STATUSES)[number]> = {
  "Pending ML Assessment": "Verification Pending",
  "Credit Check": "Verification Pending",
  Approved: "Verified",
  Disbursed: "Verified",
};

export const PIPELINE_STAGES = [
  "Received",
  "Documents",
  "Verification",
  "Review",
  "Decision",
] as const;

export const DOCUMENT_TYPES = [
  "Identity Proof",
  "Address Proof",
  "Income Proof",
  "Bank Statement",
  "Employment Proof",
] as const;

export const REQUIRED_DOCUMENTS = [
  "Identity Proof",
  "Address Proof",
  "Income Proof",
] as const;

export const DOCUMENT_STATUSES = [
  "Missing",
  "Uploaded",
  "Processing",
  "Verified",
  "Needs Review",
  "Failed",
] as const;

export const CHECK_RESULTS = ["PASS", "WARNING", "FAIL", "PENDING"] as const;

export const ISSUE_SEVERITIES = ["HIGH", "MEDIUM", "LOW"] as const;

export const ISSUE_STATUSES = [
  "Open",
  "Investigating",
  "Resolved",
  "Dismissed",
] as const;

export const ISSUE_CATEGORIES = [
  "Identity",
  "Contact",
  "Financial",
  "Documents",
  "Consistency",
] as const;

export const DECISION_STATES = [
  "Verified",
  "Needs More Information",
  "Rejected",
] as const;

export const DEFAULT_RATES: Record<string, number> = {
  Home: 8.5,
  Auto: 10.5,
  Personal: 12.5,
  Education: 9.25,
  Business: 13.5,
};

export const VERIFICATION_WINDOW_DAYS = 90;
