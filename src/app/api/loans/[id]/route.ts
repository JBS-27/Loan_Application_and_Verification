import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getApplicationBundle } from "@/lib/application-service";
import { Loan } from "@/models/Loan";
import { canReview } from "@/lib/roles";
import { serialize } from "@/lib/serialize";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await props.params;
    await connectDB();
    const bundle = await getApplicationBundle(id);
    if (!bundle) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    return NextResponse.json(
      serialize({
        loan: bundle.application,
        documents: bundle.documents,
        checks: bundle.checks,
        issues: bundle.issues,
      })
    );
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load the loan.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!canReview(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { id } = await props.params;
    const body = await req.json();
    await connectDB();
    const loan = await Loan.findByIdAndUpdate(id, { ...body, updatedAt: Date.now() }, { new: true });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    return NextResponse.json({ loan });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to update the loan.");
    return NextResponse.json({ error: message }, { status });
  }
}
