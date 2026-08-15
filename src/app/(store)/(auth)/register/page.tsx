import { Metadata } from "next";
import { Suspense } from "react";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account - Motoego+",
  description: "Create your Motoego+ account. Get access to exclusive offers and fast checkout.",
};

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterClient />
    </Suspense>
  );
}
