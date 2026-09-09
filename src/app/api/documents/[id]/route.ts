import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canReview } from "@/lib/roles";
import { Document } from "@/models/Document";
import { mapDocument } from "@/lib/application-map";
import { recordAudit } from "@/lib/audit";
import { runVerificationForLoan } from "@/lib/application-service";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await props.params;
    await connectDB();
    const document = await Document.findById(id).populate("reviewer", "name").lean();
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    return NextResponse.json({ document: mapDocument(document as Record<string, unknown>) });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load the document.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!canReview(user)) {
      return NextResponse.json({ error: "Only reviewers can change document status." }, { status: 403 });
    }
    const { id } = await props.params;
    const body = await req.json();
    await connectDB();
    const document = await Document.findByIdAndUpdate(
      id,
      {
        status: body.status,
        reviewer: user._id,
        confidence: body.confidence,
      },
      { new: true }
    );
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    await recordAudit({
      loan: String(document.loan),
      actorId: user._id,
      actorName: user.name,
      action: "Document status updated",
      details: `${document.documentType} → ${document.status}`,
    });
    await runVerificationForLoan(String(document.loan), user);
    return NextResponse.json({ document: mapDocument(document.toObject()) });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to update the document.");
    return NextResponse.json({ error: message }, { status });
  }
}
