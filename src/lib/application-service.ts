import mongoose from "mongoose";
import { Loan } from "@/models/Loan";
import { Document } from "@/models/Document";
import { Issue } from "@/models/Issue";
import { VerificationCheck } from "@/models/VerificationCheck";
import { AuditEvent } from "@/models/AuditEvent";
import { AppSettings } from "@/models/AppSettings";
import { DEFAULT_RATES } from "./constants";
import { mapApplication, mapDocument, nextApplicationNumber, pipelineForStatus } from "./application-map";
import { recordAudit } from "./audit";
import { evaluateApplication, persistVerification } from "./verification";
import { fetchRiskPrediction } from "./ml";
import type { SessionUser } from "./types";

export async function getSettings() {
  const settings = await AppSettings.findOne({ key: "default" }).lean();
  return {
    rates: settings?.rates || DEFAULT_RATES,
    verificationWindowDays: settings?.verificationWindowDays || 90,
  };
}

export async function issueCounts(loanIds: Array<string | mongoose.Types.ObjectId>) {
  if (!loanIds.length) return new Map<string, { issueCount: number; openIssueCount: number }>();
  const ids = loanIds.map((id) => new mongoose.Types.ObjectId(String(id)));
  const grouped = await Issue.aggregate([
    { $match: { loan: { $in: ids } } },
    {
      $group: {
        _id: "$loan",
        issueCount: { $sum: 1 },
        openIssueCount: {
          $sum: { $cond: [{ $in: ["$status", ["Open", "Investigating"]] }, 1, 0] },
        },
      },
    },
  ]);
  return new Map(
    grouped.map((row) => [
      String(row._id),
      { issueCount: row.issueCount, openIssueCount: row.openIssueCount },
    ])
  );
}

export async function listApplications(query: Record<string, unknown> = {}) {
  const loans = await Loan.find(query)
    .populate("user", "name email")
    .populate("assignedTo", "name email role")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
  const counts = await issueCounts(loans.map((loan) => loan._id));
  return loans.map((loan) =>
    mapApplication(loan as Record<string, unknown>, counts.get(String(loan._id)))
  );
}

export async function getApplicationBundle(id: string) {
  const loan = await Loan.findById(id)
    .populate("user", "name email")
    .populate("assignedTo", "name email role")
    .lean();
  if (!loan) return null;

  const [documents, checks, issues, audit, counts] = await Promise.all([
    Document.find({ loan: loan._id }).populate("reviewer", "name").lean(),
    VerificationCheck.find({ loan: loan._id }).lean(),
    Issue.find({ loan: loan._id }).populate("assignedTo", "name").sort({ createdAt: -1 }).lean(),
    AuditEvent.find({ loan: loan._id }).sort({ createdAt: -1 }).limit(50).lean(),
    issueCounts([loan._id]),
  ]);

  return {
    application: mapApplication(loan as Record<string, unknown>, counts.get(String(loan._id))),
    documents: documents.map((doc) => mapDocument(doc as Record<string, unknown>)),
    checks,
    issues,
    audit,
    rawLoan: loan,
  };
}

export async function createOrUpdateApplication(
  user: SessionUser,
  body: Record<string, unknown>,
  existingId?: string
) {
  const settings = await getSettings();
  const applicant = (body.applicant || {}) as Record<string, string>;
  const financial = (body.financial || {}) as Record<string, number | undefined>;
  const loanType = String(body.loanType || "Personal");
  const principalAmount = Number(
    financial.requestedLoanAmount || body.principalAmount || 0
  );
  const tenureMonths = Number(financial.loanTenure || body.tenureMonths || 12);
  const interestRate = Number(
    body.interestRate || settings.rates[loanType as keyof typeof settings.rates] || 12.5
  );
  const status = String(body.status || "Draft");
  const submit = Boolean(body.submit) || status === "Submitted";

  const payload = {
    user: existingId ? undefined : user._id,
    loanType,
    purpose: String(body.purpose || ""),
    principalAmount,
    interestRate,
    tenureMonths,
    status: submit ? "Submitted" : "Draft",
    pipelineStage: submit ? "Received" : "Received",
    priority: body.priority === "High" ? "High" : "Normal",
    applicant: {
      fullName: applicant.fullName || "",
      dateOfBirth: applicant.dateOfBirth || "",
      phone: applicant.phone || "",
      email: applicant.email || "",
      address: applicant.address || "",
      employmentType: applicant.employmentType || "",
    },
    financial: {
      monthlyIncome: Number(financial.monthlyIncome || 0),
      monthlyExpenses: Number(financial.monthlyExpenses || 0),
      existingEmis: Number(financial.existingEmis || 0),
      requestedLoanAmount: principalAmount,
      loanTenure: tenureMonths,
      employmentDurationMonths: Number(financial.employmentDurationMonths || 0),
    },
    applicantDetails: {
      income: Number(financial.monthlyIncome || 0),
      employmentStatus: applicant.employmentType || "",
      creditScore: Number(body.creditScore || 0) || undefined,
    },
    annualIncome: Number(financial.monthlyIncome || 0) * 12,
    employmentLengthMonths: Number(financial.employmentDurationMonths || 0),
    debtToIncomeRatio:
      Number(financial.monthlyIncome || 0) > 0
        ? (Number(financial.monthlyExpenses || 0) + Number(financial.existingEmis || 0)) /
          Number(financial.monthlyIncome || 0)
        : 0,
    updatedAt: new Date(),
    submittedAt: submit ? new Date() : undefined,
    dueAt: submit ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) : undefined,
  };

  let loan;
  if (existingId) {
    loan = await Loan.findByIdAndUpdate(
      existingId,
      { $set: payload },
      { new: true }
    );
    if (!loan) throw Object.assign(new Error("Application not found"), { status: 404 });
  } else {
    loan = await Loan.create({
      ...payload,
      user: user._id,
      applicationNumber: await nextApplicationNumber(Loan),
    });
  }

  if (submit) {
    const documents = await Document.find({ loan: loan._id }).lean();
    const evaluation = evaluateApplication(loan.toObject(), documents as Record<string, unknown>[]);
    await persistVerification(String(loan._id), evaluation, {
      assignedTo: loan.assignedTo ? String(loan.assignedTo) : undefined,
    });

    const nextStatus =
      evaluation.failed > 0 || evaluation.warnings > 0 ? "Needs Review" : "Verification Pending";

    const ml = await fetchRiskPrediction({
      annualIncome: payload.annualIncome,
      employmentLengthMonths: payload.employmentLengthMonths,
      debtToIncomeRatio: payload.debtToIncomeRatio,
      creditScore: Number(body.creditScore || 680),
    });

    loan = await Loan.findByIdAndUpdate(
      loan._id,
      {
        status: nextStatus,
        pipelineStage: pipelineForStatus(nextStatus),
        verificationScore: evaluation.score,
        riskLevel: evaluation.riskLevel,
        ...(ml
          ? {
              aiRiskScore: ml.risk_probability,
              aiRecommendation: ml.business_decision,
              aiExplanations: ml.key_factors,
              aiAssessedAt: new Date(),
            }
          : {}),
      },
      { new: true }
    );
  }

  await recordAudit({
    loan: String(loan!._id),
    actorId: user._id,
    actorName: user.name,
    action: existingId ? (submit ? "Application submitted" : "Draft saved") : "Application created",
    details: submit
      ? `${loan!.applicationNumber} moved into verification.`
      : `${loan!.applicationNumber} saved as a draft.`,
  });

  return loan;
}

export async function runVerificationForLoan(loanId: string, actor: SessionUser) {
  const loan = await Loan.findById(loanId);
  if (!loan) throw Object.assign(new Error("Application not found"), { status: 404 });
  const documents = await Document.find({ loan: loan._id }).lean();
  const evaluation = evaluateApplication(loan.toObject(), documents as Record<string, unknown>[]);
  await persistVerification(String(loan._id), evaluation, {
    assignedTo: loan.assignedTo ? String(loan.assignedTo) : actor._id,
  });

  const nextStatus =
    loan.status === "Draft"
      ? "Draft"
      : evaluation.failed > 0 || evaluation.warnings > 0
        ? "Needs Review"
        : "Verification Pending";

  await Loan.findByIdAndUpdate(loan._id, {
    verificationScore: evaluation.score,
    riskLevel: evaluation.riskLevel,
    status: nextStatus,
    pipelineStage: pipelineForStatus(nextStatus),
    updatedAt: new Date(),
  });

  await recordAudit({
    loan: String(loan._id),
    actorId: actor._id,
    actorName: actor.name,
    action: "Verification started",
    details: `Demo verification scored ${evaluation.score}% with ${evaluation.failed} failure(s) and ${evaluation.warnings} warning(s).`,
  });

  return evaluation;
}
