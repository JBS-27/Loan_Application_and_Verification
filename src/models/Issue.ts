import mongoose from "mongoose";

const IssueSchema = new mongoose.Schema({
  loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
  severity: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], required: true },
  category: {
    type: String,
    enum: ["Identity", "Contact", "Financial", "Documents", "Consistency"],
    required: true,
  },
  message: { type: String, required: true },
  source: { type: String, required: true },
  status: {
    type: String,
    enum: ["Open", "Investigating", "Resolved", "Dismissed"],
    default: "Open",
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolution: String,
  checkCode: String,
  isDemo: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

IssueSchema.index({ loan: 1, status: 1 });
IssueSchema.index({ severity: 1, status: 1 });

export const Issue = mongoose.models.Issue || mongoose.model("Issue", IssueSchema);
