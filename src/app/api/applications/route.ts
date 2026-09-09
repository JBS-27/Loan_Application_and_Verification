import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ensureDemoReady } from "@/lib/seed";
import { createOrUpdateApplication, listApplications } from "@/lib/application-service";
import { isOfficer } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    const user = await requireSession();
    await connectDB();
    await ensureDemoReady();

    const { searchParams } = new URL(req.url);
    const query: Record<string, unknown> = {};
    const status = searchParams.get("status");
    const loanType = searchParams.get("loanType");
    const risk = searchParams.get("risk");
    const q = searchParams.get("q");
    const assigned = searchParams.get("assigned");
    const mine = searchParams.get("mine");

    if (status && status !== "all") query.status = status;
    if (loanType && loanType !== "all") query.loanType = loanType;
    if (risk && risk !== "all") query.riskLevel = risk;
    if (assigned === "me") query.assignedTo = user._id;
    if (mine === "1" && isOfficer(user)) query.user = user._id;

    if (q) {
      query.$or = [
        { applicationNumber: { $regex: q, $options: "i" } },
        { "applicant.fullName": { $regex: q, $options: "i" } },
        { "applicant.email": { $regex: q, $options: "i" } },
        { purpose: { $regex: q, $options: "i" } },
      ];
    }

    const applications = await listApplications(query);
    return NextResponse.json({ applications });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load applications.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    const body = await req.json();
    await connectDB();
    const loan = await createOrUpdateApplication(user, body);
    return NextResponse.json({ applicationId: String(loan._id), loan }, { status: 201 });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to save the application.");
    return NextResponse.json({ error: message }, { status });
  }
}
