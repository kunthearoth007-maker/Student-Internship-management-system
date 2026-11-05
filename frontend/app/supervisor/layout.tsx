import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Dashboard pages gate their UI on the auth token client-side, so they can
// never produce an instant server shell — opt the subtree out of validation.
export const instant = false;

// The Suspense boundary is what lets the client shell prerender instead of bailing out.
export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardLayout role="supervisor">{children}</DashboardLayout>
    </Suspense>
  );
}
