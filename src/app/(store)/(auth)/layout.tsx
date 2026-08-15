import { Suspense } from "react";
import AuthShell from "./AuthShell";

export default function AuthLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <AuthShell />
    </Suspense>
  );
}
