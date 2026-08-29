import type { ReactNode } from "react";

import { requireOperationalSession } from "@/src/lib/operational-status-session";

export default async function OperationalAdminLayout({ children }: { children: ReactNode }) {
  await requireOperationalSession();
  return children;
}
