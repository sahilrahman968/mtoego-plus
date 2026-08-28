"use client";

import type { AddressInput, SupportedCountry } from "@/types";
import {
  SUPPORTED_COUNTRY_LIST,
  getCountryConfig,
} from "@/lib/addresses/country-config";
import { resetAddressForCountry } from "@/lib/addresses/format-address";
import PhoneInput, { ADDRESS_FIELD_CLASS } from "@/components/store/PhoneInput";

interface AddressFormProps {
  value: AddressInput;
  onChange: (next: AddressInput) => void;
  showLabel?: boolean;
  disabled?: boolean;
  fieldClassName?: string;
}

export default function AddressForm({
  value,
  onChange,
  showLabel = false,
  disabled = false,
  fieldClassName = ADDRESS_FIELD_CLASS,
}: AddressFormProps) {
  const config = getCountryConfig(value.country);

  const handleCountryChange = (country: SupportedCountry) => {
    if (country === value.country) return;
    onChange(resetAddressForCountry(value, country));
  };

  const update = (patch: Partial<AddressInput>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="min-w-0 sm:col-span-2">
        <label className="label-text mb-2 block text-muted">Country *</label>
        <select
          value={value.country}
          onChange={(e) => handleCountryChange(e.target.value as SupportedCountry)}
          className={fieldClassName}
          required
          disabled={disabled}
        >
          {SUPPORTED_COUNTRY_LIST.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0 sm:col-span-2">
        <label className="label-text mb-2 block text-muted">Phone Number *</label>
        <PhoneInput
          country={value.country}
          value={value.phone}
          onChange={(phone) => update({ phone })}
          className={fieldClassName}
          disabled={disabled}
        />
      </div>

      {showLabel && (
        <div className="min-w-0 sm:col-span-2">
          <label className="label-text mb-2 block text-muted">Address Label *</label>
          <input
            type="text"
            value={value.label || ""}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Home, Office, etc."
            className={fieldClassName}
            required
            disabled={disabled}
            maxLength={40}
          />
        </div>
      )}

      <div className="min-w-0 sm:col-span-2">
        <label className="label-text mb-2 block text-muted">Full Name *</label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => update({ name: e.target.value })}
          className={fieldClassName}
          required
          disabled={disabled}
        />
      </div>

      <div className="min-w-0 sm:col-span-2">
        <label className="label-text mb-2 block text-muted">Address Line 1 *</label>
        <input
          type="text"
          value={value.line1}
          onChange={(e) => update({ line1: e.target.value })}
          placeholder={config.line1.placeholder}
          className={fieldClassName}
          required
          disabled={disabled}
        />
      </div>

      <div className="min-w-0 sm:col-span-2">
        <label className="label-text mb-2 block text-muted">Address Line 2</label>
        <input
          type="text"
          value={value.line2 || ""}
          onChange={(e) => update({ line2: e.target.value })}
          placeholder={config.line2.placeholder}
          className={fieldClassName}
          disabled={disabled}
        />
      </div>

      <div className="min-w-0">
        <label className="label-text mb-2 block text-muted">{config.city.label} *</label>
        <input
          type="text"
          value={value.city}
          onChange={(e) => update({ city: e.target.value })}
          placeholder={config.city.placeholder}
          className={fieldClassName}
          required
          disabled={disabled}
        />
      </div>

      {config.state.visible && (
        <div className="min-w-0">
          <label className="label-text mb-2 block text-muted">
            {config.state.label}
            {config.state.required ? " *" : ""}
          </label>
          {config.state.type === "select" ? (
            <select
              value={value.state || ""}
              onChange={(e) => update({ state: e.target.value })}
              className={fieldClassName}
              required={config.state.required}
              disabled={disabled}
            >
              <option value="">Select {config.state.label.toLowerCase()}</option>
              {config.state.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value.state || ""}
              onChange={(e) => update({ state: e.target.value })}
              placeholder={config.state.placeholder}
              className={fieldClassName}
              required={config.state.required}
              disabled={disabled}
            />
          )}
        </div>
      )}

      {config.postalCode.visible && (
        <div className={`min-w-0 ${config.state.visible ? "" : "sm:col-span-1"}`}>
          <label className="label-text mb-2 block text-muted">
            {config.postalCode.label}
            {config.postalCode.required ? " *" : ""}
          </label>
          <input
            type="text"
            value={value.postalCode || ""}
            onChange={(e) => {
              let next = e.target.value;
              if (config.postalCode.numericOnly) {
                next = next.replace(/\D/g, "");
              }
              if (config.postalCode.maxLength) {
                next = next.slice(0, config.postalCode.maxLength);
              }
              update({ postalCode: next });
            }}
            placeholder={config.postalCode.placeholder}
            className={fieldClassName}
            required={config.postalCode.required}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
