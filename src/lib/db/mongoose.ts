import mongoose from "mongoose";
import { env } from "@/lib/env";

// ─── MongoDB Connection (Singleton) ─────────────────────────────────────────
// In serverless / edge environments every invocation may import this module
// afresh. We cache the connection promise on the Node.js `global` object to
// prevent opening duplicate connections during hot‑reloads in development and
// across concurrent API requests in production.

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.__mongooseCache) {
  global.__mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
    };

    cached.promise = mongoose
      .connect(env.MONGODB_URI, opts)
      .then((m) => {
        console.log("[DB] MongoDB connected successfully");
        return m;
      })
      .catch((err) => {
        cached.promise = null; // allow retry on next call
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
