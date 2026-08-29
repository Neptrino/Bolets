import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const localConfig = readFileSync("supabase/config.toml", "utf8");
const productionCompose = readFileSync("deploy/vps/compose.yaml", "utf8");

describe("passwordless auth configuration", () => {
  it("binds local passkeys to the localhost app origin", () => {
    expect(localConfig).toContain("[auth.passkey]\nenabled = true");
    expect(localConfig).toContain('rp_id = "localhost"');
    expect(localConfig).toContain('rp_origins = ["http://localhost:3101"]');
  });

  it("keeps production passkeys bound to the stable public relying party", () => {
    expect(productionCompose).toContain("GOTRUE_PASSKEY_ENABLED");
    expect(productionCompose).toContain("GOTRUE_WEBAUTHN_RP_ID");
    expect(productionCompose).toContain("GOTRUE_WEBAUTHN_RP_ORIGINS");
  });

  it("enables local Google sign-in without committing its secret", () => {
    expect(localConfig).toContain("[auth.external.google]\nenabled = true");
    expect(localConfig).toContain(
      'secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"',
    );
    expect(productionCompose).toContain("GOTRUE_EXTERNAL_GOOGLE_ENABLED: ${GOOGLE_ENABLED:-false}");
  });
});
