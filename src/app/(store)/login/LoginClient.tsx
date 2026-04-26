"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, Loader2, Phone, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/store/Toast";
import GoogleSignInButton from "@/components/store/GoogleSignInButton";
import OtpInput from "@/components/store/OtpInput";
import PhoneInput, { DEFAULT_COUNTRY } from "@/components/store/PhoneInput";

type AuthTab = "phone" | "email";
type PhoneStep = "enter-phone" | "enter-otp";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const {
    login,
    googleSignIn,
    sendOtp,
    verifyOtp,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<AuthTab>("phone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState(DEFAULT_COUNTRY.dial);
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter-phone");
  const [normalizedPhone, setNormalizedPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [cooldown, setCooldown] = useState(0);

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    if (res.success) {
      toast("Welcome back!", "success");
      router.replace(redirect);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

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
      toast("OTP sent!", "success");
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

  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setLoading(true);
    const res = await googleSignIn(credential);
    if (res.success) {
      toast("Welcome!", "success");
      router.replace(redirect);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted mt-1">
            Sign in to your account to continue shopping
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={(err) => setError(err)}
            text="signin_with"
          />

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => { setTab("phone"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "phone"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Phone size={14} />
              Phone
            </button>
            <button
              type="button"
              onClick={() => { setTab("email"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "email"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Mail size={14} />
              Email
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-danger animate-slide-up">
              {error}
            </div>
          )}

          {/* Phone + OTP */}
          {tab === "phone" && (
            <>
              {phoneStep === "enter-phone" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Phone Number
                    </label>
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
                    disabled={loading || phone.length < 6}
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
                    Enter the 6-digit OTP sent to{" "}
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
                </form>
              )}
            </>
          )}

          {/* Email + Password */}
          {tab === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
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
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-sm text-center text-muted mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href={`/register${redirect !== "/" ? `?redirect=${redirect}` : ""}`}
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
