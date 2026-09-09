import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { User } from "@/models/User";
import type { SessionUser } from "./types";

type TokenPayload = {
  userId: string;
  role: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not configured");
  }
  return "lendflow-dev-secret";
}

export async function signToken(payload: TokenPayload, days = 1) {
  return jwt.sign(payload, getSecret(), { expiresIn: `${days}d` });
}

export async function verifyToken(token: string) {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  await connectDB();
  const user = await User.findById(payload.userId).select("-password").lean();
  if (!user) return null;

  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as SessionUser["role"],
  };
}

export async function requireSession() {
  const user = await getSession();
  if (!user) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
  return user;
}
