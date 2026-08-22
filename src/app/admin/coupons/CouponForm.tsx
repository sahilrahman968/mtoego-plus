"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CouponFormProps {
  couponId?: string;
}

export default function CouponForm({ couponId }: CouponFormProps) {
  const router = useRouter();
  const isEdit = !!couponId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percentage" | "flat">("percentage");
  const [value, setValue] = useState<number>(10);
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [perUserLimit, setPerUserLimit] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  // Fetch coupon for edit
  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/admin/coupons/${couponId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const c = json.data;
          setCode(c.code);
          setDescription(c.description || "");
          setType(c.type);
          setValue(c.value);
          setMinOrderValue(c.minOrderValue);
          setMaxDiscount(c.maxDiscount != null ? String(c.maxDiscount) : "");
          setExpiresAt(c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : "");
          setUsageLimit(c.usageLimit);
          setPerUserLimit(c.perUserLimit);
          setIsActive(c.isActive);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [isEdit, couponId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body = {
      code: code.toUpperCase(),
      description: description || undefined,
      type,
      value: Number(value),
      minOrderValue: Number(minOrderValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      expiresAt: new Date(expiresAt).toISOString(),
      usageLimit: Number(usageLimit),
      perUserLimit: Number(perUserLimit),
      isActive,
    };

    try {
      const url = isEdit ? `/api/admin/coupons/${couponId}` : "/api/admin/coupons";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/admin/coupons");
      } else {
        setError(json.message || "Failed to save coupon");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-admin-line border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 text-sm text-admin-body bg-admin-subtle border border-admin-line rounded-lg">{error}</div>
      )}

      <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
        <h2 className="text-base font-semibold text-admin-heading mb-4">Coupon Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus uppercase"
              placeholder="e.g. SAVE20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "percentage" | "flat")}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus bg-admin-surface"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat (₹)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-admin-body mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">
              Value {type === "percentage" ? "(%)" : "(₹)"}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              required
              min={0}
              max={type === "percentage" ? 100 : undefined}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Min Order Value (₹)</label>
            <input
              type="number"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
            />
          </div>
          {type === "percentage" && (
            <div>
              <label className="block text-sm font-medium text-admin-body mb-1.5">Max Discount (₹)</label>
              <input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                min={0}
                className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
                placeholder="No limit"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Expires At</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Usage Limit</label>
            <input
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(Number(e.target.value))}
              required
              min={1}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Per User Limit</label>
            <input
              type="number"
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(Number(e.target.value))}
              min={1}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-admin-line-strong text-admin-heading focus:ring-admin-focus"
              />
              <span className="text-sm text-admin-body">Active</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-white bg-admin-primary rounded-lg hover:bg-admin-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : isEdit ? "Update Coupon" : "Create Coupon"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/coupons")}
          className="px-5 py-2.5 text-sm font-medium text-admin-body bg-admin-surface border border-admin-line-strong rounded-lg hover:bg-admin-hover transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
