"use client";

import { useEffect } from "react";
import { AdminErrorState } from "./components/FeedbackState";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AdminErrorState
      message="The admin page could not be loaded. Your data has not been changed."
      onRetry={reset}
    />
  );
}
