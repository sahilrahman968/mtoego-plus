"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/store/Toast";
import OtpInput from "@/components/store/OtpInput";
import PhoneInput, { DEFAULT_COUNTRY } from "@/components/store/PhoneInput";

type PhoneStep = "enter-phone" | "enter-otp";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { sendOtp, verifyOtp } = useAuth();
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState(DEFAULT_COUNTRY.dial);
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter-phone");
  const [normalizedPhone, setNormalizedPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const fullPhone = `${dialCode}${phone}`;

  const handleSendOtp = useCallback(async () => {
    setError("");
    if (!phone || phone.length < 6) {
      setError("Please enter a valid phone number");
      return;
    }

    const full = `${dialCode}${phone}`;
    setLoading(true);
    const res = await sendOtp(full);
    if (res.success) {
      setNormalizedPhone(full);
      setPhoneStep("enter-otp");
      setCooldown(60);
      toast("OTP sent via WhatsApp!", "success");
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, [phone, dialCode, sendOtp, toast]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    const res = await verifyOtp(normalizedPhone, otp);
    if (res.success) {
      if (res.needsName) {
        toast("New number! Please register first.", "info");
        router.push(
          `/register?phone=${encodeURIComponent(fullPhone)}${redirect !== "/" ? `&redirect=${redirect}` : ""}`
        );
      } else {
        toast("Welcome back!", "success");
        router.replace(redirect);
      }
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <>
      {error && (
        <div className="p-3 mb-4 bg-danger/10 border border-danger/25 rounded-lg text-sm text-danger animate-slide-up">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {phoneStep === "enter-phone" ? (
          <motion.div
            key="enter-phone"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <PhoneInput
              phone={phone}
              onPhoneChange={setPhone}
              dialCode={dialCode}
              onDialCodeChange={setDialCode}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || phone.length < 6}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Send OTP"}
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="enter-otp"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleVerifyOtp}
            className="space-y-4"
          >
            <button
              type="button"
              onClick={() => {
                setPhoneStep("enter-phone");
                setOtp("");
                setError("");
              }}
              className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-1"
            >
              <ArrowLeft size={14} />
              Change number
            </button>

            <p className="text-sm text-muted">
              Enter the 6-digit OTP sent via WhatsApp to{" "}
              <span className="font-medium text-foreground">
                {dialCode} {phone}
              </span>
            </p>

            <OtpInput value={otp} onChange={setOtp} />

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Verify & Sign In"
              )}
            </button>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={cooldown > 0 || loading}
              className="w-full text-sm text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <p className="text-sm text-center text-muted mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href={`/register${redirect !== "/" ? `?redirect=${redirect}` : ""}`}
          className="text-primary font-medium hover:underline"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
