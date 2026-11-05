import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/types";

const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  student: "/student/dashboard",
  company: "/company/dashboard",
  supervisor: "/supervisor/dashboard",
};

const PROTECTED_PREFIXES = ["student", "company", "supervisor", "admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  const token = request.cookies.get("sims_token")?.value;
  const role = request.cookies.get("sims_role")?.value as Role | undefined;

  // Logged-in users skip the auth pages.
  if ((pathname === "/login" || pathname === "/register") && token && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  if (PROTECTED_PREFIXES.includes(segment)) {
    if (!token) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (role && role !== (segment as Role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/student/:path*", "/company/:path*", "/supervisor/:path*", "/admin/:path*"],
};
