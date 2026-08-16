/**
 * Seed Script — Ensure motoegoplus@gmail.com is Super Admin.
 *
 * Run with:
 *   npx tsx scripts/seed-admin.ts
 *
 * Requires MONGODB_URI in your .env.local or environment.
 *
 * Prefer Google sign-in for this account. If the user already exists
 * (e.g. from a prior Google login as customer), this script promotes
 * them to super_admin and repairs active/verified flags.
 */

import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment");
  process.exit(1);
}

const SUPER_ADMIN_EMAIL = "sahilrahman968@gmail.com";
const SUPER_ADMIN_NAME = "Motoego Admin";

// Define a minimal schema inline so the script stays self‑contained
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, default: "customer" },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    googleId: { type: String, default: null },
    picture: { type: String, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const email = SUPER_ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    const updates: string[] = [];

    if (existing.role !== "super_admin") {
      existing.role = "super_admin";
      updates.push("role → super_admin");
    }
    if (!existing.isEmailVerified) {
      existing.isEmailVerified = true;
      updates.push("isEmailVerified → true");
    }
    if (!existing.isActive) {
      existing.isActive = true;
      updates.push("isActive → true");
    }

    if (updates.length > 0) {
      await existing.save();
      console.log(`Updated ${email}: ${updates.join(", ")}`);
    } else {
      console.log(`Super admin already configured: ${email}`);
    }
  } else {
    const salt = await bcrypt.genSalt(12);
    const randomPassword =
      crypto.randomBytes(32).toString("hex") + "A1a!";
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    await User.create({
      name: SUPER_ADMIN_NAME,
      email,
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
      isEmailVerified: true,
    });

    console.log(`Super admin created: ${email}`);
    console.log("Sign in at /admin/login with Google using this account.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
