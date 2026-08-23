"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/Button";
import {
  CheckboxField,
  FormSection,
  SelectField,
  TextAreaField,
  TextField,
} from "../components/Fields";
import { AdminFormSkeleton } from "../components/FeedbackState";

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
        } else {
          setError(json.message || "Failed to load coupon");
        }
      })
      .catch(() => setError("Failed to load coupon"))
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
      if (json.success) router.push("/admin/coupons");
      else setError(json.message || "Failed to save coupon");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <AdminFormSkeleton sections={2} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-lg border border-admin-danger-line bg-admin-danger-soft px-3.5 py-3 text-sm text-admin-danger">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <FormSection title="Coupon details" description="Set the code customers enter and the discount it applies.">
            <TextField
              id="coupon-code"
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={40}
              className="font-mono uppercase"
              placeholder="SAVE20"
              hint="Codes are always stored in uppercase."
            />
            <SelectField
              id="coupon-type"
              label="Discount type"
              value={type}
              onChange={(e) => setType(e.target.value as "percentage" | "flat")}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat amount (₹)</option>
            </SelectField>
            <div className="sm:col-span-2">
              <TextAreaField
                id="coupon-description"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional internal description"
              />
            </div>
            <TextField
              id="coupon-value"
              label={`Value ${type === "percentage" ? "(%)" : "(₹)"}`}
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              required
              min={0}
              max={type === "percentage" ? 100 : undefined}
              step="any"
            />
            <TextField
              id="coupon-minimum"
              label="Minimum order value (₹)"
              type="number"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(Number(e.target.value))}
              min={0}
              step="any"
              hint="Use 0 when there is no minimum."
            />
            {type === "percentage" && (
              <TextField
                id="coupon-max-discount"
                label="Maximum discount (₹)"
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                min={0}
                step="any"
                placeholder="No limit"
                hint="Optional cap for percentage discounts."
              />
            )}
          </FormSection>

          <FormSection title="Redemption limits" description="Control when the code expires and how often it can be used.">
            <TextField
              id="coupon-expiry"
              label="Expires at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
            />
            <TextField
              id="coupon-usage-limit"
              label="Total usage limit"
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(Number(e.target.value))}
              required
              min={1}
            />
            <TextField
              id="coupon-per-user-limit"
              label="Per-customer limit"
              type="number"
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(Number(e.target.value))}
              min={1}
            />
          </FormSection>
        </div>

        <FormSection
          title="Availability"
          description="Choose whether customers can redeem this code."
          columns={1}
          className="h-fit"
        >
          <CheckboxField
            id="coupon-active"
            label="Active"
            hint="Inactive coupons remain saved but cannot be redeemed."
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </FormSection>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-admin-line bg-admin-canvas/95 py-3 backdrop-blur">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Coupon" : "Create Coupon"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/admin/coupons")}>Cancel</Button>
      </div>
    </form>
  );
}
