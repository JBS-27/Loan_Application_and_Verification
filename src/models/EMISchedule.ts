import mongoose from "mongoose";

const EMIScheduleSchema = new mongoose.Schema({
  loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emiAmount: { type: Number, required: true },
  totalPayments: { type: Number, required: true },
  paymentsMade: { type: Number, default: 0 },
  outstandingBalance: { type: Number, required: true },
  schedule: [{
    paymentDate: Date,
    amount: Number,
    principalComponent: Number,
    interestComponent: Number,
    status: { type: String, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' }
  }],
  createdAt: { type: Date, default: Date.now }
});

export const EMISchedule = mongoose.models.EMISchedule || mongoose.model("EMISchedule", EMIScheduleSchema);
