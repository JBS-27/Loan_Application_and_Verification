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
      return NextResponse.json({ error: "Only reviewers can add review comments." }, { status: 403 });
    }
    const { id } = await props.params;
    const { content } = await req.json();
    if (!String(content || "").trim()) {
      return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
    }

    await connectDB();
    const loan = await Loan.findById(id);
    if (!loan) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    loan.internalNotes.push({
      author: user._id,
      content: String(content).trim(),
      timestamp: new Date(),
    });
    loan.updatedAt = new Date();
    await loan.save();

    await recordAudit({
      loan: id,
      actorId: user._id,
      actorName: user.name,
      action: "Comment added",
      details: String(content).trim().slice(0, 180),
    });

    return NextResponse.json({ loan }, { status: 201 });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to add the comment.");
    return NextResponse.json({ error: message }, { status });
  }
}
