"use client";

import type { AddressInput, SavedAddress } from "@/types";
import { getCountryName } from "@/lib/addresses/country-config";
import { formatAddressSingleLine } from "@/lib/addresses/format-address";
import { formatPhoneDisplay } from "@/lib/addresses/phone";

interface SavedAddressPickerProps {
  addresses: SavedAddress[];
  selectedId: string | "new";
  onSelect: (id: string | "new") => void;
}

export default function SavedAddressPicker({
  addresses,
  selectedId,
  onSelect,
}: SavedAddressPickerProps) {
  if (addresses.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <p className="label-text text-muted">Saved addresses</p>
      <div className="space-y-2">
        {addresses.map((address) => {
          const active = selectedId === address._id;
          return (
            <button
              key={address._id}
              type="button"
              onClick={() => onSelect(address._id)}
              className={`w-full border p-4 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-black/30 hover:border-accent"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {address.label}
                    {address.isDefault && (
                      <span className="ml-2 eyebrow-xs text-primary">Default</span>
                    )}
                  </p>
                  <p className="meta-text mt-1 break-words text-muted">
                    {address.name} · {getCountryName(address.country)}
                  </p>
                  <p className="meta-text mt-1 break-words text-muted">
                    {formatAddressSingleLine(address)}
                  </p>
                  <p className="meta-text tabular mt-1 text-muted">
                    {formatPhoneDisplay(address.phone, address.country)}
                  </p>
                </div>
                <span
                  className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                    active ? "border-primary bg-primary" : "border-border"
                  }`}
                  aria-hidden
                />
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelect("new")}
          className={`w-full border p-4 text-left transition-colors ${
            selectedId === "new"
              ? "border-primary bg-primary/10"
              : "border-border bg-black/30 hover:border-accent"
          }`}
        >
          <p className="text-sm font-medium text-foreground">Deliver to a new address</p>
        </button>
      </div>
    </div>
  );
}

export function savedAddressToInput(address: SavedAddress): AddressInput {
  return {
    label: address.label,
    name: address.name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}
