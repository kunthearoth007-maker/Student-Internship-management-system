import type { Role } from "@/types";

const PORTAL_PATHS = ["/messages", "/meetings", "/notifications", "/attendance"];

/**
 * Notification links are written once for every recipient role, so a generic path like
 * /meetings has to become /student/meetings or /admin/meetings depending on who is reading.
 */
export function portalLink(link: string | null | undefined, role: Role): string {
  if (!link) return `/${role}/dashboard`;

  const match = PORTAL_PATHS.find((path) => link.startsWith(path));
  if (match) return `/${role}${link}`;

  return link.startsWith(`/${role}/`) ? link : `/${role}/dashboard`;
}
