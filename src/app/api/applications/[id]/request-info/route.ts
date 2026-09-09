import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canReview } from "@/lib/roles";
import { Loan } from "@/models/Loan";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!canReview(user)) {
      return NextResponse.json({ error: "Only reviewers can request more information." }, { status: 403 });
    }
    const { id } = await props.params;
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items.map(String) : [];
    if (!items.length) {
      return NextResponse.json({ error: "Select at least one missing item." }, { status: 400 });
    }

    await connectDB();
    const loan = await Loan.findByIdAndUpdate(
      id,
      {
        status: "More Information Requested",
        pipelineStage: "Documents",
        requestedInfo: items,
        decision: {
          status: "Needs More Information",
          reason: body.reason || `Requested: ${items.join(", ")}`,
          reviewerId: user._id,
          reviewerName: user.name,
          timestamp: new Date(),
        },
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!loan) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    await recordAudit({
      loan: id,
      actorId: user._id,
      actorName: user.name,
      action: "Information requested",
      details: items.join(", "),
    });

    return NextResponse.json({ loan });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to request more information.");
    return NextResponse.json({ error: message }, { status });
  }
}
