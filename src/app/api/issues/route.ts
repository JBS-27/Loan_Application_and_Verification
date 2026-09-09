import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Issue } from "@/models/Issue";
import { Loan } from "@/models/Loan";
import { recordAudit } from "@/lib/audit";
import { canReview } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    await requireSession();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query: Record<string, unknown> = {};
    if (searchParams.get("loanId")) query.loan = searchParams.get("loanId");
    if (searchParams.get("status") && searchParams.get("status") !== "all") {
      query.status = searchParams.get("status");
    }
    if (searchParams.get("severity") && searchParams.get("severity") !== "all") {
      query.severity = searchParams.get("severity");
    }

    const issues = await Issue.find(query)
      .populate("assignedTo", "name")
      .populate({ path: "loan", select: "applicationNumber applicant" })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      issues: issues.map((issue) => ({
        ...issue,
        applicationNumber: (issue.loan as { applicationNumber?: string } | null)?.applicationNumber,
        applicantName: (issue.loan as { applicant?: { fullName?: string } } | null)?.applicant?.fullName,
        loan: String((issue.loan as { _id?: string })?._id || issue.loan),
      })),
    });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load issues.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    if (!canReview(user)) {
      return NextResponse.json({ error: "Only reviewers can create issues." }, { status: 403 });
    }
    const body = await req.json();
    await connectDB();
    const loan = await Loan.findById(body.loanId);
    if (!loan) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const issue = await Issue.create({
      loan: loan._id,
      severity: body.severity || "MEDIUM",
      category: body.category || "Consistency",
      message: String(body.message || "").trim(),
      source: body.source || "Manual review",
      status: "Open",
      assignedTo: body.assignedTo || user._id,
    });

    await recordAudit({
      loan: String(loan._id),
      actorId: user._id,
      actorName: user.name,
      action: "Issue created",
      details: issue.message,
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to create the issue.");
    return NextResponse.json({ error: message }, { status });
  }
}
