import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { APP_ROLES, userHasAppRole } from "@/src/lib/auth/roles";

describe("operational status authentication", () => {
  it("accepts only the trusted application role", () => {
    expect(userHasAppRole({ app_metadata: { app_role: "admin" } }, APP_ROLES.admin)).toBe(true);
    expect(userHasAppRole({ app_metadata: { app_role: "member" } }, APP_ROLES.admin)).toBe(false);
    expect(userHasAppRole({ app_metadata: {} }, APP_ROLES.admin)).toBe(false);
  });

  it("assigns the initial administrator through non-user-editable app metadata", () => {
    const migration = readFileSync(
      "supabase/migrations/20260901151545_assign_initial_admin_role.sql",
      "utf8",
    );
    const baselineVerifier = readFileSync(
      "deploy/vps/verify-restored-migration-baseline.sql",
      "utf8",
    );
    expect(migration).toContain("update auth.users");
    expect(migration).toContain("raw_app_meta_data");
    expect(migration).toContain("'app_role', 'admin'");
    expect(migration).toContain("lower(email) = 'aleix@ventayol.cat'");
    expect(migration).not.toContain("raw_user_meta_data");
    expect(baselineVerifier).toContain("raw_app_meta_data ->> 'app_role' = 'admin'");
    expect(baselineVerifier).toContain("The restored schema is missing the initial administrator role");
  });
});
