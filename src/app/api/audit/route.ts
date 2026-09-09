import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { AuditEvent } from "@/models/AuditEvent";

export async function GET(req: Request) {
  try {
    await requireSession();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query: Record<string, unknown> = {};
    if (searchParams.get("loanId")) query.loan = searchParams.get("loanId");
    const events = await AuditEvent.find(query)
      .populate({ path: "loan", select: "applicationNumber" })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({
      events: events.map((event) => ({
        ...event,
        applicationNumber: (event.loan as { applicationNumber?: string } | null)?.applicationNumber,
        loan: event.loan ? String((event.loan as { _id?: string })._id || event.loan) : undefined,
      })),
    });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load the audit trail.");
    return NextResponse.json({ error: message }, { status });
  }
}
