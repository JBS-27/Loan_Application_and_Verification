import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canReview } from "@/lib/roles";
import { Loan } from "@/models/Loan";
import { User } from "@/models/User";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!canReview(user)) {
      return NextResponse.json({ error: "Only reviewers can assign applications." }, { status: 403 });
    }
    const { id } = await props.params;
    const body = await req.json();
    const assigneeId = String(body.userId || user._id);
    await connectDB();
    const assignee = await User.findById(assigneeId).select("name email role");
    if (!assignee) return NextResponse.json({ error: "Reviewer not found." }, { status: 404 });

    const loan = await Loan.findByIdAndUpdate(
      id,
      { assignedTo: assignee._id, updatedAt: new Date() },
      { new: true }
    );
    if (!loan) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    await recordAudit({
      loan: id,
      actorId: user._id,
      actorName: user.name,
      action: "Reviewer assigned",
      details: `${assignee.name} is now assigned to this file.`,
    });

    return NextResponse.json({ loan });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to assign the reviewer.");
    return NextResponse.json({ error: message }, { status });
  }
}
