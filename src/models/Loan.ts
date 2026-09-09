import mongoose from "mongoose";

const ApplicantSchema = new mongoose.Schema(
  {
    fullName: String,
    dateOfBirth: String,
    phone: String,
    email: String,
    address: String,
    employmentType: String,
  },
  { _id: false }
);

const FinancialSchema = new mongoose.Schema(
  {
    monthlyIncome: Number,
    monthlyExpenses: Number,
    existingEmis: Number,
    requestedLoanAmount: Number,
    loanTenure: Number,
    employmentDurationMonths: Number,
  },
  { _id: false }
);

const DecisionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Verified", "Needs More Information", "Rejected"],
    },
    reason: String,
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewerName: String,
    timestamp: Date,
    outstandingIssues: [String],
  },
  { _id: false }
);

const LoanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  applicationNumber: { type: String, unique: true, sparse: true },
  loanType: {
    type: String,
    enum: ["Home", "Auto", "Personal", "Education", "Business"],
    required: true,
  },
  purpose: String,
  principalAmount: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  tenureMonths: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      "Draft",
      "Submitted",
      "Pending ML Assessment",
      "Verification Pending",
      "Credit Check",
      "Needs Review",
      "Verified",
      "Approved",
      "Rejected",
      "Disbursed",
      "More Information Requested",
    ],
    default: "Draft",
  },
  pipelineStage: {
    type: String,
    enum: ["Received", "Documents", "Verification", "Review", "Decision"],
    default: "Received",
  },
  priority: { type: String, enum: ["Normal", "High"], default: "Normal" },
  isDemo: { type: Boolean, default: false },
  applicant: { type: ApplicantSchema, default: () => ({}) },
  financial: { type: FinancialSchema, default: () => ({}) },
  applicantDetails: {
    income: Number,
    employmentStatus: String,
    creditScore: Number,
  },
  annualIncome: { type: Number },
  employmentLengthMonths: { type: Number, min: 0 },
  debtToIncomeRatio: { type: Number, min: 0 },
  creditScore: { type: Number, min: 300, max: 850 },
  aiRiskScore: { type: Number, min: 0, max: 1 },
  aiRecommendation: {
    type: String,
    enum: ["Auto-Approve", "Manual Review", "Auto-Reject"],
  },
  aiExplanations: { type: [String], default: undefined },
  aiAssessedAt: { type: Date },
  verificationScore: { type: Number, min: 0, max: 100 },
  riskLevel: { type: String, enum: ["Low", "Medium", "High"] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  decision: { type: DecisionSchema },
  requestedInfo: { type: [String], default: [] },
  submittedAt: { type: Date },
  dueAt: { type: Date },
  internalNotes: [
    {
      author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      content: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

LoanSchema.index({ status: 1, createdAt: -1 });
LoanSchema.index({ assignedTo: 1, status: 1 });
LoanSchema.index({ aiRecommendation: 1, status: 1 });

export const Loan = mongoose.models.Loan || mongoose.model("Loan", LoanSchema);
