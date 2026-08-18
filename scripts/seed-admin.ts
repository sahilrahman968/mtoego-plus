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

const PERMISSIONS = [
  "dashboard.read",
  "analytics.pulse",
  "analytics.curves",
  "analytics.customers",
  "analytics.merchandising",
  "analytics.trust",
  "products.list",
  "products.view",
  "products.create",
  "products.update",
  "products.delete",
  "products.inventory.read",
  "products.inventory.write",
  "categories.list",
  "categories.view",
  "categories.create",
  "categories.update",
  "categories.delete",
  "orders.list",
  "orders.view",
  "orders.update_status",
  "reviews.list",
  "reviews.moderate",
  "reviews.delete",
  "coupons.list",
  "coupons.view",
  "coupons.create",
  "coupons.update",
  "coupons.delete",
  "callback_requests.list",
  "callback_requests.update",
  "media.upload",
  "media.rename",
  "media.delete",
];

const STAFF_PERMISSIONS = PERMISSIONS.filter((p) => p !== "reviews.delete");

const LEGACY_MAP: Record<string, string[]> = {
  "analytics.read": [
    "analytics.pulse",
    "analytics.curves",
    "analytics.customers",
    "analytics.merchandising",
    "analytics.trust",
  ],
  "products.read": ["products.list", "products.view", "products.inventory.read"],
  "products.write": [
    "products.create",
    "products.update",
    "products.inventory.write",
  ],
  "categories.read": ["categories.list", "categories.view"],
  "categories.write": ["categories.create", "categories.update"],
  "orders.read": ["orders.list", "orders.view"],
  "orders.write": ["orders.update_status"],
  "reviews.read": ["reviews.list"],
  "reviews.write": ["reviews.moderate"],
  "coupons.read": ["coupons.list", "coupons.view"],
  "coupons.write": ["coupons.create", "coupons.update"],
  "callback_requests.read": ["callback_requests.list"],
  "callback_requests.write": ["callback_requests.update"],
  "upload.write": ["media.upload", "media.rename", "media.delete"],
};

function expandPermissions(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    if (PERMISSIONS.includes(value)) set.add(value);
    else {
      const expanded = LEGACY_MAP[value];
      if (expanded) {
        for (const p of expanded) set.add(p);
      }
    }
  }
  return Array.from(set);
}

const roleSchema = new mongoose.Schema(
  {
    slug: { type: String, unique: true },
    name: String,
    description: String,
    permissions: [String],
    isSystem: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

async function seedRoles() {
  const defs = [
    {
      slug: "super_admin",
      name: "Super Admin",
      description: "Full access to the admin panel, staff, and roles",
      permissions: PERMISSIONS,
      isSystem: true,
      isAdmin: true,
    },
    {
      slug: "staff",
      name: "Staff",
      description: "Standard store operations access",
      permissions: STAFF_PERMISSIONS,
      isSystem: true,
      isAdmin: true,
    },
    {
      slug: "customer",
      name: "Customer",
      description: "Storefront customer (no admin access)",
      permissions: [],
      isSystem: true,
      isAdmin: false,
    },
  ];

  for (const def of defs) {
    const existing = await Role.findOne({ slug: def.slug });
    if (existing) {
      existing.name = def.name;
      existing.description = def.description;
      existing.isSystem = true;
      existing.isAdmin = def.isAdmin;
      if (def.slug === "super_admin" || def.slug === "customer") {
        existing.permissions = def.permissions;
      } else if (def.slug === "staff") {
        existing.permissions = existing.permissions?.length
          ? expandPermissions(existing.permissions)
          : def.permissions;
      }
      await existing.save();
      console.log(`Role upserted: ${def.slug}`);
    } else {
      await Role.create(def);
      console.log(`Role created: ${def.slug}`);
    }
  }
}

async function seed() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to MongoDB");

  await seedRoles();

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
