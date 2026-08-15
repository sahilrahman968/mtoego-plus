import { Suspense } from "react";
import AuthShell from "./AuthShell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <AuthShell>{children}</AuthShell>
    </Suspense>
  );
}
