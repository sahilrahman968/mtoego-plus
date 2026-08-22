import { Suspense } from "react";
import AuthShell from "./AuthShell";

export default function AuthLayout() {
  return (
    <Suspense>
      <AuthShell />
    </Suspense>
  );
}
