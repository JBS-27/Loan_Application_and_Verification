import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageSettings } from "@/lib/roles";
import { AppSettings } from "@/models/AppSettings";
import { getSettings } from "@/lib/application-service";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireSession();
    await connectDB();
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load settings.");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireSession();
    if (!canManageSettings(user)) {
      return NextResponse.json({ error: "Only admins can change system settings." }, { status: 403 });
    }
    const body = await req.json();
    await connectDB();
    const settings = await AppSettings.findOneAndUpdate(
      { key: "default" },
      {
        rates: body.rates,
        verificationWindowDays: Number(body.verificationWindowDays || 90),
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    await recordAudit({
      actorId: user._id,
      actorName: user.name,
      action: "Settings updated",
      details: "Verification window and product rates were updated.",
    });
    return NextResponse.json({ settings });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to save settings.");
    return NextResponse.json({ error: message }, { status });
  }
}
