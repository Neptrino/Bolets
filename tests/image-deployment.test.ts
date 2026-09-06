import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const revision = "a".repeat(40);
const previous = "b".repeat(40);
const image = `ghcr.io/neptrino/bolets@sha256:${"c".repeat(64)}`;
const token = "ghs_test_temporary_credential";
const configScript = resolve("scripts/image-build-config.mjs");

function temporary() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "bolets-image-test-")));
  roots.push(root);
  return root;
}

function executable(path: string, content: string) {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("compiled public image configuration", () => {
  it("accepts matching configuration and reports only names on drift", () => {
    const cwd = temporary();
    const env = { ...process.env, NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key-marker", SUPPORT_URL: "https://example.com/support" };
    execFileSync(process.execPath, [configScript, "write"], { cwd, env });
    execFileSync(process.execPath, [configScript, "verify"], { cwd, env });
    const result = spawnSync(process.execPath, [configScript, "verify"], {
      cwd, env: { ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: "changed-key-marker" }, encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(result.stderr).not.toContain("public-key-marker");
    expect(result.stderr).not.toContain("changed-key-marker");
    expect(readFileSync(join(cwd, "build-config.json"), "utf8")).not.toContain("SERVICE_ROLE");
  });

  it("rejects missing or malformed build metadata", () => {
    const cwd = temporary();
    expect(spawnSync(process.execPath, [configScript, "verify"], { cwd }).status).not.toBe(0);
    writeFileSync(join(cwd, "build-config.json"), "{}");
    expect(spawnSync(process.execPath, [configScript, "verify"], { cwd }).status).not.toBe(0);
  });
});

function receiverFixture() {
  const root = temporary();
  const deploy = join(root, "deployment");
  const bin = join(root, "bin");
  const source = join(root, "source");
  mkdirSync(join(source, "deploy/vps"), { recursive: true });
  mkdirSync(join(deploy, "releases", previous, "deploy/vps"), { recursive: true });
  mkdirSync(bin);
  const rollout = `#!/bin/sh
set -eu
printf 'rollout:%s\n' "$(basename "$1")" >> "$TEST_LOG"
if [ "$(basename "$1")" = "$TEST_FAIL_REVISION" ]; then exit 1; fi
`;
  executable(join(source, "deploy/vps/rollout.sh"), rollout);
  executable(join(deploy, "releases", previous, "deploy/vps/rollout.sh"), rollout);
  writeFileSync(join(source, "deploy/vps/compose.yaml"), "services: {}\n");
  writeFileSync(join(source, "Dockerfile"), "FROM scratch\n");
  // Archived transport metadata must never win over the authenticated header.
  writeFileSync(join(source, ".release-image"), "attacker-controlled\n");
  symlinkSync(join(deploy, "releases", previous), join(deploy, "app"));
  executable(join(bin, "id"), "#!/bin/sh\necho 0\n");
  executable(join(bin, "flock"), "#!/bin/sh\nexit 0\n");
  executable(join(bin, "curl"), "#!/bin/sh\nexit \"${TEST_HEALTH_EXIT:-0}\"\n");
  // POSIX rename semantics for the receiver's GNU mv -Tf on macOS too.
  executable(join(bin, "mv"), `#!${process.execPath}\nconst fs=require('node:fs'); const a=process.argv.slice(2).filter(x=>!x.startsWith('-')); fs.renameSync(a[0],a[1]);\n`);
  executable(join(bin, "docker"), `#!/bin/sh
set -eu
test "$1" = login
test "$2" = ghcr.io
test "$5" = --password-stdin
test -d "$DOCKER_CONFIG"
cat > "$DOCKER_CONFIG/config.json"
printf 'login\n' >> "$TEST_LOG"
exit "\${TEST_LOGIN_EXIT:-0}"
`);
  const receiver = join(root, "receiver.sh");
  writeFileSync(receiver, readFileSync("deploy/vps/receive-release.sh", "utf8")
    .replace("deploy_root=/opt/bolets", `deploy_root='${deploy}'`)
    .replace("/run/lock/bolets-deploy.lock", join(root, "deploy.lock"))
    .replace("/run/bolets-registry.XXXXXX", join(root, "registry.XXXXXX")));
  const archive = join(root, "release.tar.gz");
  execFileSync("tar", ["-czf", archive, "-C", source, "."]);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_LOG: join(root, "events"), TEST_FAIL_REVISION: "" };
  function run(options: { image?: string; token?: string; legacy?: boolean; env?: Partial<NodeJS.ProcessEnv>; archive?: Buffer } = {}) {
    const header = options.legacy ? `${revision}\n` : `ghcr-v1\n${revision}\n${options.image ?? image}\nNeptrino\n${options.token ?? token}\n`;
    return spawnSync("sh", [receiver], {
      input: Buffer.concat([Buffer.from(header), options.archive ?? readFileSync(archive)]),
      env: { ...env, ...options.env }, encoding: "utf8",
    });
  }
  return { root, deploy, run, log: () => readFileSync(env.TEST_LOG, "utf8") };
}

describe("forced-command image release transport", { timeout: 15_000 }, () => {
  it("accepts long opaque registry tokens without logging or retaining them", () => {
    const f = receiverFixture();
    const credential = `header.${"aB0_-+/=".repeat(256)}.signature`;
    const result = f.run({ token: credential });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout + result.stderr + f.log()).not.toContain(credential);
    expect(readdirSync(f.root).filter(name => name.startsWith("registry."))).toEqual([]);
  });

  it.each(["", "a".repeat(16385)])("rejects empty or oversized credentials before login", (credential) => {
    const f = receiverFixture();
    expect(f.run({ token: credential }).status).toBe(65);
    expect(existsSync(join(f.root, "events"))).toBe(false);
  });

  it("activates the source with its immutable digest and deletes credentials", () => {
    const f = receiverFixture();
    const result = f.run();
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(f.deploy, "app/.release-image"), "utf8")).toBe(`${image}\n`);
    expect(readFileSync(join(f.deploy, "app/.release-revision"), "utf8")).toBe(`${revision}\n`);
    expect(readdirSync(f.root).filter(name => name.startsWith("registry."))).toEqual([]);
    expect(result.stdout + result.stderr + f.log()).not.toContain(token);
  });

  it.each(["ghcr.io/neptrino/bolets:latest", image.replace("neptrino", "another-owner"), image.slice(0, -1)])(
    "rejects an unpinned or unexpected image: %s", (invalid) => {
      const f = receiverFixture();
      expect(f.run({ image: invalid }).status).toBe(65);
      expect(existsSync(join(f.root, "events"))).toBe(false);
    },
  );

  it("rejects an invalid archive before registry authentication", () => {
    const f = receiverFixture();
    expect(f.run({ archive: Buffer.from("not gzip") }).status).toBe(65);
    expect(existsSync(join(f.root, "events"))).toBe(false);
  });

  it.each([{ TEST_FAIL_REVISION: revision }, { TEST_HEALTH_EXIT: "22" }])(
    "restores the preceding release and cleans credentials on failure: %o", (env) => {
      const f = receiverFixture();
      expect(f.run({ env }).status).toBe(70);
      expect(f.log()).toContain(`rollout:${revision}\nrollout:${previous}`);
      expect(readdirSync(f.root).filter(name => name.startsWith("registry."))).toEqual([]);
      expect(existsSync(join(f.deploy, "app/.release-image"))).toBe(false);
    },
  );

  it("cleans credentials if login fails, without starting a rollout", () => {
    const f = receiverFixture();
    expect(f.run({ env: { TEST_LOGIN_EXIT: "1" } }).status).not.toBe(0);
    expect(f.log()).toBe("login\n");
    expect(readdirSync(f.root).filter(name => name.startsWith("registry."))).toEqual([]);
  });

  it("permits retries with the same digest but refuses to replace an active digest", () => {
    const f = receiverFixture();
    expect(f.run().status).toBe(0);
    expect(f.run().status).toBe(0);
    expect(f.run({ image: `ghcr.io/neptrino/bolets@sha256:${"d".repeat(64)}` }).status).toBe(65);
    expect(readFileSync(join(f.deploy, "app/.release-image"), "utf8")).toBe(`${image}\n`);
  });

  it("accepts the old source-only protocol during the receiver transition", () => {
    const f = receiverFixture();
    expect(f.run({ legacy: true }).status).toBe(0);
    expect(f.log()).toBe(`rollout:${revision}\n`);
    expect(existsSync(join(f.deploy, "app/.release-image"))).toBe(false);
  });
});

it("loads release metadata as data and rejects extra lines or shell expressions", () => {
  const root = temporary();
  const script = resolve("deploy/vps/load-release-image.sh");
  writeFileSync(join(root, ".release-revision"), `${revision}\n`);
  function load(value: string) {
    writeFileSync(join(root, ".release-image"), value);
    return spawnSync("sh", ["-c", 'app_dir=$1; . "$2"; printf "%s" "$BOLETS_APP_IMAGE"', "sh", root, script], { encoding: "utf8" });
  }
  expect(load(`${image}\n`).stdout).toBe(image);
  expect(load(`${image}\nextra\n`).status).toBe(65);
  expect(load(`${image}\nextra`).status).toBe(65);
  expect(load(`$(touch ${root}/executed)\n`).status).toBe(65);
  expect(existsSync(join(root, "executed"))).toBe(false);
});

function rolloutFixture() {
  const root = temporary();
  const app = join(root, "app");
  const scripts = join(app, "deploy/vps");
  const supabase = join(root, "supabase");
  const bin = join(root, "bin");
  for (const path of [scripts, supabase, bin]) mkdirSync(path, { recursive: true });
  writeFileSync(join(app, "Dockerfile"), "FROM scratch\n");
  writeFileSync(join(app, ".release-image"), `${image}\n`);
  writeFileSync(join(app, ".release-revision"), `${revision}\n`);
  for (const name of ["rollout.sh", "load-release-image.sh", "compose.yaml"])
    writeFileSync(join(scripts, name), readFileSync(`deploy/vps/${name}`));
  for (const name of ["apply-database-migrations", "sync-functions", "bootstrap-umami", "warm-map-cache"])
    executable(join(scripts, `${name}.sh`), `#!/bin/sh\nprintf '%s\\n' '${name}' >> "$TEST_LOG"\n`);
  writeFileSync(join(supabase, "docker-compose.yml"), "services: {}\n");
  writeFileSync(join(supabase, ".env"), [
    "APP_DOMAIN=bolets.app", "API_DOMAIN=api.bolets.app", "SITE_URL=https://bolets.app",
    "API_EXTERNAL_URL=https://api.bolets.app/auth/v1",
    "ADDITIONAL_REDIRECT_URLS=https://bolets.app/auth/callback,https://www.bolets.app/auth/callback",
    "DISABLE_SIGNUP=false", "ENABLE_EMAIL_SIGNUP=true", "GOOGLE_ENABLED=false",
  ].join("\n") + "\n");
  const status = join(root, "status.env");
  writeFileSync(status, ["STATUS_INTERNAL_TOKEN", "CONTRIBUTOR_ACCESS_SECRET", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "ABUSE_RATE_LIMIT_SECRET", "CACHE_WARM_SECRET"]
    .map(key => `${key}=fixture`).join("\n") + "\n", { mode: 0o600 });
  const umami = join(root, "umami.env");
  writeFileSync(umami, "UMAMI_WEBSITE_ID=fixture\nUMAMI_ADMIN_PASSWORD=fixture\n", { mode: 0o600 });
  executable(join(bin, "systemctl"), '#!/bin/sh\nprintf "systemctl %s\\n" "$*" >> "$TEST_LOG"\n');
  for (const name of ["install", "rm"])
    executable(join(bin, name), "#!/bin/sh\nexit 0\n");
  executable(join(bin, "docker"), `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$TEST_LOG"
case "$*" in
  'image inspect --format '*) printf '%s\\n' "$TEST_IMAGE_REVISION" ;;
  'image inspect '*) test "$TEST_IMAGE_CACHED" = true ;;
  'pull '*) exit "$TEST_PULL_EXIT" ;;
  *'scripts/image-build-config.mjs verify') exit "$TEST_CONFIG_EXIT" ;;
esac
`);
  const env = {
    ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_LOG: join(root, "events"),
    TEST_IMAGE_REVISION: revision, TEST_IMAGE_CACHED: "true", TEST_PULL_EXIT: "0", TEST_CONFIG_EXIT: "0",
    BOLETS_STATUS_ENV_FILE: status, BOLETS_UMAMI_ENV_FILE: umami,
    BOLETS_OBSERVABILITY_ENV_FILE: join(root, "absent"), BOLETS_INSTAGRAM_ENV_FILE: join(root, "absent"),
  };
  return {
    run: (extra: Partial<NodeJS.ProcessEnv> = {}) => spawnSync("sh", [join(scripts, "rollout.sh"), app, supabase], { env: { ...env, ...extra }, encoding: "utf8" }),
    log: () => readFileSync(env.TEST_LOG, "utf8"),
  };
}

describe("VPS image rollout", { timeout: 15_000 }, () => {
  it("reuses a cached image without a build or registry access, and validates before migrating", () => {
    const f = rolloutFixture();
    const result = f.run();
    expect(result.status, result.stderr).toBe(0);
    const log = f.log();
    expect(log).not.toContain("build app");
    expect(log).not.toContain(`pull ${image}`);
    expect(log).toContain("up -d --wait --no-build");
    expect(log).toContain("systemctl start --no-block bolets-map-cache.service");
    expect(log).not.toMatch(/^warm-map-cache$/m);
    expect(log.indexOf("scripts/image-build-config.mjs verify")).toBeLessThan(log.indexOf("scripts/export-static-assets.mjs"));
    expect(log.indexOf("scripts/export-static-assets.mjs")).toBeLessThan(log.indexOf("apply-database-migrations"));
    expect(log.indexOf("apply-database-migrations")).toBeLessThan(log.indexOf("up -d"));
  });

  it("pulls a missing image by its exact digest", () => {
    const f = rolloutFixture();
    expect(f.run({ TEST_IMAGE_CACHED: "false" }).status).toBe(0);
    expect(f.log()).toContain(`pull ${image}`);
  });

  it.each([
    { TEST_IMAGE_REVISION: previous },
    { TEST_CONFIG_EXIT: "1" },
    { TEST_IMAGE_CACHED: "false", TEST_PULL_EXIT: "1" },
  ])("fails before asset export, migrations or activation when image validation fails: %o", (env) => {
    const f = rolloutFixture();
    expect(f.run(env).status).not.toBe(0);
    expect(f.log()).not.toContain("scripts/export-static-assets.mjs");
    expect(f.log()).not.toContain("apply-database-migrations");
    expect(f.log()).not.toContain("up -d");
  });
});
