import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB, apiError } from "@/lib/db";
import { User } from "@/models/User";
import { signToken } from "@/lib/auth";
import { ensureDemoReady } from "@/lib/seed";
import { isValidEmail } from "@/lib/format";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "").trim();
    const remember = Boolean(body.remember);

    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    }

    await connectDB();
    await ensureDemoReady();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const days = remember ? 30 : 1;
    const token = await signToken({ userId: String(user._id), role: user.role }, days);
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: days * 60 * 60 * 24,
      path: "/",
    });

    user.lastLoginAt = new Date();
    await user.save();

    return NextResponse.json({
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to sign in right now.");
    return NextResponse.json({ error: message }, { status });
  }
}
