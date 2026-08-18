// ─── Auth barrel export ─────────────────────────────────────────────────────
export { signToken, verifyToken } from "./jwt";
export { setTokenCookie, removeTokenCookie, getTokenFromCookies } from "./cookies";
export { getCurrentUser } from "./session";
export {
  requireAuth,
  requireAdminAuth,
  requirePermission,
} from "./require-auth";
export {
  PERMISSIONS,
  PERMISSION_CATALOG,
  hasPermission,
  hasAnyPermission,
  isAdminPanelRole,
  type Permission,
} from "./permissions";
export {
  ensureSystemRoles,
  getPermissionsForRole,
  listAdminRoles,
} from "./roles";
export { setAuditSummary, setAuditResourceId } from "@/lib/audit/context";
