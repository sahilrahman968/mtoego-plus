import type { AddressInput, SupportedCountry } from "@/types";
import {
  getCountryConfig,
  isSupportedCountry,
} from "@/lib/addresses/country-config";
import {
  getLocalPhoneDigits,
  normalizeLegacyPhone,
  normalizePhoneForCountry,
  stripPhoneDigits,
} from "@/lib/addresses/phone";

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function pushIf(condition: boolean, message: string, errors: string[]): void {
  if (condition) errors.push(message);
}

export function validateAddressFields(
  body: Record<string, unknown>,
  options: { requireLabel?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];

  if (options.requireLabel) {
    pushIf(
      !body.label || typeof body.label !== "string" || body.label.trim().length < 1,
      "Address label is required",
      errors
    );
    pushIf(
      typeof body.label === "string" && body.label.trim().length > 40,
      "Address label must be at most 40 characters",
      errors
    );
  }

  const countryRaw =
    typeof body.country === "string" ? body.country.trim().toUpperCase() : "IN";
  if (!isSupportedCountry(countryRaw)) {
    errors.push("Unsupported country");
    return { valid: false, errors };
  }

  const country = countryRaw as SupportedCountry;
  const config = getCountryConfig(country);

  pushIf(
    !body.name || typeof body.name !== "string" || body.name.trim().length < 2,
    "Name is required (min 2 characters)",
    errors
  );

  if (!body.phone || typeof body.phone !== "string") {
    errors.push("Phone number is required");
  } else {
    const localDigits = getLocalPhoneDigits(body.phone, country);
    const normalized = body.phone.trim().startsWith("+")
      ? body.phone.trim()
      : normalizePhoneForCountry(country, localDigits);
    const localFromNormalized = getLocalPhoneDigits(normalized, country);
    pushIf(
      localFromNormalized.length < config.phone.localMinLength ||
        localFromNormalized.length > config.phone.localMaxLength ||
        !config.phone.localPattern.test(localFromNormalized),
      `Valid ${config.name} phone number is required`,
      errors
    );
  }

  pushIf(
    !body.line1 || typeof body.line1 !== "string" || body.line1.trim().length < 5,
    "Address line 1 is required (min 5 characters)",
    errors
  );

  pushIf(
    !body.city || typeof body.city !== "string" || body.city.trim().length < 2,
    "City is required",
    errors
  );

  const state =
    typeof body.state === "string" ? body.state.trim() : "";
  if (config.state.required) {
    pushIf(!state || state.length < 2, `${config.state.label} is required`, errors);
  }
  if (config.state.type === "select" && state && config.state.options) {
    pushIf(
      !config.state.options.includes(state),
      `Invalid ${config.state.label}`,
      errors
    );
  }

  const postalCode =
    typeof body.postalCode === "string"
      ? body.postalCode.trim()
      : typeof body.pincode === "string"
        ? body.pincode.trim()
        : "";

  if (config.postalCode.required) {
    pushIf(!postalCode, `${config.postalCode.label} is required`, errors);
  }
  if (postalCode && config.postalCode.pattern) {
    const normalizedPostal =
      country === "GB" ? postalCode.toUpperCase() : postalCode;
    pushIf(
      !config.postalCode.pattern.test(normalizedPostal),
      `Valid ${config.postalCode.label} is required`,
      errors
    );
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeAddressInput(
  body: Record<string, unknown>
): AddressInput {
  const countryRaw =
    typeof body.country === "string" ? body.country.trim().toUpperCase() : "IN";
  const country: SupportedCountry = isSupportedCountry(countryRaw)
    ? countryRaw
    : "IN";
  const config = getCountryConfig(country);

  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const localDigits = getLocalPhoneDigits(rawPhone, country);
  const phone = rawPhone.startsWith("+")
    ? rawPhone
    : normalizeLegacyPhone(rawPhone, country);

  const postalRaw =
    typeof body.postalCode === "string"
      ? body.postalCode.trim()
      : typeof body.pincode === "string"
        ? body.pincode.trim()
        : undefined;

  const postalCode =
    postalRaw && country === "GB"
      ? postalRaw.toUpperCase()
      : postalRaw || undefined;

  const stateRaw = typeof body.state === "string" ? body.state.trim() : "";
  const state = stateRaw || undefined;

  return {
    label:
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim()
        : undefined,
    name: typeof body.name === "string" ? body.name.trim() : "",
    phone: normalizePhoneForCountry(
      country,
      stripPhoneDigits(getLocalPhoneDigits(phone, country) || localDigits)
    ),
    line1: typeof body.line1 === "string" ? body.line1.trim() : "",
    line2:
      typeof body.line2 === "string" && body.line2.trim()
        ? body.line2.trim()
        : undefined,
    city: typeof body.city === "string" ? body.city.trim() : "",
    state: config.state.visible ? state : undefined,
    postalCode: config.postalCode.visible ? postalCode : undefined,
    country,
  };
}

export function addressToOrderSnapshot(address: AddressInput): AddressInput & {
  pincode: string;
} {
  return {
    ...address,
    pincode: address.postalCode ?? "",
  };
}
