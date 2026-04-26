"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { verifyEmail } from "@/lib/store-api";

type Status = "loading" | "success" | "error";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    verifyEmail(token).then((res) => {
      if (res.success) {
        setStatus("success");
        setMessage(res.message);
      } else {
        setStatus("error");
        setMessage(res.message);
      }
    }).catch(() => {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    });
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl border border-border p-8 sm:p-10 shadow-sm">
          {status === "loading" && (
            <>
              <Loader2 size={48} className="mx-auto text-primary animate-spin mb-4" />
              <h1 className="text-xl font-bold text-foreground">Verifying your email…</h1>
              <p className="text-sm text-muted mt-2">This will only take a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" />
              <h1 className="text-xl font-bold text-foreground">Email verified!</h1>
              <p className="text-sm text-muted mt-2">{message}</p>
              <Link
                href="/login"
                className="inline-block mt-6 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
              >
                Sign In
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle size={48} className="mx-auto text-danger mb-4" />
              <h1 className="text-xl font-bold text-foreground">Verification failed</h1>
              <p className="text-sm text-muted mt-2">{message}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <Link
                  href="/register"
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
                >
                  Register Again
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
