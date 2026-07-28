"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/store/Toast";
import GoogleSignInButton from "@/components/store/GoogleSignInButton";
import OtpInput from "@/components/store/OtpInput";
import PhoneInput, { DEFAULT_COUNTRY, parseInternationalPhone } from "@/components/store/PhoneInput";
import { resendVerification } from "@/lib/store-api";

type AuthTab = "phone" | "email";
type PhoneStep = "enter-details" | "enter-otp";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const prefillPhone = searchParams.get("phone") || "";
  const {
    register,
    googleSignIn,
    sendOtp,
    verifyOtp,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<AuthTab>(prefillPhone ? "phone" : "phone");

  // Email registration
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const [phoneName, setPhoneName] = useState("");
  const [dialCode, setDialCode] = useState(() => {
    if (!prefillPhone) return DEFAULT_COUNTRY.dial;
    return parseInternationalPhone(prefillPhone).dialCode;
  });
  const [phone, setPhone] = useState(() => {
    if (!prefillPhone) return "";
    return parseInternationalPhone(prefillPhone).localNumber;
  });
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter-details");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, authLoading, router, redirect]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // ── Email registration ──────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const res = await register(name, email, password);
    if (res.success) {
      setPendingEmail(email);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (!pendingEmail || resending) return;
    setResending(true);
    await resendVerification(pendingEmail);
    toast("Verification email sent!", "success");
    setResending(false);
  };

  // ── Phone registration ──────────────────────────────────────────────────
  const handleSendOtp = useCallback(async () => {
    setError("");
    if (!phoneName || phoneName.trim().length < 2) {
      setError("Please enter your name");
      return;
    }
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
  }, [phoneName, phone, dialCode, sendOtp, toast]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    const res = await verifyOtp(normalizedPhone, otp, phoneName);
    if (res.success && !res.needsName) {
      toast("Account created successfully!", "success");
      router.replace(redirect);
    } else if (res.success && res.needsName) {
      setError("Please provide your name");
      setPhoneStep("enter-details");
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  // ── Google ──────────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setLoading(true);
    const res = await googleSignIn(credential);
    if (res.success) {
      toast("Account created successfully!", "success");
      router.replace(redirect);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  if (authLoading) return null;

  // ── Verification-pending screen (email) ─────────────────────────────────
  if (pendingEmail) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="auth-form px-1 sm:px-6">
            <CheckCircle2 size={48} className="mx-auto text-success mb-4" />
            <h1 className="text-xl font-bold text-foreground">Check your email</h1>
            <p className="text-sm text-muted mt-2">
              We&apos;ve sent a verification link to{" "}
              <span className="font-medium text-foreground">{pendingEmail}</span>.
              Click the link to activate your account.
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full px-4 py-2.5 border border-border bg-card text-foreground font-medium rounded-lg hover:bg-card-hover transition-colors disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend verification email"}
              </button>
              <Link
                href="/login"
                className="block text-sm text-primary font-medium hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="relative mx-auto mb-2 block h-10 w-[11.25rem] overflow-hidden"
            aria-label="Motoego Home"
          >
            <Image
              src="/logo.svg"
              alt="Motoego"
              fill
              sizes="180px"
              className="scale-[4.65] origin-left object-contain object-left"
              priority
            />
          </Link>
          <p className="text-sm text-muted">
            Join Motoego+ for exclusive deals and easy checkout
          </p>
        </div>

        <div className="auth-form px-1 sm:px-6">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={(err) => setError(err)}
            text="signup_with"
          />

          {/* Tabs */}
          <div className="mt-3 flex border-b border-border mb-5">
            <button
              type="button"
              onClick={() => { setTab("phone"); setError(""); }}
              className={`relative flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === "phone"
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Phone
              {tab === "phone" && (
                <motion.span
                  layoutId="register-auth-tab-indicator"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => { setTab("email"); setError(""); }}
              className={`relative flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === "email"
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Email
              {tab === "email" && (
                <motion.span
                  layoutId="register-auth-tab-indicator"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-danger/10 border border-danger/25 rounded-lg text-sm text-danger animate-slide-up">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {/* Phone + OTP Registration */}
            {tab === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
              {phoneStep === "enter-details" && (
                <div className="space-y-4">
                  <div>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="text"
                        value={phoneName}
                        onChange={(e) => setPhoneName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <PhoneInput
                      phone={phone}
                      onPhoneChange={setPhone}
                      dialCode={dialCode}
                      onDialCodeChange={setDialCode}
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading || phone.length < 6 || phoneName.trim().length < 2}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                </div>
              )}

              {phoneStep === "enter-otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneStep("enter-details");
                      setOtp("");
                      setError("");
                    }}
                    className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-1"
                  >
                    <ArrowLeft size={14} />
                    Change details
                  </button>

                  <p className="text-sm text-muted">
                    Enter the 6-digit OTP sent via WhatsApp to{" "}
                    <span className="font-medium text-foreground">{dialCode} {phone}</span>
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
                      "Verify & Create Account"
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
                </form>
              )}
              </motion.div>
            )}

            {/* Email Registration */}
            {tab === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">
                  Must include 1 uppercase, 1 lowercase, and 1 digit
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-sm text-center text-muted mt-6">
          Already have an account?{" "}
          <Link
            href={`/login${redirect !== "/" ? `?redirect=${redirect}` : ""}`}
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
