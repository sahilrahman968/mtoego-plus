import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { getPermissionsForRole } from "@/lib/auth/roles";
import { isAdminPanelRole } from "@/lib/auth/permissions";
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
  const headersList = await headers();
  const userRole = headersList.get("x-user-role") || "";
  const userEmail = headersList.get("x-user-email") || "";

  if (!isAdminPanelRole(userRole)) {
    return <>{children}</>;
  }

  let userName = userEmail.split("@")[0] || "Admin";
  let permissions: string[] =
    userRole === "super_admin" ? ["*"] : [];

  try {
    await connectDB();
    const [user, rolePerms] = await Promise.all([
      getCurrentUser(),
      userRole === "super_admin"
        ? Promise.resolve(["*"])
        : getPermissionsForRole(userRole),
    ]);
    if (user) userName = user.name;
    permissions = rolePerms;
  } catch {
    // DB unavailable — sidebar still renders; permission filter may be empty
  }

  return (
    <AdminShell
      userName={userName}
      userRole={userRole}
      permissions={permissions}
    >
      {children}
    </AdminShell>
  );
}
