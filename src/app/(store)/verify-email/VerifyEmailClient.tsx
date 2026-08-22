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
      const timer = window.setTimeout(() => {
        setStatus("error");
        setMessage("No verification token provided.");
      }, 0);
      return () => window.clearTimeout(timer);
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
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-16">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(161,98,7,0.1),transparent_32%),linear-gradient(135deg,#F3ECE0_0%,#FAF8F3_50%,#ECE2D3_100%)]" />
      <div className="relative w-full max-w-lg text-center">
        <div className="border border-border bg-background/90 p-8 shadow-[0_28px_80px_rgba(77,57,31,0.12)] backdrop-blur-xl sm:p-12">
          {status === "loading" && (
            <>
              <Loader2 size={40} strokeWidth={1.5} className="mx-auto mb-6 animate-spin text-primary" aria-hidden="true" />
              <p className="eyebrow mb-3 text-primary">Account verification</p>
              <h1 className="section-title text-3xl text-foreground">Verifying your email…</h1>
              <p className="body-copy mx-auto mt-3 text-muted">This will only take a moment.</p>
              <span className="sr-only" role="status" aria-live="polite">Email verification in progress</span>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 size={42} strokeWidth={1.5} className="mx-auto mb-6 text-success" aria-hidden="true" />
              <p className="eyebrow mb-3 text-primary">Verification complete</p>
              <h1 className="section-title text-3xl text-foreground">Email verified</h1>
              <p className="body-copy mx-auto mt-3 text-muted">{message}</p>
              <Link
                href="/login"
                className="btn-text mt-7 inline-flex min-h-12 items-center justify-center bg-foreground px-7 py-3.5 text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Sign In
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle size={42} strokeWidth={1.5} className="mx-auto mb-6 text-danger" aria-hidden="true" />
              <p className="eyebrow mb-3 text-primary">Account verification</p>
              <h1 className="section-title text-3xl text-foreground">Verification failed</h1>
              <p role="alert" className="body-copy mx-auto mt-3 text-muted">{message}</p>
              <Link
                href="/login"
                className="btn-text mt-7 inline-flex min-h-12 items-center justify-center border border-foreground px-7 py-3.5 text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
