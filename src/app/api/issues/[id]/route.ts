import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canReview } from "@/lib/roles";
import { Issue } from "@/models/Issue";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!canReview(user)) {
      return NextResponse.json({ error: "Only reviewers can update issues." }, { status: 403 });
    }
    const { id } = await props.params;
    const body = await req.json();
    await connectDB();

    const issue = await Issue.findByIdAndUpdate(
      id,
      {
        status: body.status,
        resolution: body.resolution,
        assignedTo: body.assignedTo || user._id,
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!issue) return NextResponse.json({ error: "Issue not found." }, { status: 404 });

    await recordAudit({
      loan: String(issue.loan),
      actorId: user._id,
      actorName: user.name,
      action: body.status === "Resolved" ? "Issue resolved" : "Issue updated",
      details: issue.message,
    });

    return NextResponse.json({ issue });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to update the issue.");
    return NextResponse.json({ error: message }, { status });
  }
}
