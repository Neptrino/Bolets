import type { ReactNode } from "react";

import { requireOperationalSession } from "@/src/lib/operational-status-session";
import { AdminNav } from "./admin-nav";
import styles from "./admin-shell.module.css";

export default async function PrivateAdminLayout({ children }: { children: ReactNode }) {
  await requireOperationalSession();
  return (
    <div className={styles.adminArea}>
      <div className={styles.navFrame}>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
