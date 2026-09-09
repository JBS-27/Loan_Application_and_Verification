import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/format";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  return NextResponse.json({
    message:
      "Password reset is simulated in this prototype. Use a demo account or contact your administrator.",
    demo: true,
  });
}
