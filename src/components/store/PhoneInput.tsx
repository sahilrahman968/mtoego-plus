"use client";

import type { SupportedCountry } from "@/types";
import { getCountryConfig } from "@/lib/addresses/country-config";
import {
  getLocalPhoneDigits,
  normalizePhoneForCountry,
  stripPhoneDigits,
} from "@/lib/addresses/phone";

export const ADDRESS_FIELD_CLASS =
  "w-full min-w-0 max-w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

interface PhoneInputProps {
  country: SupportedCountry;
  value: string;
  onChange: (e164: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function PhoneInput({
  country,
  value,
  onChange,
  className = ADDRESS_FIELD_CLASS,
  required = true,
  disabled = false,
}: PhoneInputProps) {
  const config = getCountryConfig(country);
  const localDigits = getLocalPhoneDigits(value, country);

  const handleChange = (raw: string) => {
    const digits = stripPhoneDigits(raw).slice(0, config.phone.localMaxLength);
    onChange(digits ? normalizePhoneForCountry(country, digits) : "");
  };

  return (
    <div className="flex min-w-0 gap-2">
      <span className="inline-flex shrink-0 items-center border border-border bg-black/40 px-3 py-2.5 text-sm tabular text-muted">
        {config.dialCode}
      </span>
      <input
        type="tel"
        inputMode="numeric"
        value={localDigits}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={config.phone.placeholder}
        className={className}
        required={required}
        disabled={disabled}
        aria-label={`Phone number for ${config.name}`}
      />
    </div>
  );
}
