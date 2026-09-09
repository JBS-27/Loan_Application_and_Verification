import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canReview } from "@/lib/roles";
import { Loan } from "@/models/Loan";
import { Issue } from "@/models/Issue";
import { recordAudit } from "@/lib/audit";
import { pipelineForStatus } from "@/lib/application-map";
import { DECISION_STATES } from "@/lib/constants";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!canReview(user)) {
      return NextResponse.json({ error: "Only reviewers can record a verification decision." }, { status: 403 });
    }
    const { id } = await props.params;
    const body = await req.json();
    const status = body.status as string;
    const reason = String(body.reason || "").trim();

    if (!(DECISION_STATES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: "Choose a valid verification decision." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "A decision reason is required." }, { status: 400 });
    }

    await connectDB();
    const openIssues = await Issue.find({
      loan: id,
      status: { $in: ["Open", "Investigating"] },
    }).lean();

    const appStatus =
      status === "Verified"
        ? "Verified"
        : status === "Rejected"
          ? "Rejected"
          : "More Information Requested";

    const loan = await Loan.findByIdAndUpdate(
      id,
      {
        status: appStatus,
        pipelineStage: pipelineForStatus(appStatus),
        decision: {
          status,
          reason,
          reviewerId: user._id,
          reviewerName: user.name,
          timestamp: new Date(),
          outstandingIssues: openIssues.map((issue) => issue.message),
        },
        requestedInfo: body.requestedInfo || [],
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!loan) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    await recordAudit({
      loan: id,
      actorId: user._id,
      actorName: user.name,
      action: "Decision recorded",
      details: `${status}: ${reason}`,
    });

    return NextResponse.json({
      loan,
      notice:
        "This is an application verification decision, not a credit approval or loan sanction.",
    });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to record the decision.");
    return NextResponse.json({ error: message }, { status });
  }
}
