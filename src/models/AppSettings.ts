import mongoose from "mongoose";

const AppSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default" },
  rates: {
    Home: { type: Number, default: 8.5 },
    Auto: { type: Number, default: 10.5 },
    Personal: { type: Number, default: 12.5 },
    Education: { type: Number, default: 9.25 },
    Business: { type: Number, default: 13.5 },
  },
  verificationWindowDays: { type: Number, default: 90 },
  updatedAt: { type: Date, default: Date.now },
});

export const AppSettings =
  mongoose.models.AppSettings || mongoose.model("AppSettings", AppSettingsSchema);
