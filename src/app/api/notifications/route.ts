import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { AuditEvent } from "@/models/AuditEvent";
import { Issue } from "@/models/Issue";

export async function GET() {
  try {
    const user = await requireSession();
    await connectDB();
    const [events, issues] = await Promise.all([
      AuditEvent.find({}).sort({ createdAt: -1 }).limit(8).lean(),
      Issue.find({ status: { $in: ["Open", "Investigating"] }, assignedTo: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const notifications = [
      ...issues.map((issue) => ({
        id: String(issue._id),
        title: `${issue.severity} issue needs attention`,
        body: issue.message,
        href: `/applications/${issue.loan}?tab=issues`,
        createdAt: issue.createdAt,
        kind: "issue",
      })),
      ...events.map((event) => ({
        id: String(event._id),
        title: event.action,
        body: event.details,
        href: event.loan ? `/applications/${event.loan}` : "/audit",
        createdAt: event.createdAt,
        kind: "activity",
      })),
    ].slice(0, 10);

    return NextResponse.json({ notifications, unread: issues.length });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load notifications.");
    return NextResponse.json({ error: message }, { status });
  }
}
