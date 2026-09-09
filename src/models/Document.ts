import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
  loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  documentType: {
    type: String,
    enum: [
      "KYC",
      "Income Proof",
      "Bank Statement",
      "Other",
      "Identity Proof",
      "Address Proof",
      "Employment Proof",
    ],
    required: true,
  },
  fileName: { type: String, default: "document" },
  fileUrl: { type: String, required: true },
  mimeType: { type: String, default: "image/svg+xml" },
  status: {
    type: String,
    enum: ["Missing", "Uploaded", "Processing", "Pending", "Verified", "Needs Review", "Failed", "Rejected"],
    default: "Uploaded",
  },
  confidence: { type: Number, min: 0, max: 100 },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  issueCount: { type: Number, default: 0 },
  extracted: {
    name: String,
    date: String,
    income: Number,
    address: String,
    employer: String,
  },
  qualityOk: { type: Boolean, default: true },
  isDemo: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
});

DocumentSchema.index({ loan: 1, documentType: 1 });

export const Document = mongoose.models.Document || mongoose.model("Document", DocumentSchema);
