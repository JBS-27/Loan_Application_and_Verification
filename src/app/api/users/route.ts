import { NextResponse } from "next/server";
import { connectDB, apiError } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { User } from "@/models/User";
import { displayRole } from "@/lib/roles";

export async function GET() {
  try {
    await requireSession();
    await connectDB();
    const users = await User.find({}).select("name email role isDemo").lean();
    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        _id: String(user._id),
        displayRole: displayRole(user.role),
      })),
    });
  } catch (error) {
    const { message, status } = apiError(error, "Unable to load users.");
    return NextResponse.json({ error: message }, { status });
  }
}
