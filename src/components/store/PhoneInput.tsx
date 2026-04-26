"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";

interface Country {
  name: string;
  code: string;
  dial: string;
  maxDigits: number;
}

const COUNTRIES: Country[] = [
  { name: "India", code: "IN", dial: "+91", maxDigits: 10 },
  { name: "United States", code: "US", dial: "+1", maxDigits: 10 },
  { name: "United Kingdom", code: "GB", dial: "+44", maxDigits: 10 },
  { name: "Canada", code: "CA", dial: "+1", maxDigits: 10 },
  { name: "Australia", code: "AU", dial: "+61", maxDigits: 9 },
  { name: "Germany", code: "DE", dial: "+49", maxDigits: 11 },
  { name: "France", code: "FR", dial: "+33", maxDigits: 9 },
  { name: "Japan", code: "JP", dial: "+81", maxDigits: 10 },
  { name: "China", code: "CN", dial: "+86", maxDigits: 11 },
  { name: "Brazil", code: "BR", dial: "+55", maxDigits: 11 },
  { name: "South Africa", code: "ZA", dial: "+27", maxDigits: 9 },
  { name: "Mexico", code: "MX", dial: "+52", maxDigits: 10 },
  { name: "South Korea", code: "KR", dial: "+82", maxDigits: 11 },
  { name: "Italy", code: "IT", dial: "+39", maxDigits: 10 },
  { name: "Spain", code: "ES", dial: "+34", maxDigits: 9 },
  { name: "Russia", code: "RU", dial: "+7", maxDigits: 10 },
  { name: "Indonesia", code: "ID", dial: "+62", maxDigits: 12 },
  { name: "Turkey", code: "TR", dial: "+90", maxDigits: 10 },
  { name: "Saudi Arabia", code: "SA", dial: "+966", maxDigits: 9 },
  { name: "United Arab Emirates", code: "AE", dial: "+971", maxDigits: 9 },
  { name: "Singapore", code: "SG", dial: "+65", maxDigits: 8 },
  { name: "Malaysia", code: "MY", dial: "+60", maxDigits: 10 },
  { name: "Thailand", code: "TH", dial: "+66", maxDigits: 9 },
  { name: "Philippines", code: "PH", dial: "+63", maxDigits: 10 },
  { name: "Vietnam", code: "VN", dial: "+84", maxDigits: 10 },
  { name: "Pakistan", code: "PK", dial: "+92", maxDigits: 10 },
  { name: "Bangladesh", code: "BD", dial: "+880", maxDigits: 10 },
  { name: "Sri Lanka", code: "LK", dial: "+94", maxDigits: 9 },
  { name: "Nepal", code: "NP", dial: "+977", maxDigits: 10 },
  { name: "Nigeria", code: "NG", dial: "+234", maxDigits: 10 },
  { name: "Kenya", code: "KE", dial: "+254", maxDigits: 9 },
  { name: "Egypt", code: "EG", dial: "+20", maxDigits: 10 },
  { name: "Argentina", code: "AR", dial: "+54", maxDigits: 10 },
  { name: "Colombia", code: "CO", dial: "+57", maxDigits: 10 },
  { name: "Chile", code: "CL", dial: "+56", maxDigits: 9 },
  { name: "New Zealand", code: "NZ", dial: "+64", maxDigits: 10 },
  { name: "Ireland", code: "IE", dial: "+353", maxDigits: 9 },
  { name: "Netherlands", code: "NL", dial: "+31", maxDigits: 9 },
  { name: "Sweden", code: "SE", dial: "+46", maxDigits: 9 },
  { name: "Norway", code: "NO", dial: "+47", maxDigits: 8 },
  { name: "Denmark", code: "DK", dial: "+45", maxDigits: 8 },
  { name: "Finland", code: "FI", dial: "+358", maxDigits: 10 },
  { name: "Poland", code: "PL", dial: "+48", maxDigits: 9 },
  { name: "Portugal", code: "PT", dial: "+351", maxDigits: 9 },
  { name: "Switzerland", code: "CH", dial: "+41", maxDigits: 9 },
  { name: "Austria", code: "AT", dial: "+43", maxDigits: 11 },
  { name: "Belgium", code: "BE", dial: "+32", maxDigits: 9 },
  { name: "Greece", code: "GR", dial: "+30", maxDigits: 10 },
  { name: "Israel", code: "IL", dial: "+972", maxDigits: 9 },
  { name: "Qatar", code: "QA", dial: "+974", maxDigits: 8 },
  { name: "Kuwait", code: "KW", dial: "+965", maxDigits: 8 },
  { name: "Bahrain", code: "BH", dial: "+973", maxDigits: 8 },
  { name: "Oman", code: "OM", dial: "+968", maxDigits: 8 },
  { name: "Hong Kong", code: "HK", dial: "+852", maxDigits: 8 },
  { name: "Taiwan", code: "TW", dial: "+886", maxDigits: 9 },
];

const FLAG_OFFSET = 127397;
function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...code.split("").map((c) => c.charCodeAt(0) + FLAG_OFFSET)
  );
}

const DEFAULT_COUNTRY = COUNTRIES[0]; // India

interface PhoneInputProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  dialCode: string;
  onDialCodeChange: (dialCode: string) => void;
  disabled?: boolean;
}

export default function PhoneInput({
  phone,
  onPhoneChange,
  dialCode,
  onDialCodeChange,
  disabled,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedCountry =
    COUNTRIES.find((c) => c.dial === dialCode) ?? DEFAULT_COUNTRY;

  const filtered = useMemo(() => {
    if (!search) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSelect = (country: Country) => {
    onDialCodeChange(country.dial);
    onPhoneChange(phone.slice(0, country.maxDigits));
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-2.5 text-sm border border-border border-r-0 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50"
        >
          <span className="text-base leading-none">
            {countryFlag(selectedCountry.code)}
          </span>
          <span className="text-muted">{selectedCountry.dial}</span>
          <ChevronDown
            size={12}
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onPhoneChange(digits.slice(0, selectedCountry.maxDigits));
          }}
          placeholder="Phone number"
          disabled={disabled}
          maxLength={selectedCountry.maxDigits}
          className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted text-center">
                No countries found
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c.code + c.dial}
                type="button"
                onClick={() => handleSelect(c)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  c.dial === dialCode && c.code === selectedCountry.code
                    ? "bg-primary/5 text-primary font-medium"
                    : "text-foreground"
                }`}
              >
                <span className="text-base leading-none">
                  {countryFlag(c.code)}
                </span>
                <span className="flex-1 text-left truncate">{c.name}</span>
                <span className="text-muted text-xs shrink-0">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseInternationalPhone(full: string): {
  dialCode: string;
  localNumber: string;
} {
  if (!full.startsWith("+")) {
    return { dialCode: DEFAULT_COUNTRY.dial, localNumber: full };
  }
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (full.startsWith(c.dial)) {
      return { dialCode: c.dial, localNumber: full.slice(c.dial.length) };
    }
  }
  return { dialCode: DEFAULT_COUNTRY.dial, localNumber: full.replace(/^\+/, "") };
}

export { DEFAULT_COUNTRY, parseInternationalPhone };
export type { Country };
