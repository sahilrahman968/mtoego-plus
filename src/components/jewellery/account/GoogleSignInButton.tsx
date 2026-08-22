"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getGoogleClientId } from "@/lib/store-api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              logo_alignment?: "left" | "center";
            },
          ) => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = "continue_with",
}: {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    getGoogleClientId()
      .then((result) => result.success && result.data?.clientId ? setClientId(result.data.clientId) : setUnavailable(true))
      .catch(() => setUnavailable(true));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    if (window.google?.accounts.id) {
      queueMicrotask(() => setLoaded(true));
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => setLoaded(true), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => {
      setUnavailable(true);
      onError?.("Failed to load Google Sign-In");
    };
    document.head.appendChild(script);
  }, [clientId, onError]);

  const callback = useCallback((response: { credential: string }) => {
    if (response.credential) onSuccess(response.credential);
    else onError?.("Google sign-in returned no credential");
  }, [onError, onSuccess]);

  useEffect(() => {
    if (!clientId || !loaded || !window.google?.accounts.id || !buttonRef.current || initialized.current) return;
    initialized.current = true;
    window.google.accounts.id.initialize({ client_id: clientId, callback, cancel_on_tap_outside: true });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text,
      shape: "rectangular",
      width: buttonRef.current.offsetWidth || 360,
      logo_alignment: "left",
    });
  }, [callback, clientId, loaded, text]);

  if (unavailable) return <p className="text-center text-sm text-muted">Google sign-in is temporarily unavailable.</p>;
  if (!clientId || !loaded) return <div className="h-11 w-full animate-pulse border border-border bg-card-hover" aria-label="Loading sign in" />;
  return <div ref={buttonRef} className="flex w-full justify-center [&>div]:!w-full" />;
}
