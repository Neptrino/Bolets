import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), "bolets-caddy-check-"));
const name = `bolets-caddy-check-${process.pid}`;
const upstream = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("application response");
});
await new Promise((resolve) => upstream.listen(0, "0.0.0.0", resolve));
try {
  const config = (await readFile("deploy/vps/Caddyfile", "utf8"))
    .split("{$API_DOMAIN} {")[0]
    .replace("{$APP_DOMAIN}, www.{$APP_DOMAIN}", ":8080")
    .replace("email {$TLS_EMAIL}", "auto_https off")
    .replaceAll("app:3000", `host.docker.internal:${upstream.address().port}`);
  await writeFile(join(directory, "Caddyfile"), config);
  await mkdir(join(directory, "static/media/optimized/v11"), { recursive: true });
  await mkdir(join(directory, "static/_next/static"), { recursive: true });
  await writeFile(join(directory, "static/media/optimized/v11/test.webp"), "static image");
  const code = "console.log('static');".repeat(100);
  await writeFile(join(directory, "static/_next/static/test.js"), code);
  await exec("docker", ["run", "--detach", "--rm", "--name", name,
    "--add-host", "host.docker.internal:host-gateway", "--publish", "127.0.0.1::8080",
    "--volume", `${directory}/Caddyfile:/etc/caddy/Caddyfile:ro`,
    "--volume", `${directory}/static:/srv/bolets-static:ro`,
    "caddy:2.10.2-alpine"]);
  const { stdout } = await exec("docker", ["port", name, "8080/tcp"]);
  const origin = `http://${stdout.trim()}`;
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
  assert(ready, "Caddy did not become ready");
  const sentinel = "PRIVATE_TIMING_SENTINEL";
  const image = await get(`/media/optimized/v11/test.webp?secret=${sentinel}`);
  assert.equal(image.body, "static image");
  assert.equal(image.response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  const javascript = await get("/_next/static/test.js", { "Accept-Encoding": "gzip" });
  assert.equal(javascript.body, code);
  assert.equal(javascript.response.headers.get("content-encoding"), "gzip");
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
  assert.equal(entries.length, 6, JSON.stringify(entries));
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
  console.log("Caddy checks passed: direct assets, gzip, immutable headers, public timing and private/DNT exclusions.");
} finally {
  await exec("docker", ["rm", "--force", name]).catch(() => undefined);
  await new Promise((resolve) => upstream.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
