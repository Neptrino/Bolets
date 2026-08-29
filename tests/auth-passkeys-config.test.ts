import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const localConfig = readFileSync("supabase/config.toml", "utf8");
const productionCompose = readFileSync("deploy/vps/compose.yaml", "utf8");
const productionEnvExample = readFileSync("deploy/vps/bolets.env.example", "utf8");
const productionRollout = readFileSync("deploy/vps/rollout.sh", "utf8");
const browserClient = readFileSync("src/lib/supabase/client.ts", "utf8");
const serverClient = readFileSync("src/lib/supabase/server.ts", "utf8");
const requestProxy = readFileSync("proxy.ts", "utf8");

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

  it("keeps production account creation and exact OAuth callbacks enabled", () => {
    expect(productionEnvExample).toContain("DISABLE_SIGNUP=false");
    expect(productionEnvExample).toContain("ENABLE_EMAIL_SIGNUP=true");
    expect(productionEnvExample).toContain(
      "ADDITIONAL_REDIRECT_URLS=https://www.bolets.app,https://bolets.app/auth/callback,https://www.bolets.app/auth/callback",
    );
    expect(productionRollout).toContain("DISABLE_SIGNUP must be false");
    expect(productionRollout).toContain("ADDITIONAL_REDIRECT_URLS must allow");
    expect(productionRollout).toContain("API_EXTERNAL_URL must include the production /auth/v1 path");
  });

  it("uses one auth cookie name across public and internal Supabase hosts", () => {
    for (const source of [browserClient, serverClient, requestProxy]) {
      expect(source).toContain("cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME }");
    }
  });
});
