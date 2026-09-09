import { Issue } from "@/models/Issue";
import { VerificationCheck } from "@/models/VerificationCheck";
import { REQUIRED_DOCUMENTS, VERIFICATION_WINDOW_DAYS } from "./constants";
import { isValidEmail } from "./format";
import { mapApplicant, mapDocument, mapFinancial } from "./application-map";
import type { CheckResult, DocumentDTO, IssueCategory } from "./types";
export { categorySummary } from "./verification-summary";

type CheckInput = {
  code: string;
  category: IssueCategory;
  label: string;
  result: CheckResult;
  message: string;
  section: string;
  issue?: {
    severity: "HIGH" | "MEDIUM" | "LOW";
    source: string;
  };
};

function namesSimilar(a?: string, b?: string) {
  if (!a || !b) return false;
  const clean = (value: string) =>
    value.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  const left = clean(a);
  const right = clean(b);
  if (!left.length || !right.length) return false;
  const overlap = left.filter((part) => right.includes(part));
  return overlap.length >= Math.min(2, Math.min(left.length, right.length));
}

function docDateWithinWindow(dateValue?: string, windowDays = VERIFICATION_WINDOW_DAYS) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return age <= windowDays;
}

export function evaluateApplication(loan: Record<string, unknown>, documentsRaw: Record<string, unknown>[]) {
  const applicant = mapApplicant(loan);
  const financial = mapFinancial(loan);
  const documents = documentsRaw.map(mapDocument);
  const byType = new Map(documents.map((doc) => [doc.documentType, doc]));
  const identity = byType.get("Identity Proof");
  const address = byType.get("Address Proof");
  const income = byType.get("Income Proof");
  const bank = byType.get("Bank Statement");
  const employment = byType.get("Employment Proof");

  const checks: CheckInput[] = [];

  const push = (check: CheckInput) => checks.push(check);

  push({
    code: "ID_NAME",
    category: "Identity",
    label: "Applicant name present",
    result: applicant.fullName ? "PASS" : "FAIL",
    message: applicant.fullName
      ? "Full name is recorded on the application."
      : "Applicant name is missing.",
    section: "applicant",
    issue: applicant.fullName ? undefined : { severity: "HIGH", source: "Applicant details" },
  });

  push({
    code: "ID_DOB",
    category: "Identity",
    label: "Date of birth present",
    result: applicant.dateOfBirth ? "PASS" : "FAIL",
    message: applicant.dateOfBirth
      ? "Date of birth is recorded."
      : "Date of birth is missing.",
    section: "applicant",
    issue: applicant.dateOfBirth ? undefined : { severity: "MEDIUM", source: "Applicant details" },
  });

  push({
    code: "CT_PHONE",
    category: "Contact",
    label: "Phone present",
    result: applicant.phone ? "PASS" : "FAIL",
    message: applicant.phone ? "Phone number is recorded." : "Phone number is missing.",
    section: "applicant",
    issue: applicant.phone ? undefined : { severity: "MEDIUM", source: "Applicant details" },
  });

  push({
    code: "CT_EMAIL",
    category: "Contact",
    label: "Email valid",
    result: applicant.email && isValidEmail(applicant.email) ? "PASS" : "FAIL",
    message:
      applicant.email && isValidEmail(applicant.email)
        ? "Email format is valid."
        : "A valid email address is required.",
    section: "applicant",
    issue:
      applicant.email && isValidEmail(applicant.email)
        ? undefined
        : { severity: "MEDIUM", source: "Applicant details" },
  });

  push({
    code: "CT_ADDRESS",
    category: "Contact",
    label: "Address present",
    result: applicant.address ? "PASS" : "FAIL",
    message: applicant.address ? "Residential address is recorded." : "Address is missing.",
    section: "applicant",
    issue: applicant.address ? undefined : { severity: "MEDIUM", source: "Applicant details" },
  });

  const incomeValue = financial.monthlyIncome ?? 0;
  push({
    code: "FN_INCOME",
    category: "Financial",
    label: "Income entered",
    result: incomeValue > 0 ? "PASS" : "FAIL",
    message: incomeValue > 0 ? "Monthly income is recorded." : "Monthly income is missing.",
    section: "financials",
    issue: incomeValue > 0 ? undefined : { severity: "HIGH", source: "Financial profile" },
  });

  const requested = financial.requestedLoanAmount || Number(loan.principalAmount || 0);
  const incomeMultiple = incomeValue > 0 ? requested / incomeValue : Infinity;
  let amountResult: CheckResult = "PENDING";
  let amountMessage = "Income is needed before this check can run.";
  if (incomeValue > 0) {
    if (incomeMultiple > 48) {
      amountResult = "FAIL";
      amountMessage = `Requested amount is ${incomeMultiple.toFixed(1)}× monthly income.`;
    } else if (incomeMultiple > 24) {
      amountResult = "WARNING";
      amountMessage = `Requested amount is ${incomeMultiple.toFixed(1)}× monthly income and needs review.`;
    } else {
      amountResult = "PASS";
      amountMessage = "Requested amount is within a reasonable income multiple.";
    }
  }
  push({
    code: "FN_AMOUNT",
    category: "Financial",
    label: "Loan amount vs income",
    result: amountResult,
    message: amountMessage,
    section: "financials",
    issue:
      amountResult === "FAIL" || amountResult === "WARNING"
        ? { severity: amountResult === "FAIL" ? "HIGH" : "MEDIUM", source: "Financial profile" }
        : undefined,
  });

  push({
    code: "FN_OBLIGATIONS",
    category: "Financial",
    label: "Existing obligations captured",
    result: financial.existingEmis === undefined ? "WARNING" : "PASS",
    message:
      financial.existingEmis === undefined
        ? "Existing EMIs were not captured."
        : "Existing EMIs are recorded.",
    section: "financials",
    issue:
      financial.existingEmis === undefined
        ? { severity: "LOW", source: "Financial profile" }
        : undefined,
  });

  const employmentMonths = financial.employmentDurationMonths;
  push({
    code: "FN_EMPLOYMENT",
    category: "Financial",
    label: "Employment duration",
    result: employmentMonths && employmentMonths > 0 ? "PASS" : "WARNING",
    message:
      employmentMonths && employmentMonths > 0
        ? "Employment duration is recorded."
        : "Employment duration is missing.",
    section: "financials",
    issue:
      employmentMonths && employmentMonths > 0
        ? undefined
        : { severity: "LOW", source: "Financial profile" },
  });

  for (const type of REQUIRED_DOCUMENTS) {
    const doc = byType.get(type);
    push({
      code: `DOC_${type.replace(/\s+/g, "_").toUpperCase()}`,
      category: "Documents",
      label: `${type} present`,
      result: doc ? "PASS" : "FAIL",
      message: doc ? `${type} has been uploaded.` : `${type} is missing.`,
      section: "documents",
      issue: doc ? undefined : { severity: "HIGH", source: "Document checklist" },
    });
  }

  const optionalDocs: DocumentDTO[] = [bank, employment].filter(Boolean) as DocumentDTO[];
  push({
    code: "DOC_OPTIONAL",
    category: "Documents",
    label: "Supporting documents",
    result: optionalDocs.length >= 2 ? "PASS" : optionalDocs.length === 1 ? "WARNING" : "PENDING",
    message:
      optionalDocs.length >= 2
        ? "Bank statement and employment proof are present."
        : optionalDocs.length === 1
          ? "One supporting document is still outstanding."
          : "Bank statement and employment proof have not been uploaded.",
    section: "documents",
    issue:
      optionalDocs.length >= 2
        ? undefined
        : { severity: "MEDIUM", source: "Document checklist" },
  });

  const qualityDocs = documents.filter((doc) => doc.qualityOk === false);
  push({
    code: "DOC_QUALITY",
    category: "Documents",
    label: "Document quality acceptable",
    result: documents.length === 0 ? "PENDING" : qualityDocs.length ? "WARNING" : "PASS",
    message:
      documents.length === 0
        ? "No documents available to assess quality."
        : qualityDocs.length
          ? `${qualityDocs.length} document(s) have quality concerns.`
          : "Uploaded documents meet the quality threshold.",
    section: "documents",
    issue: qualityDocs.length ? { severity: "MEDIUM", source: "Document quality" } : undefined,
  });

  const dated = [income, bank].filter(Boolean) as DocumentDTO[];
  const stale = dated.filter((doc) => docDateWithinWindow(doc.extracted?.date) === false);
  push({
    code: "DOC_WINDOW",
    category: "Documents",
    label: "Document dates in verification window",
    result: dated.length === 0 ? "PENDING" : stale.length ? "WARNING" : "PASS",
    message: stale.length
      ? "One or more income/bank documents are older than the configured verification window."
      : dated.length
        ? "Income and bank document dates are within the verification window."
        : "Document dates are not available yet.",
    section: "documents",
    issue: stale.length ? { severity: "MEDIUM", source: "Document dates" } : undefined,
  });

  if (identity?.extracted?.name && applicant.fullName) {
    const match = namesSimilar(identity.extracted.name, applicant.fullName);
    push({
      code: "CS_NAME_ID",
      category: "Consistency",
      label: "Name matches identity proof",
      result: match ? "PASS" : "FAIL",
      message: match
        ? "Applicant name matches the identity document."
        : `Identity proof name "${identity.extracted.name}" differs from the application.`,
      section: "documents",
      issue: match ? undefined : { severity: "HIGH", source: "Identity proof" },
    });
  } else {
    push({
      code: "CS_NAME_ID",
      category: "Consistency",
      label: "Name matches identity proof",
      result: "PENDING",
      message: "Identity proof name is not available for comparison.",
      section: "documents",
    });
  }

  if (bank?.extracted?.name && applicant.fullName) {
    const match = namesSimilar(bank.extracted.name, applicant.fullName);
    push({
      code: "CS_NAME_BANK",
      category: "Consistency",
      label: "Name matches bank statement",
      result: match ? "PASS" : "FAIL",
      message: match
        ? "Applicant name matches the bank statement."
        : `Bank statement name "${bank.extracted.name}" differs from the application.`,
      section: "documents",
      issue: match ? undefined : { severity: "HIGH", source: "Bank statement" },
    });
  } else {
    push({
      code: "CS_NAME_BANK",
      category: "Consistency",
      label: "Name matches bank statement",
      result: "PENDING",
      message: "Bank statement name is not available for comparison.",
      section: "documents",
    });
  }

  if (income?.extracted?.income && incomeValue) {
    const delta = Math.abs(income.extracted.income - incomeValue) / incomeValue;
    const result: CheckResult = delta > 0.25 ? "FAIL" : delta > 0.1 ? "WARNING" : "PASS";
    push({
      code: "CS_INCOME",
      category: "Consistency",
      label: "Income consistency",
      result,
      message:
        result === "PASS"
          ? "Stated income is consistent with the income document."
          : `Income proof shows ${income.extracted.income.toLocaleString()} vs stated ${incomeValue.toLocaleString()}.`,
      section: "financials",
      issue:
        result === "PASS"
          ? undefined
          : { severity: result === "FAIL" ? "HIGH" : "MEDIUM", source: "Income proof" },
    });
  } else {
    push({
      code: "CS_INCOME",
      category: "Consistency",
      label: "Income consistency",
      result: "PENDING",
      message: "Income document figures are not available for comparison.",
      section: "financials",
    });
  }

  if (employment?.extracted?.employer && applicant.employmentType) {
    push({
      code: "CS_EMPLOYMENT",
      category: "Consistency",
      label: "Employment consistency",
      result: "PASS",
      message: "Employment details are present on both the application and supporting document.",
      section: "applicant",
    });
  } else {
    push({
      code: "CS_EMPLOYMENT",
      category: "Consistency",
      label: "Employment consistency",
      result: "PENDING",
      message: "Employment proof is needed before this check can complete.",
      section: "applicant",
    });
  }

  if (address?.extracted?.address && applicant.address) {
    const match = namesSimilar(address.extracted.address, applicant.address);
    push({
      code: "CS_ADDRESS",
      category: "Consistency",
      label: "Address consistency",
      result: match ? "PASS" : "WARNING",
      message: match
        ? "Address details are consistent across the application and proof."
        : "Address details differ between the application and address proof.",
      section: "applicant",
      issue: match ? undefined : { severity: "MEDIUM", source: "Address proof" },
    });
  } else {
    push({
      code: "CS_ADDRESS",
      category: "Consistency",
      label: "Address consistency",
      result: "PENDING",
      message: "Address proof is needed before this check can complete.",
      section: "applicant",
    });
  }

  const passed = checks.filter((c) => c.result === "PASS").length;
  const warnings = checks.filter((c) => c.result === "WARNING").length;
  const failed = checks.filter((c) => c.result === "FAIL").length;
  const pending = checks.filter((c) => c.result === "PENDING").length;
  const scored = checks.length - pending;
  const score = scored > 0 ? Math.round((passed / scored) * 100) : 0;

  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (failed > 0 || warnings >= 3) riskLevel = "High";
  else if (warnings > 0) riskLevel = "Medium";

  return { checks, passed, warnings, failed, pending, score, riskLevel };
}

export async function persistVerification(
  loanId: string,
  evaluation: ReturnType<typeof evaluateApplication>,
  options?: { replaceIssues?: boolean; assignedTo?: string; isDemo?: boolean }
) {
  await VerificationCheck.deleteMany({ loan: loanId });
  await VerificationCheck.insertMany(
    evaluation.checks.map((check) => ({
      loan: loanId,
      code: check.code,
      category: check.category,
      label: check.label,
      result: check.result,
      message: check.message,
      section: check.section,
    }))
  );

  if (options?.replaceIssues !== false) {
    await Issue.deleteMany({
      loan: loanId,
      status: { $in: ["Open", "Investigating"] },
      checkCode: { $exists: true },
    });

    const issues = evaluation.checks
      .filter((check) => check.issue)
      .map((check) => ({
        loan: loanId,
        severity: check.issue!.severity,
        category: check.category,
        message: check.message,
        source: check.issue!.source,
        status: "Open" as const,
        assignedTo: options?.assignedTo,
        checkCode: check.code,
        isDemo: options?.isDemo || false,
      }));

    if (issues.length) await Issue.insertMany(issues);
  }

  return evaluation;
}

