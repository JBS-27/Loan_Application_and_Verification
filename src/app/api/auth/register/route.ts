import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB, apiError } from "@/lib/db";
import { User } from "@/models/User";
import { parseSignupRole } from "@/lib/roles";
import { isValidEmail } from "@/lib/format";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "").trim();
    const role = parseSignupRole(body.role);

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
    });

    return NextResponse.json({ message: "Account created" }, { status: 201 });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to create the account.");
    return NextResponse.json({ error: message }, { status });
  }
}
