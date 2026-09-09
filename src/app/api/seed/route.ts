import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageSettings } from "@/lib/roles";
import { seedDemoData } from "@/lib/seed";

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    if (!canManageSettings(user)) {
      return NextResponse.json({ error: "Only admins can reset demo data." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    await connectDB();
    const result = await seedDemoData({ force: Boolean(body.force) });
    return NextResponse.json({
      ...result,
      users: undefined,
      notice: "Demo data is fictional and used only for this prototype.",
    });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to seed demo data.");
    return NextResponse.json({ error: message }, { status });
  }
}
