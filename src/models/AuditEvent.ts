import mongoose from "mongoose";

const AuditEventSchema = new mongoose.Schema({
  loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan" },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  actorName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, default: "" },
  isDemo: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

AuditEventSchema.index({ loan: 1, createdAt: -1 });
AuditEventSchema.index({ createdAt: -1 });

export const AuditEvent =
  mongoose.models.AuditEvent || mongoose.model("AuditEvent", AuditEventSchema);
