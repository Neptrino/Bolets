import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { brotliCompressSync } from "node:zlib";

const exec = promisify(execFile);
// Test the image that production runs unless an override asks about another.
const composeImage = (await readFile("deploy/vps/compose.yaml", "utf8")).match(/image:\s*(caddy:\S+)/)?.[1];
const caddyImage = process.env.CADDY_IMAGE ?? composeImage;
assert(caddyImage, "Caddy image not found in deploy/vps/compose.yaml");
const directory = await mkdtemp(join(tmpdir(), "bolets-caddy-check-"));
let upstreamHeaders = {};
const upstream = createServer((request, response) => {
  upstreamHeaders = request.headers;
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("application response");
});
await new Promise((resolve) => upstream.listen(0, "0.0.0.0", resolve));
const baseConfig = (await readFile("deploy/vps/Caddyfile", "utf8"))
  .split("{$API_DOMAIN} {")[0]
  .replace("{$APP_DOMAIN}, www.{$APP_DOMAIN}", ":8080")
  .replace("email {$TLS_EMAIL}", "auto_https off")
  .replaceAll("app:3000", `host.docker.internal:${upstream.address().port}`);
const code = "console.log('static');".repeat(100);
const staticDirectory = join(directory, "static");
await mkdir(join(staticDirectory, "media/optimized/v11"), { recursive: true });
await mkdir(join(staticDirectory, "_next/static"), { recursive: true });
await writeFile(join(staticDirectory, "media/optimized/v11/test.webp"), "static image");
await writeFile(join(staticDirectory, "media/optimized/v11/test.avif"), "static AVIF image");
await writeFile(join(staticDirectory, "_next/static/test.js"), code);
await writeFile(join(staticDirectory, "_next/static/test.js.br"), brotliCompressSync(code));

async function startCaddy(label, config) {
  const name = `bolets-caddy-check-${process.pid}-${label}`;
  await writeFile(join(directory, `Caddyfile.${label}`), config);
  await exec("docker", ["run", "--detach", "--rm", "--name", name,
    "--add-host", "host.docker.internal:host-gateway", "--publish", "127.0.0.1::8080",
    "--volume", `${directory}/Caddyfile.${label}:/etc/caddy/Caddyfile:ro`,
    "--volume", `${staticDirectory}:/srv/bolets-static:ro`,
    caddyImage]);
  const { stdout } = await exec("docker", ["port", name, "8080/tcp"]);
  const origin = `http://${stdout.trim().split("\n")[0]}`;
  async function get(path, headers = {}) {
    const response = await fetch(`${origin}${path}`, { headers });
    const body = await response.text();
    assert.equal(response.status, 200, `${path}: ${JSON.stringify(Object.fromEntries(response.headers))}`);
    return { response, body };
  }
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await get("/api/health"); ready = true; break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  assert(ready, `Caddy (${label}) did not become ready`);
  return { name, origin, get, stop: () => exec("docker", ["rm", "--force", name]).catch(() => undefined) };
}

// A visitor claiming to be someone else, on every header the application or a
// proxy has ever used for the client address.
const spoofed = "203.0.113.9";
const spoofHeaders = { "CF-Connecting-IP": spoofed, "X-Real-IP": spoofed, "X-Forwarded-For": spoofed };
let peerIp;
try {
  const direct = await startCaddy("direct", baseConfig);
  try {
    const { get, origin, name } = direct;
    // The DNS-only state: the TCP peer is the visitor, whatever it claims.
    await get("/api/health", spoofHeaders);
    assert.equal(upstreamHeaders["cf-connecting-ip"], undefined, "CF-Connecting-IP reached the application");
    peerIp = upstreamHeaders["x-real-ip"];
    assert(peerIp && peerIp !== spoofed, `X-Real-IP must be the peer address, got ${peerIp}`);
    assert.equal(upstreamHeaders["x-forwarded-for"], peerIp);

    const sentinel = "PRIVATE_TIMING_SENTINEL";
    const image = await get(`/media/optimized/v11/test.webp?secret=${sentinel}`);
    assert.equal(image.body, "static image");
    assert.equal(image.response.headers.get("cache-control"), "public, max-age=31536000, immutable");
    const avif = await get("/media/optimized/v11/test.avif", { DNT: "1" });
    assert.equal(avif.body, "static AVIF image");
    assert.match(avif.response.headers.get("content-type") ?? "", /^image\/avif(?:;|$)/);
    assert.equal(avif.response.headers.get("cache-control"), "public, max-age=31536000, immutable");
    const javascript = await get("/_next/static/test.js", { "Accept-Encoding": "gzip" });
    assert.equal(javascript.body, code);
    assert.equal(javascript.response.headers.get("content-encoding"), "gzip");
    // The Brotli sidecar is served whole, with the immutable policy, never as a partial response.
    const brotli = await get("/_next/static/test.js", { "Accept-Encoding": "br" });
    assert.equal(brotli.body, code);
    assert.equal(brotli.response.headers.get("content-encoding"), "br");
    assert.equal(brotli.response.headers.get("cache-control"), "public, max-age=31536000, immutable");
    const missing = await fetch(`${origin}/_next/static/missing.js`);
    assert.equal(missing.status, 404);
    assert(!missing.headers.get("cache-control")?.includes("immutable"));
    await missing.text();
    await get(`/?q=${sentinel}`, { Authorization: `Bearer ${sentinel}`, Cookie: `session=${sentinel}`, "User-Agent": sentinel });
    await get(`/bolets/cep?private=${sentinel}`);
    await get(`/api/predictions?resolution=5000&west=${sentinel}`);
    for (const path of ["/admin", "/compte", "/acces", "/troballes/nova", "/api/predictions?resolution=1000"])
      await get(`${path}${path.includes("?") ? "&" : "?"}secret=${sentinel}`);
    await get("/", { DNT: "1" });
    await get("/media/optimized/v11/test.webp", { Referer: `https://bolets.app/admin/publicacio?secret=${sentinel}` });
    await new Promise((resolve) => setTimeout(resolve, 150));
    const logs = await exec("docker", ["logs", name]);
    const text = logs.stdout + logs.stderr;
    assert(!text.includes(sentinel), "Sensitive request information leaked to logs");
    const entries = text.split("\n").flatMap((line) => {
      try { const value = JSON.parse(line); return value.logger === "http.log.access.public_timing" ? [value] : []; }
      catch { return []; }
    });
    assert.equal(entries.length, 7, JSON.stringify(entries));
    for (const entry of entries) {
      assert.equal(entry.request, undefined);
      assert.equal(entry.resp_headers, undefined);
      assert.equal(entry.user_id, undefined);
      assert.equal(typeof entry.duration, "number");
    }
    assert(entries.some((entry) => entry.route_group === "map-data"));
    for (const entry of entries.filter((entry) => entry.route_group !== "static")) {
      assert(Number.isFinite(entry.upstream_latency_ms), JSON.stringify(entry));
      assert(Number.isFinite(entry.upstream_duration_ms), JSON.stringify(entry));
    }
  } finally {
    await direct.stop();
  }

  // The proxied state: a peer inside the trusted ranges is believed, and only
  // through CF-Connecting-IP. The test peer stands in for a Cloudflare edge.
  const proxiedConfig = baseConfig.replace("trusted_proxies static ", `trusted_proxies static ${peerIp}/32 `);
  assert.notEqual(proxiedConfig, baseConfig, "trusted_proxies directive not found");
  const proxied = await startCaddy("proxied", proxiedConfig);
  try {
    await proxied.get("/api/health", spoofHeaders);
    assert.equal(upstreamHeaders["x-real-ip"], spoofed);
    assert.equal(upstreamHeaders["cf-connecting-ip"], undefined);
    await proxied.get("/api/health", { "X-Real-IP": "198.51.100.7", "X-Forwarded-For": "198.51.100.7" });
    assert.equal(upstreamHeaders["x-real-ip"], peerIp, "a trusted peer's X-Real-IP or X-Forwarded-For must not be believed");
  } finally {
    await proxied.stop();
  }
  console.log("Caddy checks passed: direct assets, gzip and Brotli sidecars, immutable headers, client addressing in both DNS-only and proxied states, public timing and private/DNT exclusions.");
} finally {
  await new Promise((resolve) => upstream.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
