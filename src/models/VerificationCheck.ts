import mongoose from "mongoose";

const VerificationCheckSchema = new mongoose.Schema({
  loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
  code: { type: String, required: true },
  category: {
    type: String,
    enum: ["Identity", "Contact", "Financial", "Documents", "Consistency"],
    required: true,
  },
  label: { type: String, required: true },
  result: { type: String, enum: ["PASS", "WARNING", "FAIL", "PENDING"], required: true },
  message: { type: String, required: true },
  section: { type: String, default: "overview" },
  createdAt: { type: Date, default: Date.now },
});

VerificationCheckSchema.index({ loan: 1, code: 1 }, { unique: true });

export const VerificationCheck =
  mongoose.models.VerificationCheck ||
  mongoose.model("VerificationCheck", VerificationCheckSchema);
