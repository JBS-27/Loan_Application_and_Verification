import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { createOrUpdateApplication, listApplications } from "@/lib/application-service";
import { ensureDemoReady } from "@/lib/seed";
import { isOfficer } from "@/lib/roles";

export async function GET() {
  try {
    const user = await requireSession();
    await connectDB();
    await ensureDemoReady();
    const query = isOfficer(user) ? { user: user._id } : {};
    const applications = await listApplications(query);
    return NextResponse.json({ loans: applications });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load loans.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const body = await req.json();
    await connectDB();
    const loan = await createOrUpdateApplication(user, {
      loanType: body.loanType,
      principalAmount: body.principalAmount,
      interestRate: body.interestRate,
      tenureMonths: body.tenureMonths,
      purpose: body.purpose,
      creditScore: body.applicantDetails?.creditScore,
      applicant: {
        fullName: user.name,
        email: user.email,
        employmentType: body.applicantDetails?.employmentStatus,
      },
      financial: {
        monthlyIncome: body.applicantDetails?.income,
        requestedLoanAmount: body.principalAmount,
        loanTenure: body.tenureMonths,
        employmentDurationMonths: body.employmentLengthMonths,
      },
      submit: true,
    });
    return NextResponse.json({ loan, mlStatus: loan.aiAssessedAt ? "scored" : "pending" }, { status: 201 });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to create the loan.");
    return NextResponse.json({ error: message }, { status });
  }
}
