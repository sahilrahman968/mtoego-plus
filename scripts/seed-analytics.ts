/**
 * Seed analytics-friendly dummy data over ~5 months.
 *
 * Uses existing products in the DB. Creates customers, orders, carts,
 * wishlists, reviews, coupons, sale campaigns, and callback requests so
 * every analytics section (Pulse / Trends / Merchandising / Operations /
 * Customers) and sale performance pages have meaningful numbers.
 *
 * Run with:
 *   npx tsx scripts/seed-analytics.ts
 *   npm run seed:analytics
 *
 * Re-running clears previous analytics seed data (tagged emails / notes /
 * seed-* sale slugs) then inserts a fresh set. Real admin accounts,
 * non-seed orders, and hand-made sales (e.g. monsoon-flash-sale) are kept.
 */

import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment");
  process.exit(1);
}

const SEED_EMAIL_DOMAIN = "seed.motoego.dev";
const SEED_NOTE = "[analytics-seed]";
const SEED_SALE_SLUG_PREFIX = "seed-";
const MONTHS = 5;
const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"];

// ─── RNG (deterministic for easier re-runs) ─────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260823);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]!);
  }
  return out;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeSalePrice(
  original: number,
  discountType: "percentage" | "amount",
  value: number
): number {
  if (original <= 0) return original;
  if (discountType === "percentage") {
    return round2(original * (1 - Math.min(90, Math.max(0, value)) / 100));
  }
  return round2(Math.max(0.01, original - Math.max(0, value)));
}

interface SeedSaleItem {
  product: Types.ObjectId;
  discountType: "percentage" | "amount";
  value: number;
}

interface SeedSaleCampaign {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  allowCoupons: boolean;
  priority: number;
  items: SeedSaleItem[];
  productIds: Set<string>;
}

function findLiveSale(
  campaigns: SeedSaleCampaign[],
  productId: string,
  at: Date
): { campaign: SeedSaleCampaign; item: SeedSaleItem } | null {
  const matches = campaigns
    .filter(
      (c) =>
        c.isActive &&
        at >= c.startsAt &&
        at < c.endsAt &&
        c.productIds.has(productId)
    )
    .sort((a, b) => b.priority - a.priority);
  const campaign = matches[0];
  if (!campaign) return null;
  const item = campaign.items.find((i) => String(i.product) === productId);
  if (!item) return null;
  return { campaign, item };
}

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 60 * 60 * 1000);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function clampDate(d: Date, min: Date, max: Date): Date {
  if (d < min) return new Date(min);
  if (d > max) return new Date(max);
  return d;
}

// ─── Reference data ─────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Ananya", "Aadhya", "Diya", "Pari", "Anika", "Navya",
  "Myra", "Sara", "Ira", "Kiara", "Rohan", "Kabir", "Dev", "Yash", "Nikhil",
  "Meera", "Sneha", "Priya", "Neha", "Kavya",
];

const LAST_NAMES = [
  "Sharma", "Patel", "Singh", "Reddy", "Nair", "Iyer", "Gupta", "Mehta",
  "Joshi", "Kapoor", "Khan", "Das", "Bose", "Chopra", "Malhotra", "Verma",
];

const CITIES: { city: string; state: string; pincode: string }[] = [
  { city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  { city: "Pune", state: "Maharashtra", pincode: "411001" },
  { city: "Bengaluru", state: "Karnataka", pincode: "560001" },
  { city: "Mysuru", state: "Karnataka", pincode: "570001" },
  { city: "Hyderabad", state: "Telangana", pincode: "500001" },
  { city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
  { city: "Coimbatore", state: "Tamil Nadu", pincode: "641001" },
  { city: "Delhi", state: "Delhi", pincode: "110001" },
  { city: "Jaipur", state: "Rajasthan", pincode: "302001" },
  { city: "Ahmedabad", state: "Gujarat", pincode: "380001" },
  { city: "Surat", state: "Gujarat", pincode: "395001" },
  { city: "Kolkata", state: "West Bengal", pincode: "700001" },
  { city: "Chandigarh", state: "Chandigarh", pincode: "160001" },
  { city: "Lucknow", state: "Uttar Pradesh", pincode: "226001" },
  { city: "Indore", state: "Madhya Pradesh", pincode: "452001" },
];

const PAYMENT_METHODS = [
  { method: "upi", weight: 45, extra: () => ({ vpa: `user${randInt(1, 99)}@oksbi` }) },
  { method: "card", weight: 30, extra: () => ({ bank: pick(["HDFC", "ICICI", "SBI", "Axis"]) }) },
  { method: "netbanking", weight: 15, extra: () => ({ bank: pick(["HDFC", "SBI", "Kotak"]) }) },
  { method: "wallet", weight: 10, extra: () => ({ wallet: pick(["paytm", "phonepe", "amazonpay"]) }) },
];

const CANCEL_REASONS = [
  "Changed mind",
  "Found better price",
  "Delivery too slow",
  "Ordered by mistake",
  "Payment issue",
  "Duplicate order",
];

const REVIEW_COMMENTS = [
  "Solid build quality — exactly what I needed for long rides.",
  "Looks premium in person. Stitching is neat.",
  "Good product overall, sizing runs a bit small.",
  "Value for money. Would buy again.",
  "Packaging was careful and delivery was quick.",
  "Average — expected slightly better leather finish.",
  "Disappointed with the zippers; rest is fine.",
  "Fantastic jacket. Gets compliments every ride.",
  "Comfortable and durable after two weeks of use.",
  "Not bad, but colour differed slightly from photos.",
];

const CALLBACK_REQUIREMENTS = [
  "Need help choosing a riding jacket for monsoon commuting.",
  "Want a bulk quote for club members — 8 jackets.",
  "Confused between cafe racer and trail jacket sizes.",
  "Looking for gift options under ₹5000 for a rider friend.",
  "Need callback about exchange policy on leather goods.",
  "Interested in custom embroidery on backpacks.",
];

interface ProductVariantRow {
  _id: Types.ObjectId;
  size?: string;
  color?: string;
  sku: string;
  price: number;
  gst: number;
  stock: number;
  isActive: boolean;
}

interface ProductRow {
  _id: Types.ObjectId;
  title: string;
  category: Types.ObjectId;
  variants: ProductVariantRow[];
  isActive: boolean;
}

interface Sellable {
  product: ProductRow;
  variant: ProductVariantRow;
  label: string;
  /** Relative popularity weight for order line picks */
  weight: number;
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

function pickPayment() {
  return weightedPick(PAYMENT_METHODS.map((m) => ({ ...m, weight: m.weight })));
}

function orderNumberFor(date: Date, seq: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const suffix = seq.toString(36).toUpperCase().padStart(5, "0").slice(-5);
  return `ORD-${y}${m}${d}-S${suffix}`;
}

function buildPricing(
  lines: { price: number; gst: number; quantity: number }[],
  discount: number,
  shipToState: string,
  sellerState = "Maharashtra"
) {
  const subtotal = round2(
    lines.reduce((s, l) => s + l.price * l.quantity, 0)
  );
  const cappedDiscount = Math.min(discount, subtotal);
  const after = round2(subtotal - cappedDiscount);
  const avgGst =
    lines.reduce((s, l) => s + l.gst * l.price * l.quantity, 0) /
    Math.max(subtotal, 1);
  const totalTax = round2(after * (avgGst / 100));
  const sameState = shipToState === sellerState;
  const cgst = sameState ? round2(totalTax / 2) : 0;
  const sgst = sameState ? round2(totalTax / 2) : 0;
  const igst = sameState ? 0 : totalTax;
  const shippingCost = after >= 2999 ? 0 : 99;
  const grandTotal = round2(after + totalTax + shippingCost);
  return {
    subtotal,
    discount: cappedDiscount,
    subtotalAfterDiscount: after,
    cgst,
    sgst,
    igst,
    totalTax,
    shippingCost,
    grandTotal,
  };
}

async function clearPreviousSeed(db: mongoose.mongo.Db) {
  const seedUsers = await db
    .collection("users")
    .find({ email: { $regex: `@${SEED_EMAIL_DOMAIN}$` } })
    .project({ _id: 1 })
    .toArray();
  const seedUserIds = seedUsers.map((u) => u._id);

  if (seedUserIds.length) {
    await db.collection("orders").deleteMany({ user: { $in: seedUserIds } });
    await db.collection("carts").deleteMany({ user: { $in: seedUserIds } });
    await db.collection("wishlists").deleteMany({ user: { $in: seedUserIds } });
    await db.collection("reviews").deleteMany({ user: { $in: seedUserIds } });
    await db.collection("users").deleteMany({ _id: { $in: seedUserIds } });
  }

  await db.collection("orders").deleteMany({ notes: SEED_NOTE });
  await db.collection("callbackrequests").deleteMany({
    adminNote: SEED_NOTE,
  });
  await db.collection("coupons").deleteMany({
    code: { $in: ["WELCOME10", "RIDER15", "FLAT500", "MONSOON20"] },
  });

  const removedSales = await db.collection("salecampaigns").deleteMany({
    slug: { $regex: `^${SEED_SALE_SLUG_PREFIX}` },
  });

  console.log(
    `Cleared previous seed users: ${seedUserIds.length}, seed sales: ${removedSales.deletedCount}`
  );
}

async function seed() {
  await mongoose.connect(MONGODB_URI as string);
  const db = mongoose.connection.db!;
  console.log("Connected to MongoDB");

  await clearPreviousSeed(db);

  const products = (await db
    .collection("products")
    .find({ isActive: true })
    .project({
      title: 1,
      category: 1,
      variants: 1,
      isActive: 1,
    })
    .toArray()) as unknown as ProductRow[];

  if (products.length === 0) {
    console.error("No active products found. Add products first.");
    process.exit(1);
  }

  console.log(`Using ${products.length} existing products`);

  // Tweak stock so merchandising analytics have clear signals
  const byTitle = new Map(products.map((p) => [p.title, p]));

  // Dead stock candidate: stocked but we will not sell it in the last 60 days
  const highway = byTitle.get("Highway Heritage Backpack");
  if (highway?.variants[0]) {
    await db.collection("products").updateOne(
      { _id: highway._id, "variants._id": highway.variants[0]._id },
      { $set: { "variants.$.stock": 28 } }
    );
    highway.variants[0].stock = 28;
  }

  // Restock gloves a bit — will be a low-stock bestseller after sales
  const gloves = byTitle.get("Ironhide Road Half Gloves");
  if (gloves?.variants[0]) {
    await db.collection("products").updateOne(
      { _id: gloves._id, "variants._id": gloves.variants[0]._id },
      { $set: { "variants.$.stock": 4 } }
    );
    gloves.variants[0].stock = 4;
  }

  // Restock dustline slightly so older months can sell it
  const dustline = byTitle.get("Dustline Trail Leather Jacket");
  if (dustline?.variants[0]) {
    await db.collection("products").updateOne(
      { _id: dustline._id, "variants._id": dustline.variants[0]._id },
      { $set: { "variants.$.stock": 12 } }
    );
    dustline.variants[0].stock = 12;
  }

  const sellables: Sellable[] = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      if (!variant.isActive) continue;
      let weight = 10;
      // Bestsellers
      if (product.title.includes("Ravencrest")) weight = 28;
      if (product.title.includes("Ironclad")) weight = 22;
      if (product.title.includes("Blackthorn")) weight = 18;
      if (product.title.includes("Forgepath")) weight = 16;
      if (product.title.includes("Desert Hawk")) weight = 8; // high wishlist, fewer sales
      if (product.title.includes("Ironhide")) weight = 20; // low-stock bestseller
      if (product.title.includes("Dustline")) weight = 12;
      // Dead stock — almost never sold (especially recent)
      if (product.title.includes("Highway Heritage")) weight = 1;

      const label = [variant.size, variant.color].filter(Boolean).join(" / ");
      sellables.push({ product, variant, label, weight });
    }
  }

  const now = new Date();
  const windowStart = addDays(now, -Math.round(MONTHS * 30.5));

  // ── Sale campaigns (ended / live / scheduled) ─────────────────────────────
  const productByKey = (matcher: (title: string) => boolean) =>
    products.filter((p) => matcher(p.title));

  const jackets = productByKey(
    (t) =>
      t.includes("Ravencrest") ||
      t.includes("Ironclad") ||
      t.includes("Dustline") ||
      t.includes("Blackthorn")
  );
  const gear = productByKey(
    (t) =>
      t.includes("Forgepath") ||
      t.includes("Ironhide") ||
      t.includes("Desert Hawk") ||
      t.includes("Highway Heritage")
  );
  const flashLive = productByKey(
    (t) =>
      t.includes("Ravencrest") ||
      t.includes("Blackthorn") ||
      t.includes("Forgepath") ||
      t.includes("Ironhide")
  );
  const upcoming = productByKey(
    (t) => t.includes("Dustline") || t.includes("Desert Hawk") || t.includes("Ironclad")
  );

  function saleItems(
    list: ProductRow[],
    discountType: "percentage" | "amount",
    value: number
  ): SeedSaleItem[] {
    return list.map((p) => ({
      product: p._id,
      discountType,
      value,
    }));
  }

  const saleDefs: Array<{
    title: string;
    slug: string;
    subtitle: string;
    badgeLabel: string;
    homeHeadline: string;
    startsAt: Date;
    endsAt: Date;
    isActive: boolean;
    showOnHome: boolean;
    showInNav: boolean;
    priority: number;
    allowCoupons: boolean;
    defaultDiscountType: "percentage" | "amount";
    defaultDiscountValue: number;
    items: SeedSaleItem[];
    description: string;
  }> = [
    {
      title: "Summer Kickoff Cut",
      slug: `${SEED_SALE_SLUG_PREFIX}summer-kickoff`,
      subtitle: "Leather jackets for the open road",
      badgeLabel: "SUMMER",
      homeHeadline: "Summer Kickoff",
      startsAt: addDays(windowStart, 12),
      endsAt: addDays(windowStart, 22),
      isActive: true,
      showOnHome: false,
      showInNav: false,
      priority: 40,
      allowCoupons: true,
      defaultDiscountType: "percentage",
      defaultDiscountValue: 20,
      items: saleItems(jackets, "percentage", 20),
      description: "Ended campaign — jackets at 20% off for analytics history.",
    },
    {
      title: "Midyear Gear Drop",
      slug: `${SEED_SALE_SLUG_PREFIX}midyear-gear`,
      subtitle: "Flat discounts on packs, gloves & lids",
      badgeLabel: "GEAR",
      homeHeadline: "Gear Drop",
      startsAt: addDays(now, -95),
      endsAt: addDays(now, -81),
      isActive: true,
      showOnHome: false,
      showInNav: false,
      priority: 50,
      allowCoupons: true,
      defaultDiscountType: "amount",
      defaultDiscountValue: 750,
      items: saleItems(gear, "amount", 750),
      description: "Ended campaign — flat ₹750 off selected gear.",
    },
    {
      title: "Monsoon Rider Week",
      slug: `${SEED_SALE_SLUG_PREFIX}monsoon-rider-week`,
      subtitle: "Wet-weather ready kit",
      badgeLabel: "RAIN",
      homeHeadline: "Rider Week",
      startsAt: addDays(now, -28),
      endsAt: addDays(now, -14),
      isActive: true,
      showOnHome: false,
      showInNav: false,
      priority: 70,
      allowCoupons: true,
      defaultDiscountType: "percentage",
      defaultDiscountValue: 15,
      items: saleItems(
        [...jackets.slice(0, 3), ...gear.slice(0, 2)],
        "percentage",
        15
      ),
      description: "Recently ended — strong conversion for sale analytics.",
    },
    {
      title: "Flash Cut — Live Now",
      slug: `${SEED_SALE_SLUG_PREFIX}flash-cut-live`,
      subtitle: "Limited window on bestsellers",
      badgeLabel: "FLASH",
      homeHeadline: "Flash Cut",
      startsAt: addDays(now, -5),
      endsAt: addDays(now, 9),
      isActive: true,
      showOnHome: true,
      showInNav: true,
      priority: 100,
      allowCoupons: false, // sale blocks coupons
      defaultDiscountType: "percentage",
      defaultDiscountValue: 25,
      items: saleItems(flashLive, "percentage", 25),
      description: "Currently live — no coupons; drives current sale analytics.",
    },
    {
      title: "Diwali Preview (Scheduled)",
      slug: `${SEED_SALE_SLUG_PREFIX}diwali-preview`,
      subtitle: "Coming soon — festive leather picks",
      badgeLabel: "SOON",
      homeHeadline: "Diwali Preview",
      startsAt: addDays(now, 12),
      endsAt: addDays(now, 26),
      isActive: true,
      showOnHome: true,
      showInNav: true,
      priority: 90,
      allowCoupons: true,
      defaultDiscountType: "percentage",
      defaultDiscountValue: 18,
      items: saleItems(upcoming, "percentage", 18),
      description: "Scheduled future sale — no orders yet.",
    },
  ];

  const saleCampaigns: SeedSaleCampaign[] = [];
  for (const def of saleDefs) {
    if (def.items.length === 0) {
      console.warn(`Skipping sale ${def.slug}: no matching products`);
      continue;
    }
    const _id = new Types.ObjectId();
    await db.collection("salecampaigns").insertOne({
      _id,
      title: def.title,
      slug: def.slug,
      subtitle: def.subtitle,
      description: def.description,
      badgeLabel: def.badgeLabel,
      homeHeadline: def.homeHeadline,
      bannerCtaLabel: "Shop The Sale",
      bannerCtaHref: `/sale/${def.slug}`,
      bannerCtaPosition: "bottom-left",
      seoTitle: def.title,
      seoDescription: def.subtitle,
      startsAt: def.startsAt,
      endsAt: def.endsAt,
      isActive: def.isActive,
      showOnHome: def.showOnHome,
      showInNav: def.showInNav,
      priority: def.priority,
      homeLimit: 5,
      allowCoupons: def.allowCoupons,
      defaultDiscountType: def.defaultDiscountType,
      defaultDiscountValue: def.defaultDiscountValue,
      items: def.items,
      stats: {
        views: 0,
        addToCarts: 0,
        orders: 0,
        unitsSold: 0,
        revenue: 0,
      },
      createdAt: addDays(def.startsAt, -3),
      updatedAt: now,
    });
    saleCampaigns.push({
      _id,
      title: def.title,
      slug: def.slug,
      startsAt: def.startsAt,
      endsAt: def.endsAt,
      isActive: def.isActive,
      allowCoupons: def.allowCoupons,
      priority: def.priority,
      items: def.items,
      productIds: new Set(def.items.map((i) => String(i.product))),
    });
  }
  console.log(`Sale campaigns: ${saleCampaigns.length}`);

  const saleStatsAcc = new Map<
    string,
    { orderIds: Set<string>; units: number; revenue: number }
  >();
  for (const c of saleCampaigns) {
    saleStatsAcc.set(String(c._id), {
      orderIds: new Set(),
      units: 0,
      revenue: 0,
    });
  }

  function isDuringAnySale(at: Date): boolean {
    return saleCampaigns.some(
      (c) => c.isActive && at >= c.startsAt && at < c.endsAt
    );
  }

  // ── Coupons ───────────────────────────────────────────────────────────────
  const couponDocs = [
    {
      code: "WELCOME10",
      name: "Welcome 10%",
      description: "10% off for new riders",
      customerDescription: "10% off your first order",
      type: "percentage",
      value: 10,
      minOrderValue: 1500,
      maxDiscount: 800,
      startsAt: windowStart,
      expiresAt: addDays(now, 90),
      timezone: "Asia/Kolkata",
      status: "active",
      usageLimit: 500,
      usedCount: 0,
      perUserLimit: 1,
      usedBy: [] as { user: Types.ObjectId; count: number }[],
      applicableProducts: [],
      applicableCategories: [],
      excludedProducts: [],
      firstOrderOnly: true,
      restoreOnCancel: true,
      deletedAt: null,
      isActive: true,
      createdAt: windowStart,
      updatedAt: now,
    },
    {
      code: "RIDER15",
      name: "Rider 15%",
      description: "15% off jackets & gear",
      customerDescription: "15% off jackets and gear",
      type: "percentage",
      value: 15,
      minOrderValue: 3000,
      maxDiscount: 1500,
      startsAt: windowStart,
      expiresAt: addDays(now, 60),
      timezone: "Asia/Kolkata",
      status: "active",
      usageLimit: 300,
      usedCount: 0,
      perUserLimit: 2,
      usedBy: [],
      applicableProducts: [],
      applicableCategories: [],
      excludedProducts: [],
      firstOrderOnly: false,
      restoreOnCancel: true,
      deletedAt: null,
      isActive: true,
      createdAt: addDays(windowStart, 20),
      updatedAt: now,
    },
    {
      code: "FLAT500",
      name: "Flat ₹500",
      description: "Flat ₹500 off",
      customerDescription: "₹500 off orders over ₹4,000",
      type: "flat",
      value: 500,
      minOrderValue: 4000,
      maxDiscount: null,
      startsAt: windowStart,
      expiresAt: addDays(now, 45),
      timezone: "Asia/Kolkata",
      status: "active",
      usageLimit: 200,
      usedCount: 0,
      perUserLimit: 1,
      usedBy: [],
      applicableProducts: [],
      applicableCategories: [],
      excludedProducts: [],
      firstOrderOnly: false,
      restoreOnCancel: true,
      deletedAt: null,
      isActive: true,
      createdAt: addDays(windowStart, 40),
      updatedAt: now,
    },
    {
      code: "MONSOON20",
      name: "Monsoon 20%",
      description: "Monsoon special 20%",
      customerDescription: "20% off this monsoon",
      type: "percentage",
      value: 20,
      minOrderValue: 2500,
      maxDiscount: 2000,
      startsAt: addDays(now, -45),
      expiresAt: addDays(now, 30),
      timezone: "Asia/Kolkata",
      status: "active",
      usageLimit: 150,
      usedCount: 0,
      perUserLimit: 1,
      usedBy: [],
      applicableProducts: [],
      applicableCategories: [],
      excludedProducts: [],
      firstOrderOnly: false,
      restoreOnCancel: true,
      deletedAt: null,
      isActive: true,
      createdAt: addDays(now, -45),
      updatedAt: now,
    },
  ];

  await db.collection("coupons").insertMany(couponDocs);
  const coupons = await db
    .collection("coupons")
    .find({ code: { $in: couponDocs.map((c) => c.code) } })
    .toArray();
  console.log(`Coupons: ${coupons.length}`);

  // ── Customers (spread signup dates across 5 months) ───────────────────────
  const CUSTOMER_COUNT = 72;
  const passwordHash = await bcrypt.hash("SeedPass123!", 10);
  const customers: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    createdAt: Date;
    channel: "google" | "email" | "phone" | "other";
  }[] = [];

  const userDocs = [];
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const email = `rider${String(i + 1).padStart(3, "0")}@${SEED_EMAIL_DOMAIN}`;
    // Bias newer signups toward recent months (growth)
    const t = Math.pow(rand(), 0.65);
    const createdAt = new Date(
      windowStart.getTime() + t * (now.getTime() - windowStart.getTime())
    );

    const channelRoll = rand();
    let channel: "google" | "email" | "phone" | "other";
    const doc: Record<string, unknown> = {
      name,
      email,
      role: "customer",
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: false,
      createdAt,
      updatedAt: createdAt,
    };

    if (channelRoll < 0.42) {
      channel = "google";
      doc.googleId = `seed-google-${i + 1}`;
      doc.picture = null;
      doc.password = null;
    } else if (channelRoll < 0.78) {
      channel = "email";
      doc.password = passwordHash;
    } else if (channelRoll < 0.92) {
      channel = "phone";
      doc.phone = `+9198${String(10000000 + i).slice(0, 8)}`;
      doc.isPhoneVerified = true;
      doc.password = null;
      // keep email for admin UX
    } else {
      channel = "other";
      doc.password = null;
    }

    const _id = new Types.ObjectId();
    doc._id = _id;
    userDocs.push(doc);
    customers.push({ _id, name, email, createdAt, channel });
  }

  await db.collection("users").insertMany(userDocs);
  console.log(`Customers: ${customers.length}`);

  // ── Orders across 5 months ────────────────────────────────────────────────
  // ~2–8 orders/day with weekend + monthly growth bias
  type OrderDoc = Record<string, unknown>;
  const orders: OrderDoc[] = [];
  const couponUsage = new Map<string, { count: number; users: Map<string, number> }>();
  for (const c of coupons) {
    couponUsage.set(c.code as string, { count: 0, users: new Map() });
  }

  let orderSeq = 0;
  const buyerOrderDates = new Map<string, Date[]>();

  // Pre-assign customer personas for analytics segments
  const vipIds = new Set(
    pickN(customers, 8).map((c) => String(c._id))
  );
  const oneAndDoneIds = new Set(
    pickN(
      customers.filter((c) => !vipIds.has(String(c._id))),
      12
    ).map((c) => String(c._id))
  );
  const neverBuyIds = new Set(
    pickN(
      customers.filter(
        (c) => !vipIds.has(String(c._id)) && !oneAndDoneIds.has(String(c._id))
      ),
      10
    ).map((c) => String(c._id))
  );

  // Day-by-day order generation
  for (
    let day = new Date(windowStart);
    day <= now;
    day = addDays(day, 1)
  ) {
    const daysFromStart =
      (day.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24);
    const progress = daysFromStart / (MONTHS * 30.5);
    // Growth curve: ~2 early → ~7 late, weekends +20%
    const dow = day.getDay();
    const weekendBoost = dow === 0 || dow === 6 ? 1.25 : 1;
    const midDay = new Date(day);
    midDay.setHours(12, 0, 0, 0);
    const saleBoost = isDuringAnySale(midDay) ? 1.85 : 1;
    const base = (2 + progress * 5.5) * weekendBoost * saleBoost;
    const count = Math.max(0, Math.round(base + (rand() - 0.4) * 2));

    for (let n = 0; n < count; n++) {
      // Prefer customers who already signed up by this day
      const eligible = customers.filter(
        (c) =>
          c.createdAt <= day &&
          !neverBuyIds.has(String(c._id))
      );
      if (eligible.length === 0) continue;

      let customer = pick(eligible);
      // VIPs buy more often
      if (rand() < 0.35) {
        const vipEligible = eligible.filter((c) => vipIds.has(String(c._id)));
        if (vipEligible.length) customer = pick(vipEligible);
      }

      const uid = String(customer._id);
      const prior = buyerOrderDates.get(uid) || [];

      // One-and-done: exactly one order, older than ~60 days
      if (oneAndDoneIds.has(uid)) {
        if (prior.length >= 1) continue;
        if (day > addDays(now, -65)) continue;
      }

      const hour = randInt(8, 22);
      const minute = randInt(0, 59);
      const createdAt = new Date(day);
      createdAt.setHours(hour, minute, randInt(0, 59), 0);
      if (createdAt > now) continue;
      if (createdAt < customer.createdAt) continue;

      orderSeq += 1;

      // Line items — 1–3 products; avoid Highway Heritage in last 60 days
      const recentCutoff = addDays(now, -60);
      const itemCount = rand() < 0.55 ? 1 : rand() < 0.8 ? 2 : 3;
      const lines: {
        product: Types.ObjectId;
        variant: Types.ObjectId;
        title: string;
        variantLabel: string;
        sku: string;
        price: number;
        gst: number;
        quantity: number;
        total: number;
        saleCampaign?: Types.ObjectId;
      }[] = [];

      const liveSaleProductIds = new Set<string>();
      for (const c of saleCampaigns) {
        if (c.isActive && createdAt >= c.startsAt && createdAt < c.endsAt) {
          for (const pid of c.productIds) liveSaleProductIds.add(pid);
        }
      }

      const usedProducts = new Set<string>();
      for (let li = 0; li < itemCount; li++) {
        let pool = sellables.filter((s) => !usedProducts.has(String(s.product._id)));
        if (createdAt >= recentCutoff) {
          pool = pool.filter(
            (s) => !s.product.title.includes("Highway Heritage")
          );
        }
        // Bias gloves sales into last 45 days for low-stock bestseller
        if (createdAt >= addDays(now, -45) && rand() < 0.22) {
          const g = pool.find((s) => s.product.title.includes("Ironhide"));
          if (g) pool = [g, ...pool];
        }
        // During sales, strongly prefer on-sale products
        if (liveSaleProductIds.size > 0 && rand() < 0.72) {
          const onSale = pool.filter((s) =>
            liveSaleProductIds.has(String(s.product._id))
          );
          if (onSale.length) pool = onSale;
        }
        if (pool.length === 0) break;
        const chosen = weightedPick(pool);
        usedProducts.add(String(chosen.product._id));
        const qty = chosen.product.title.includes("Ironhide")
          ? randInt(1, 2)
          : randInt(1, 2);

        const originalPrice = chosen.variant.price;
        const saleMatch = findLiveSale(
          saleCampaigns,
          String(chosen.product._id),
          createdAt
        );
        const unitPrice = saleMatch
          ? computeSalePrice(
              originalPrice,
              saleMatch.item.discountType,
              saleMatch.item.value
            )
          : originalPrice;
        const total = round2(unitPrice * qty);
        const line: (typeof lines)[number] = {
          product: chosen.product._id,
          variant: chosen.variant._id,
          title: chosen.product.title,
          variantLabel: chosen.label,
          sku: chosen.variant.sku,
          price: unitPrice,
          gst: chosen.variant.gst ?? 18,
          quantity: qty,
          total,
        };
        if (saleMatch) {
          line.saleCampaign = saleMatch.campaign._id;
        }
        lines.push(line);
      }
      if (lines.length === 0) continue;

      const geo = pick(CITIES);
      let discount = 0;
      let couponPayload:
        | {
            code: string;
            type: "percentage" | "flat";
            value: number;
            discountAmount: number;
          }
        | undefined;

      const saleBlocksCoupons = lines.some((l) => {
        if (!l.saleCampaign) return false;
        const c = saleCampaigns.find(
          (s) => String(s._id) === String(l.saleCampaign)
        );
        return c ? c.allowCoupons === false : false;
      });

      // ~28% of orders use a coupon (unless a no-coupon sale priced the cart)
      if (!saleBlocksCoupons && rand() < 0.28 && coupons.length) {
        const coupon = pick(coupons);
        const code = coupon.code as string;
        const type = coupon.type as "percentage" | "flat";
        const value = coupon.value as number;
        const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
        if (subtotal >= (coupon.minOrderValue as number)) {
          discount =
            type === "percentage"
              ? round2(
                  Math.min(
                    subtotal * (value / 100),
                    (coupon.maxDiscount as number) ?? Infinity
                  )
                )
              : Math.min(value, subtotal);
          couponPayload = {
            code,
            type,
            value,
            discountAmount: discount,
          };
          const usage = couponUsage.get(code)!;
          usage.count += 1;
          usage.users.set(uid, (usage.users.get(uid) || 0) + 1);
        }
      }

      const pricing = buildPricing(
        lines.map((l) => ({
          price: l.price,
          gst: l.gst,
          quantity: l.quantity,
        })),
        discount,
        geo.state
      );

      // Status distribution
      // Older orders more likely delivered; recent mix includes pending/stuck
      const ageDays =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      let status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded";

      const roll = rand();
      if (ageDays < 2) {
        if (roll < 0.12) status = "pending";
        else if (roll < 0.22) status = "paid";
        else if (roll < 0.38) status = "processing";
        else if (roll < 0.55) status = "shipped";
        else if (roll < 0.88) status = "delivered";
        else if (roll < 0.95) status = "cancelled";
        else status = "refunded";
      } else if (ageDays < 10) {
        if (roll < 0.05) status = "pending";
        else if (roll < 0.12) status = "paid"; // some stuck
        else if (roll < 0.22) status = "processing"; // some stuck
        else if (roll < 0.35) status = "shipped";
        else if (roll < 0.88) status = "delivered";
        else if (roll < 0.95) status = "cancelled";
        else status = "refunded";
      } else {
        if (roll < 0.82) status = "delivered";
        else if (roll < 0.9) status = "cancelled";
        else if (roll < 0.96) status = "refunded";
        else if (roll < 0.98) status = "shipped";
        else status = "processing"; // rare old stuck
      }

      // Ensure a handful of clearly stuck orders (>3 days, paid/processing)
      if (
        ageDays > 4 &&
        ageDays < 20 &&
        orders.filter(
          (o) => o.status === "paid" || o.status === "processing"
        ).length < 8 &&
        rand() < 0.08
      ) {
        status = rand() < 0.5 ? "paid" : "processing";
      }

      const statusHistory: {
        status: string;
        timestamp: Date;
        note?: string;
        trackingNumber?: string;
        trackingUrl?: string;
      }[] = [{ status: "pending", timestamp: createdAt, note: "Order placed" }];

      const paymentMethod = pickPayment();
      const paidAt =
        status === "pending" || (status === "cancelled" && rand() < 0.55)
          ? undefined
          : addHours(createdAt, rand() * 0.5);

      if (paidAt) {
        statusHistory.push({
          status: "paid",
          timestamp: paidAt,
          note: "Payment captured",
        });
      }

      if (
        ["processing", "shipped", "delivered", "refunded"].includes(status) ||
        (status === "cancelled" && paidAt && rand() < 0.3)
      ) {
        const processingAt = addHours(
          paidAt || createdAt,
          2 + rand() * 28
        );
        statusHistory.push({
          status: "processing",
          timestamp: clampDate(processingAt, createdAt, now),
          note: "Seller preparing shipment",
        });
      }

      if (["shipped", "delivered"].includes(status)) {
        const proc = statusHistory.find((h) => h.status === "processing");
        const shippedAt = addHours(
          proc?.timestamp || paidAt || createdAt,
          12 + rand() * 60
        );
        const trackingNumber = `AWB${randInt(10000000, 99999999)}`;
        statusHistory.push({
          status: "shipped",
          timestamp: clampDate(shippedAt, createdAt, now),
          note: "Handed to courier",
          trackingNumber,
          trackingUrl: `https://track.example/${trackingNumber}`,
        });
      }

      if (status === "delivered") {
        const shipped = statusHistory.find((h) => h.status === "shipped");
        const deliveredAt = addHours(
          shipped?.timestamp || createdAt,
          24 + rand() * 96
        );
        statusHistory.push({
          status: "delivered",
          timestamp: clampDate(deliveredAt, createdAt, now),
          note: "Delivered to customer",
        });
      }

      if (status === "cancelled") {
        statusHistory.push({
          status: "cancelled",
          timestamp: addHours(createdAt, 1 + rand() * 48),
          note: "Order cancelled",
        });
      }

      if (status === "refunded") {
        if (!statusHistory.some((h) => h.status === "paid")) {
          statusHistory.push({
            status: "paid",
            timestamp: addHours(createdAt, 0.2),
            note: "Payment captured",
          });
        }
        statusHistory.push({
          status: "refunded",
          timestamp: addHours(createdAt, 24 + rand() * 120),
          note: "Refund processed",
        });
      }

      const shippedEntry = statusHistory.find((h) => h.status === "shipped");
      const rzOrderId = `order_seed_${orderSeq}_${createdAt.getTime()}`;
      const amountPaise = Math.round(pricing.grandTotal * 100);

      const orderDoc: OrderDoc = {
        orderNumber: orderNumberFor(createdAt, orderSeq),
        user: customer._id,
        items: lines,
        shippingAddress: {
          name: customer.name,
          phone: `9${randInt(100000000, 999999999)}`,
          line1: `${randInt(12, 240)} ${pick(["MG Road", "Ring Road", "Station Rd", "Lake View", "Market Street"])}`,
          line2: rand() < 0.4 ? `Apt ${randInt(1, 40)}` : undefined,
          city: geo.city,
          state: geo.state,
          pincode: geo.pincode,
          country: "IN",
        },
        pricing,
        payment: {
          razorpayOrderId: rzOrderId,
          razorpayPaymentId: paidAt
            ? `pay_seed_${orderSeq}`
            : undefined,
          razorpaySignature: paidAt ? `sig_seed_${orderSeq}` : undefined,
          method: paidAt ? paymentMethod.method : undefined,
          ...((paidAt ? paymentMethod.extra() : {}) as object),
          amountPaid: paidAt ? amountPaise : 0,
          currency: "INR",
          paidAt,
          webhookEvents: paidAt ? ["payment.captured"] : [],
        },
        status,
        statusHistory,
        inventoryDeducted: [
          "paid",
          "processing",
          "shipped",
          "delivered",
          "refunded",
        ].includes(status),
        saleStatsRecorded:
          lines.some((l) => l.saleCampaign) && PAID_STATUSES.includes(status),
        emailsSent: {
          confirmation: Boolean(paidAt),
          shipped: ["shipped", "delivered"].includes(status),
          delivered: status === "delivered",
        },
        trackingNumber: shippedEntry?.trackingNumber,
        trackingUrl: shippedEntry?.trackingUrl,
        notes: SEED_NOTE,
        cancelReason:
          status === "cancelled" ? pick(CANCEL_REASONS) : undefined,
        idempotencyKey: `seed-${orderSeq}`,
        createdAt,
        updatedAt: statusHistory[statusHistory.length - 1]!.timestamp,
      };

      if (couponPayload) {
        orderDoc.coupon = couponPayload;
      }

      // Accumulate sale campaign conversion stats (paid-path only)
      if (PAID_STATUSES.includes(status)) {
        const perCampaign = new Map<string, { units: number; revenue: number }>();
        for (const line of lines) {
          if (!line.saleCampaign) continue;
          const cid = String(line.saleCampaign);
          const cur = perCampaign.get(cid) || { units: 0, revenue: 0 };
          cur.units += line.quantity;
          cur.revenue += line.total;
          perCampaign.set(cid, cur);
        }
        for (const [cid, data] of perCampaign) {
          const acc = saleStatsAcc.get(cid);
          if (!acc) continue;
          acc.orderIds.add(orderDoc.orderNumber as string);
          acc.units += data.units;
          acc.revenue += data.revenue;
        }
      }

      orders.push(orderDoc);
      prior.push(createdAt);
      buyerOrderDates.set(uid, prior);
    }
  }

  // Guarantee one-and-done customers have an old single order if missing
  for (const uid of oneAndDoneIds) {
    const existing = buyerOrderDates.get(uid) || [];
    if (existing.length > 0) continue;
    const customer = customers.find((c) => String(c._id) === uid)!;
    const createdAt = clampDate(
      addDays(now, -randInt(70, 120)),
      customer.createdAt,
      addDays(now, -65)
    );
    orderSeq += 1;
    const chosen = weightedPick(
      sellables.filter((s) => !s.product.title.includes("Highway Heritage"))
    );
    const lines = [
      {
        product: chosen.product._id,
        variant: chosen.variant._id,
        title: chosen.product.title,
        variantLabel: chosen.label,
        sku: chosen.variant.sku,
        price: chosen.variant.price,
        gst: chosen.variant.gst ?? 18,
        quantity: 1,
        total: chosen.variant.price,
      },
    ];
    const geo = pick(CITIES);
    const pricing = buildPricing(
      lines.map((l) => ({
        price: l.price,
        gst: l.gst,
        quantity: l.quantity,
      })),
      0,
      geo.state
    );
    const paidAt = addHours(createdAt, 0.1);
    const processingAt = addHours(paidAt, 8);
    const shippedAt = addHours(processingAt, 24);
    const deliveredAt = addHours(shippedAt, 48);
    orders.push({
      orderNumber: orderNumberFor(createdAt, orderSeq),
      user: customer._id,
      items: lines,
      shippingAddress: {
        name: customer.name,
        phone: `9${randInt(100000000, 999999999)}`,
        line1: `${randInt(12, 240)} Seed Lane`,
        city: geo.city,
        state: geo.state,
        pincode: geo.pincode,
        country: "IN",
      },
      pricing,
      payment: {
        razorpayOrderId: `order_seed_oad_${orderSeq}`,
        razorpayPaymentId: `pay_seed_oad_${orderSeq}`,
        method: "upi",
        vpa: "seed@oksbi",
        amountPaid: Math.round(pricing.grandTotal * 100),
        currency: "INR",
        paidAt,
        webhookEvents: ["payment.captured"],
      },
      status: "delivered",
      statusHistory: [
        { status: "pending", timestamp: createdAt },
        { status: "paid", timestamp: paidAt },
        { status: "processing", timestamp: processingAt },
        {
          status: "shipped",
          timestamp: shippedAt,
          trackingNumber: `AWB${randInt(10000000, 99999999)}`,
        },
        { status: "delivered", timestamp: deliveredAt },
      ],
      inventoryDeducted: true,
      saleStatsRecorded: false,
      emailsSent: { confirmation: true, shipped: true, delivered: true },
      notes: SEED_NOTE,
      idempotencyKey: `seed-oad-${orderSeq}`,
      createdAt,
      updatedAt: deliveredAt,
    });
    buyerOrderDates.set(uid, [createdAt]);
  }

  if (orders.length) {
    // Insert in chunks to avoid huge payloads
    const CHUNK = 200;
    for (let i = 0; i < orders.length; i += CHUNK) {
      await db.collection("orders").insertMany(orders.slice(i, i + CHUNK));
    }
  }
  console.log(`Orders: ${orders.length}`);

  // Write sale campaign funnel + conversion counters
  for (const campaign of saleCampaigns) {
    const acc = saleStatsAcc.get(String(campaign._id)) || {
      orderIds: new Set<string>(),
      units: 0,
      revenue: 0,
    };
    const paidOrders = acc.orderIds.size;
    // Realistic funnel: views >> carts >> orders
    const views =
      paidOrders === 0
        ? campaign.startsAt > now
          ? randInt(40, 180) // scheduled — a bit of teaser traffic
          : randInt(120, 400)
        : Math.max(paidOrders * randInt(18, 35), paidOrders + 50);
    const addToCarts =
      paidOrders === 0
        ? Math.round(views * (0.08 + rand() * 0.1))
        : Math.max(
            paidOrders + randInt(5, 40),
            Math.round(views * (0.12 + rand() * 0.1))
          );

    await db.collection("salecampaigns").updateOne(
      { _id: campaign._id },
      {
        $set: {
          stats: {
            views,
            addToCarts,
            orders: paidOrders,
            unitsSold: acc.units,
            revenue: round2(acc.revenue),
          },
        },
      }
    );
  }
  console.log("Sale campaign stats updated");

  // Update coupon usedCount / usedBy
  for (const coupon of coupons) {
    const usage = couponUsage.get(coupon.code as string);
    if (!usage) continue;
    const usedBy = [...usage.users.entries()].map(([userId, count]) => ({
      user: new Types.ObjectId(userId),
      count,
    }));
    await db.collection("coupons").updateOne(
      { _id: coupon._id },
      { $set: { usedCount: usage.count, usedBy } }
    );
  }

  // ── Abandoned carts + price drift ─────────────────────────────────────────
  const abandonCustomers = pickN(
    customers.filter((c) => !neverBuyIds.has(String(c._id)) || rand() < 0.5),
    22
  );
  const cartDocs = [];
  for (const customer of abandonCustomers) {
    // Skip if they have a very recent paid order after we set cart updatedAt
    const ages = [
      { hours: 6, w: 2 }, // recent — shows in age buckets but not "abandoned" (>24h)
      { hours: 36, w: 4 },
      { hours: 80, w: 4 },
      { hours: 200, w: 5 },
      { hours: 400, w: 3 },
    ];
    const age = weightedPick(ages.map((a) => ({ ...a, weight: a.w })));
    const updatedAt = addHours(now, -age.hours);
    const items = pickN(sellables, randInt(1, 3)).map((s) => {
      // Price drift on ~30% of items
      const drift = rand() < 0.35;
      const priceAtAdd = drift
        ? round2(s.variant.price * (rand() < 0.5 ? 0.85 : 1.18))
        : s.variant.price;
      return {
        _id: new Types.ObjectId(),
        product: s.product._id,
        variant: s.variant._id,
        quantity: randInt(1, 2),
        priceAtAdd,
        addedAt: addHours(updatedAt, -randInt(1, 48)),
      };
    });

    cartDocs.push({
      user: customer._id,
      items,
      coupon: null,
      createdAt: addDays(updatedAt, -randInt(3, 20)),
      updatedAt,
    });
  }
  if (cartDocs.length) {
    await db.collection("carts").insertMany(cartDocs);
  }
  console.log(`Abandoned/intent carts: ${cartDocs.length}`);

  // ── Wishlists (bias Desert Hawk + Highway for high-wishlist low-sales) ───
  const wishlistTargets = sellables.filter(
    (s) =>
      s.product.title.includes("Desert Hawk") ||
      s.product.title.includes("Highway Heritage") ||
      s.product.title.includes("Dustline")
  );
  const wishlistCustomers = pickN(customers, 40);
  const wishlistDocs = [];
  for (const customer of wishlistCustomers) {
    const must = pickN(wishlistTargets, randInt(1, Math.min(3, wishlistTargets.length)));
    const extra = pickN(
      sellables.filter(
        (s) => !must.some((m) => String(m.product._id) === String(s.product._id))
      ),
      randInt(0, 2)
    );
    const items = [...must, ...extra].map((s) => ({
      _id: new Types.ObjectId(),
      product: s.product._id,
      variant: s.variant._id,
      addedAt: addDays(now, -randInt(1, 100)),
    }));
    wishlistDocs.push({
      user: customer._id,
      items,
      createdAt: customer.createdAt,
      updatedAt: now,
    });
  }
  if (wishlistDocs.length) {
    await db.collection("wishlists").insertMany(wishlistDocs);
  }
  console.log(`Wishlists: ${wishlistDocs.length}`);

  // ── Reviews (verified purchases on delivered orders) ──────────────────────
  const deliveredByUser = new Map<string, OrderDoc[]>();
  for (const o of orders) {
    if (o.status !== "delivered") continue;
    const uid = String(o.user);
    const list = deliveredByUser.get(uid) || [];
    list.push(o);
    deliveredByUser.set(uid, list);
  }

  const reviewDocs: Record<string, unknown>[] = [];
  const reviewedPair = new Set<string>();

  for (const [uid, userOrders] of deliveredByUser) {
    if (rand() > 0.55) continue;
    const order = pick(userOrders);
    const items = order.items as {
      product: Types.ObjectId;
      title: string;
    }[];
    const item = pick(items);
    const key = `${uid}:${item.product}`;
    if (reviewedPair.has(key)) continue;
    reviewedPair.add(key);

    // Slightly lower ratings for one product to surface "low rated"
    let rating = weightedPick([
      { v: 5, weight: 40 },
      { v: 4, weight: 30 },
      { v: 3, weight: 15 },
      { v: 2, weight: 10 },
      { v: 1, weight: 5 },
    ]).v;
    if (item.title.includes("Dustline") && rand() < 0.7) {
      rating = pick([1, 2, 2]);
    }

    const createdAt = addDays(
      order.createdAt as Date,
      randInt(2, 14)
    );
    reviewDocs.push({
      product: item.product,
      user: new Types.ObjectId(uid),
      rating,
      comment: pick(REVIEW_COMMENTS),
      isVerifiedPurchase: true,
      isHidden: false,
      createdAt: createdAt > now ? now : createdAt,
      updatedAt: createdAt > now ? now : createdAt,
    });
  }

  // Extra low ratings on Dustline to hit low-rated threshold (count >= 3, avg <= 2)
  const dustlineProduct = byTitle.get("Dustline Trail Leather Jacket");
  if (dustlineProduct) {
    const reviewers = pickN(
      [...deliveredByUser.keys()].filter(
        (uid) => !reviewedPair.has(`${uid}:${dustlineProduct._id}`)
      ),
      5
    );
    for (const uid of reviewers) {
      reviewedPair.add(`${uid}:${dustlineProduct._id}`);
      reviewDocs.push({
        product: dustlineProduct._id,
        user: new Types.ObjectId(uid),
        rating: pick([1, 2]),
        comment: "Leather finished poorly and sizing was off.",
        isVerifiedPurchase: true,
        isHidden: false,
        createdAt: addDays(now, -randInt(5, 40)),
        updatedAt: now,
      });
    }
  }

  if (reviewDocs.length) {
    await db.collection("reviews").insertMany(reviewDocs);
  }
  console.log(`Reviews: ${reviewDocs.length}`);

  // ── Callback requests ─────────────────────────────────────────────────────
  const admin = await db.collection("users").findOne({
    role: { $in: ["super_admin", "staff"] },
  });
  const callbackDocs = [];
  for (let i = 0; i < 18; i++) {
    const createdAt = addDays(now, -randInt(0, 40));
    const statusRoll = rand();
    let status: "new" | "contacted" | "closed";
    if (statusRoll < 0.4) status = "new";
    else if (statusRoll < 0.75) status = "contacted";
    else status = "closed";

    const contactedAt =
      status === "new"
        ? undefined
        : addHours(createdAt, 1 + rand() * 36);

    callbackDocs.push({
      requirement: pick(CALLBACK_REQUIREMENTS),
      phone: `98${randInt(10000000, 99999999)}`,
      contactHours: pick([
        "10am–1pm",
        "2pm–6pm",
        "Weekday evenings",
        "Anytime after 5pm",
      ]),
      sourceUrl: pick([
        "/",
        "/products",
        "/products/ravencrest-cafe-racer-jacket",
        "/contact",
      ]),
      status,
      adminNote: SEED_NOTE,
      contactedAt,
      handledBy:
        status !== "new" && admin ? admin._id : undefined,
      createdAt,
      updatedAt: contactedAt || createdAt,
    });
  }
  await db.collection("callbackrequests").insertMany(callbackDocs);
  console.log(`Callback requests: ${callbackDocs.length}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const paidStatuses = ["paid", "processing", "shipped", "delivered"];
  const paidCount = orders.filter((o) =>
    paidStatuses.includes(o.status as string)
  ).length;
  const revenue = orders
    .filter((o) => paidStatuses.includes(o.status as string))
    .reduce(
      (s, o) => s + ((o.pricing as { grandTotal: number }).grandTotal || 0),
      0
    );

  console.log("\n── Seed complete ──────────────────────────────────");
  console.log(`Window: ${windowStart.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`);
  console.log(`Paid-path orders: ${paidCount}`);
  console.log(`Approx revenue (paid-path): ₹${Math.round(revenue).toLocaleString("en-IN")}`);
  console.log(`VIP buyers: ${vipIds.size}, one-and-done: ${oneAndDoneIds.size}, never-ordered: ${neverBuyIds.size}`);
  console.log("Sale campaigns:");
  for (const c of saleCampaigns) {
    const acc = saleStatsAcc.get(String(c._id));
    const status =
      !c.isActive
        ? "paused"
        : now < c.startsAt
          ? "scheduled"
          : now >= c.endsAt
            ? "ended"
            : "live";
    console.log(
      `  • ${c.title} [${status}] — ${acc?.orderIds.size || 0} sale orders, ₹${Math.round(acc?.revenue || 0).toLocaleString("en-IN")}`
    );
  }
  console.log("Open /admin/sales → Performance on each campaign.");
  console.log("Open /admin/analytics and try 7d / 30d / 90d / custom ranges.");
  console.log(`Seed customers login email pattern: rider001@${SEED_EMAIL_DOMAIN}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
