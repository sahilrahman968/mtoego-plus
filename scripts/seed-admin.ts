/**
 * Seed Script — Create initial Super Admin user.
 *
 * Run with:
 *   npx tsx scripts/seed-admin.ts
 *
 * Requires MONGODB_URI in your .env.local or environment.
 */

import mongoose from "mongoose";
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

// Define a minimal schema inline so the script stays self‑contained
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: { type: String, default: "customer" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const email = "admin@ecom.local";
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Super admin already exists: ${email}`);
  } else {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("Admin@1234", salt);

    await User.create({
      name: "Super Admin",
      email,
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
    });

    console.log(`Super admin created: ${email} / Admin@1234`);
    console.log("⚠  Change this password immediately in production!");
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
