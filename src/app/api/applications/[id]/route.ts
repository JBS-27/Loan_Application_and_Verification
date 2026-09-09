import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { createOrUpdateApplication, getApplicationBundle } from "@/lib/application-service";
import { Loan } from "@/models/Loan";
import { canReview } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";
import { serialize } from "@/lib/serialize";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await props.params;
    await connectDB();
    const bundle = await getApplicationBundle(id);
    if (!bundle) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    return NextResponse.json(serialize(bundle));
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load the application.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await props.params;
    const body = await req.json();
    await connectDB();

    const existing = await Loan.findById(id);
    if (!existing) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    if (body.applicant || body.financial || body.loanType || body.submit || body.status === "Draft") {
      const loan = await createOrUpdateApplication(user, body, id);
      return NextResponse.json({ loan });
    }

    if (!canReview(user) && body.status) {
      return NextResponse.json({ error: "Only reviewers can change verification status." }, { status: 403 });
    }

    const allowed = ["status", "priority", "assignedTo", "purpose"];
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const loan = await Loan.findByIdAndUpdate(id, updates, { new: true });
    await recordAudit({
      loan: id,
      actorId: user._id,
      actorName: user.name,
      action: "Application updated",
      details: Object.keys(updates).filter((key) => key !== "updatedAt").join(", "),
    });
    return NextResponse.json({ loan });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to update the application.");
    return NextResponse.json({ error: message }, { status });
  }
}
