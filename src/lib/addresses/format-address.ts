import type { AddressInput, SupportedCountry } from "@/types";
import { getCountryName } from "@/lib/addresses/country-config";
import { formatPhoneDisplay } from "@/lib/addresses/phone";

export interface FormattableAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  pincode?: string | null;
  country?: string | null;
}

function resolvePostalCode(address: FormattableAddress): string {
  return (address.postalCode || address.pincode || "").trim();
}

export function formatAddressLines(
  address: FormattableAddress,
  options: { includeCountry?: boolean; includePhone?: boolean } = {}
): string[] {
  const { includeCountry = true, includePhone = true } = options;
  const postal = resolvePostalCode(address);
  const country = (address.country || "IN") as SupportedCountry;
  const lines: string[] = [address.name, address.line1];

  if (address.line2?.trim()) {
    lines.push(address.line2.trim());
  }

  switch (country) {
    case "US":
      lines.push(
        `${address.city}${address.state ? `, ${address.state}` : ""}${postal ? ` ${postal}` : ""}`
      );
      break;
    case "GB":
      lines.push(address.city);
      if (address.state?.trim()) lines.push(address.state.trim());
      if (postal) lines.push(postal);
      break;
    case "AE":
      lines.push(
        `${address.city}${address.state ? `, ${address.state}` : ""}${postal ? `, ${postal}` : ""}`
      );
      break;
    case "IN":
    default:
      lines.push(
        `${address.city}${address.state ? `, ${address.state}` : ""}${postal ? ` - ${postal}` : ""}`
      );
      break;
  }

  if (includeCountry && address.country && address.country !== "IN") {
    lines.push(getCountryName(country));
  }

  if (includePhone) {
    lines.push(`Phone: ${formatPhoneDisplay(address.phone, country)}`);
  }

  return lines.filter(Boolean);
}

export function formatAddressSingleLine(address: FormattableAddress): string {
  return formatAddressLines(address, { includePhone: false }).join(", ");
}

export function emptyAddressInput(country: SupportedCountry = "IN"): AddressInput {
  return {
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country,
  };
}

export function resetAddressForCountry(
  prev: AddressInput,
  country: SupportedCountry
): AddressInput {
  return {
    ...emptyAddressInput(country),
    name: prev.name,
    label: prev.label,
  };
}
