import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import AdminShell from "./components/AdminShell";

export const metadata = {
  title: "Admin Panel | E-Com",
  description: "E-Com store administration panel",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Primary: read user info from proxy headers (set by proxy.ts after JWT
  // verification). This requires NO database call — so the sidebar renders
  // even when MongoDB is temporarily unreachable.
  const headersList = await headers();
  const userRole = headersList.get("x-user-role") || "";
  const userEmail = headersList.get("x-user-email") || "";

  if (!["super_admin", "staff"].includes(userRole)) {
    // Not an admin (or on the login page where proxy doesn't set headers).
    // Render children without the sidebar shell.
    return <>{children}</>;
  }

  // Try to fetch the user's display name from the DB; fall back to the
  // email prefix if the DB is unreachable.
  let userName = userEmail.split("@")[0] || "Admin";
  try {
    const user = await getCurrentUser();
    if (user) userName = user.name;
  } catch {
    // DB unavailable — the sidebar still renders with the fallback name.
  }

  return (
    <AdminShell userName={userName} userRole={userRole}>
      {children}
    </AdminShell>
  );
}
