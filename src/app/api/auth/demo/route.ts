import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB, apiError } from "@/lib/db";
import { User } from "@/models/User";
import { signToken } from "@/lib/auth";
import { ensureDemoReady } from "@/lib/seed";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { canonicalRole } from "@/lib/roles";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requested = canonicalRole(body.role);
    const account = DEMO_ACCOUNTS.find((item) => item.role === requested) || DEMO_ACCOUNTS[1];

    await connectDB();
    await ensureDemoReady();

    const user = await User.findOne({ email: account.email });
    if (!user) {
      return NextResponse.json({ error: "Demo account is not available." }, { status: 500 });
    }

    const ok = await bcrypt.compare(DEMO_PASSWORD, user.password);
    if (!ok) {
      return NextResponse.json({ error: "Demo account password is out of date. Re-seed demo data." }, { status: 500 });
    }

    const token = await signToken({ userId: String(user._id), role: user.role }, 1);
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({
      user: { _id: String(user._id), name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    const { message, status } = apiError(error, "Demo sign-in failed.");
    return NextResponse.json({ error: message }, { status });
  }
}
