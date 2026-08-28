import type { SupportedCountry } from "@/types";

export interface CountryFieldConfig {
  visible: boolean;
  required: boolean;
  label: string;
  type: "select" | "text";
  options?: readonly string[];
  placeholder?: string;
  maxLength?: number;
  numericOnly?: boolean;
  pattern?: RegExp;
}

export interface CountryAddressConfig {
  code: SupportedCountry;
  name: string;
  dialCode: string;
  phone: {
    localMinLength: number;
    localMaxLength: number;
    localPattern: RegExp;
    placeholder: string;
  };
  line1: { placeholder: string };
  line2: { placeholder: string };
  city: { label: string; placeholder: string };
  state: CountryFieldConfig;
  postalCode: CountryFieldConfig;
}

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
  "Puducherry",
] as const;

export const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "District of Columbia",
] as const;

export const UAE_EMIRATES = [
  "Abu Dhabi",
  "Ajman",
  "Dubai",
  "Fujairah",
  "Ras Al Khaimah",
  "Sharjah",
  "Umm Al Quwain",
] as const;

const UK_POSTCODE_PATTERN =
  /^([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0AA)$/i;

export const COUNTRY_ADDRESS_CONFIG: Record<SupportedCountry, CountryAddressConfig> = {
  IN: {
    code: "IN",
    name: "India",
    dialCode: "+91",
    phone: {
      localMinLength: 10,
      localMaxLength: 10,
      localPattern: /^[6-9]\d{9}$/,
      placeholder: "10-digit mobile number",
    },
    line1: { placeholder: "House no., Building, Street" },
    line2: { placeholder: "Area, Landmark (optional)" },
    city: { label: "City", placeholder: "City" },
    state: {
      visible: true,
      required: true,
      label: "State",
      type: "select",
      options: INDIAN_STATES,
    },
    postalCode: {
      visible: true,
      required: true,
      label: "Pincode",
      type: "text",
      placeholder: "6-digit pincode",
      maxLength: 6,
      numericOnly: true,
      pattern: /^\d{6}$/,
    },
  },
  US: {
    code: "US",
    name: "United States",
    dialCode: "+1",
    phone: {
      localMinLength: 10,
      localMaxLength: 10,
      localPattern: /^\d{10}$/,
      placeholder: "10-digit phone number",
    },
    line1: { placeholder: "Street address" },
    line2: { placeholder: "Apt, Suite, Unit (optional)" },
    city: { label: "City", placeholder: "City" },
    state: {
      visible: true,
      required: true,
      label: "State",
      type: "select",
      options: US_STATES,
    },
    postalCode: {
      visible: true,
      required: true,
      label: "ZIP Code",
      type: "text",
      placeholder: "ZIP code",
      maxLength: 10,
      pattern: /^\d{5}(-\d{4})?$/,
    },
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    phone: {
      localMinLength: 10,
      localMaxLength: 11,
      localPattern: /^\d{10,11}$/,
      placeholder: "10–11 digit phone number",
    },
    line1: { placeholder: "Address line 1" },
    line2: { placeholder: "Address line 2 (optional)" },
    city: { label: "Town / City", placeholder: "Town or city" },
    state: {
      visible: true,
      required: false,
      label: "County (optional)",
      type: "text",
      placeholder: "County",
    },
    postalCode: {
      visible: true,
      required: true,
      label: "Postcode",
      type: "text",
      placeholder: "Postcode",
      maxLength: 8,
      pattern: UK_POSTCODE_PATTERN,
    },
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    phone: {
      localMinLength: 9,
      localMaxLength: 9,
      localPattern: /^5\d{8}$/,
      placeholder: "9-digit mobile number",
    },
    line1: { placeholder: "Building, Street" },
    line2: { placeholder: "Area, Landmark (optional)" },
    city: { label: "City", placeholder: "City" },
    state: {
      visible: true,
      required: true,
      label: "Emirate",
      type: "select",
      options: UAE_EMIRATES,
    },
    postalCode: {
      visible: true,
      required: false,
      label: "P.O. Box (optional)",
      type: "text",
      placeholder: "P.O. Box",
      maxLength: 10,
    },
  },
};

export const SUPPORTED_COUNTRY_LIST = Object.values(COUNTRY_ADDRESS_CONFIG);

export function getCountryConfig(country: SupportedCountry): CountryAddressConfig {
  return COUNTRY_ADDRESS_CONFIG[country];
}

export function isSupportedCountry(value: string): value is SupportedCountry {
  return value in COUNTRY_ADDRESS_CONFIG;
}

export function getCountryName(country: SupportedCountry): string {
  return COUNTRY_ADDRESS_CONFIG[country].name;
}
