"use client";

import { useEffect } from "react";

interface StoreErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StoreError({ error, reset }: StoreErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section
      className="mx-auto flex min-h-[55vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center"
      aria-labelledby="store-error-title"
      role="alert"
    >
      <p className="eyebrow mb-3 text-primary">Something went wrong</p>
      <h1 id="store-error-title" className="section-title text-4xl text-foreground">
        We could not load this page
      </h1>
      <p className="mt-4 max-w-lg text-muted">
        Please try again. If the problem continues, return to the shop and choose
        another piece.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 min-h-11 rounded-sm bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </section>
  );
}
