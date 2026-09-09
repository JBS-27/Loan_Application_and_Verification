import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/loan_system";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.mongoose || { conn: null, promise: null };
globalForMongoose.mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export function apiError(error: unknown, fallback = "Something went wrong") {
  console.error("[LendFlow]", fallback, error);
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: number }).status) || 500;
    const message = error instanceof Error ? error.message : fallback;
    return { message, status };
  }
  const message = error instanceof Error ? error.message : fallback;
  if (message === "Unauthorized") return { message, status: 401 };
  if (message === "Forbidden") return { message, status: 403 };
  return { message: fallback, status: 500 };
}
