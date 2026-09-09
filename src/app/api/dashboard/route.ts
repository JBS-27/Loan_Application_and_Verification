import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ensureDemoReady } from "@/lib/seed";
import { listApplications } from "@/lib/application-service";
import { AuditEvent } from "@/models/AuditEvent";
import { normalizeStatus } from "@/lib/format";

export async function GET() {
  try {
    const user = await requireSession();
    await connectDB();
    await ensureDemoReady();

    const applications = await listApplications();
    const now = Date.now();

    const stats = {
      total: applications.length,
      pending: applications.filter((app) =>
        ["Submitted", "Verification Pending"].includes(app.status)
      ).length,
      verified: applications.filter((app) => app.status === "Verified").length,
      needsReview: applications.filter((app) => app.status === "Needs Review").length,
      rejected: applications.filter((app) => app.status === "Rejected").length,
      moreInfo: applications.filter((app) => app.status === "More Information Requested").length,
    };

    const decided = applications.filter((app) => app.decision?.timestamp && app.submittedAt);
    const avgHours =
      decided.length === 0
        ? 0
        : decided.reduce((sum, app) => {
            const start = new Date(app.submittedAt as string).getTime();
            const end = new Date(app.decision!.timestamp as string).getTime();
            return sum + (end - start) / 36e5;
          }, 0) / decided.length;

    const pipeline = {
      Received: applications.filter((app) => app.pipelineStage === "Received").length,
      Documents: applications.filter((app) => app.pipelineStage === "Documents").length,
      Verification: applications.filter((app) => app.pipelineStage === "Verification").length,
      Review: applications.filter((app) => app.pipelineStage === "Review").length,
      Decision: applications.filter((app) => app.pipelineStage === "Decision").length,
    };

    const workload = {
      pending: applications.filter((app) =>
        ["Submitted", "Verification Pending", "Needs Review", "More Information Requested"].includes(
          app.status
        )
      ).length,
      assignedToMe: applications.filter((app) => app.assignedTo?._id === user._id).length,
      overdue: applications.filter(
        (app) =>
          app.dueAt &&
          new Date(app.dueAt).getTime() < now &&
          !["Verified", "Rejected", "Draft"].includes(normalizeStatus(app.status))
      ).length,
      highPriority: applications.filter((app) => app.priority === "High").length,
    };

    const activity = await AuditEvent.find({}).sort({ createdAt: -1 }).limit(12).lean();

    return NextResponse.json({
      stats: { ...stats, avgVerificationHours: Math.round(avgHours * 10) / 10 },
      pipeline,
      workload,
      recent: applications.slice(0, 8),
      activity,
    });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load the dashboard.");
    return NextResponse.json({ error: message }, { status });
  }
}
