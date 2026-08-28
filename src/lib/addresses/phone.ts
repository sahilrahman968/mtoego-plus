import type { SupportedCountry } from "@/types";
import { getCountryConfig, isSupportedCountry } from "@/lib/addresses/country-config";

export function stripPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function toE164(country: SupportedCountry, localDigits: string): string {
  const config = getCountryConfig(country);
  const digits = stripPhoneDigits(localDigits);
  return `${config.dialCode}${digits}`;
}

export function parseE164(phone: string): {
  country: SupportedCountry | null;
  localDigits: string;
  dialCode: string;
} {
  const trimmed = phone.trim();
  if (!trimmed.startsWith("+")) {
    return { country: null, localDigits: stripPhoneDigits(trimmed), dialCode: "" };
  }

  // Match longest dial code first to avoid +1 matching +971 etc.
  const dialCodes: { country: SupportedCountry; dialCode: string }[] = [
    { country: "AE", dialCode: "+971" },
    { country: "IN", dialCode: "+91" },
    { country: "GB", dialCode: "+44" },
    { country: "US", dialCode: "+1" },
  ];

  for (const entry of dialCodes) {
    if (trimmed.startsWith(entry.dialCode)) {
      return {
        country: entry.country,
        localDigits: trimmed.slice(entry.dialCode.length),
        dialCode: entry.dialCode,
      };
    }
  }

  return { country: null, localDigits: stripPhoneDigits(trimmed), dialCode: "" };
}

export function getLocalPhoneDigits(
  phone: string,
  country: SupportedCountry
): string {
  const config = getCountryConfig(country);
  const parsed = parseE164(phone);
  if (parsed.country === country && parsed.localDigits) {
    return parsed.localDigits.slice(0, config.phone.localMaxLength);
  }
  const digits = stripPhoneDigits(phone);
  if (digits.startsWith(config.dialCode.replace("+", ""))) {
    return digits.slice(config.dialCode.length - 1).slice(0, config.phone.localMaxLength);
  }
  return digits.slice(0, config.phone.localMaxLength);
}

export function formatPhoneDisplay(phone: string, country?: SupportedCountry): string {
  const parsed = parseE164(phone);
  const resolvedCountry = country ?? parsed.country;
  if (resolvedCountry && isSupportedCountry(resolvedCountry)) {
    const config = getCountryConfig(resolvedCountry);
    const local = getLocalPhoneDigits(phone, resolvedCountry);
    return local ? `${config.dialCode} ${local}` : config.dialCode;
  }
  return phone;
}

export function normalizePhoneForCountry(
  country: SupportedCountry,
  localDigits: string
): string {
  return toE164(country, stripPhoneDigits(localDigits));
}

/** Legacy Indian checkout stored bare 10-digit numbers */
export function normalizeLegacyPhone(phone: string, country: SupportedCountry): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;
  if (country === "IN" && /^[6-9]\d{9}$/.test(trimmed)) {
    return toE164("IN", trimmed);
  }
  return normalizePhoneForCountry(country, trimmed);
}
