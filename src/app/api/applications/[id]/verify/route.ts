import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canReview } from "@/lib/roles";
import { runVerificationForLoan } from "@/lib/application-service";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!canReview(user)) {
      return NextResponse.json({ error: "Only reviewers can run verification." }, { status: 403 });
    }
    const { id } = await props.params;
    await connectDB();
    const evaluation = await runVerificationForLoan(id, user);
    return NextResponse.json({ evaluation, demo: true });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to run verification.");
    return NextResponse.json({ error: message }, { status });
  }
}
