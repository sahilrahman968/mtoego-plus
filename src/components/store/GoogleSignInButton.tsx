"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getGoogleClientId } from "@/lib/store-api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              logo_alignment?: "left" | "center";
            }
          ) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = "continue_with",
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const initializedRef = useRef(false);

  // Fetch the Google Client ID from the server
  useEffect(() => {
    getGoogleClientId()
      .then((res) => {
        if (res.success && res.data?.clientId) {
          setClientId(res.data.clientId);
        } else {
          setUnavailable(true);
        }
      })
      .catch(() => {
        setUnavailable(true);
      });
  }, []);

  // Load the Google Identity Services script
  useEffect(() => {
    if (!clientId) return;

    // Check if script is already loaded
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      setUnavailable(true);
      onError?.("Failed to load Google Sign-In");
    };
    document.head.appendChild(script);
  }, [clientId, onError]);

  const handleCallback = useCallback(
    (response: { credential: string }) => {
      if (response.credential) {
        onSuccess(response.credential);
      } else {
        onError?.("Google sign-in returned no credential");
      }
    },
    [onSuccess, onError]
  );

  // Initialize and render the Google button
  useEffect(() => {
    if (
      !clientId ||
      !scriptLoaded ||
      !window.google?.accounts?.id ||
      !buttonRef.current ||
      initializedRef.current
    ) {
      return;
    }

    initializedRef.current = true;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCallback,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text,
      shape: "rectangular",
      width: buttonRef.current.offsetWidth || 400,
      logo_alignment: "left",
    });
  }, [clientId, scriptLoaded, handleCallback, text]);

  if (unavailable) {
    return null;
  }

  // Show loading state while fetching client ID / loading script
  if (!clientId || !scriptLoaded) {
    return (
      <div className="h-[44px] w-full animate-pulse-slow rounded-lg border border-border bg-card-hover" />
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div ref={buttonRef} className="w-full [&>div]:!w-full" />
    </div>
  );
}
