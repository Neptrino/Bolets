#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { instagramPalette, instagramFormats, instagramType, INSTAGRAM_FONT_NAME } from "../src/lib/instagram-design.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const port = Number(args.find(value => value.startsWith("--port="))?.slice(7) ?? 3127);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Choose a port between 1024 and 65535");
const origin = `http://127.0.0.1:${port}`;
const assets = new Map([
  ["/", ["tools/instagram-photo-studio/index.html", "text/html; charset=utf-8"]],
  ...["studio.css", "studio.mjs", "drawing.mjs", "geometry.mjs", "settings.mjs"].map(name => [`/${name}`, [`tools/instagram-photo-studio/${name}`, name.endsWith("css") ? "text/css" : "text/javascript"]]),
  ["/tokens.css", ["app/styles/tokens.css", "text/css"]],
  ["/brand.svg", ["app/icon.svg", "image/svg+xml"]],
  ...["Regular", "Bold", "ExtraBold", "Black"].map(weight => [`/fonts/${weight}.ttf`, [`public/fonts/nunito-sans/NunitoSans-${weight}.ttf`, "font/ttf"]]),
]);

const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  // Exact host and origin checks keep other websites from using this service.
  if (request.headers.host !== `127.0.0.1:${port}` || (request.headers.origin && request.headers.origin !== origin)) {
    response.writeHead(403).end("Forbidden"); return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end(); return;
  }
  try {
    const path = new URL(request.url, origin).pathname;
    if (path === "/design.json") {
      response.setHeader("Content-Type", "application/json");
      response.end(request.method === "HEAD" ? undefined : JSON.stringify({ palette: instagramPalette, formats: instagramFormats, type: instagramType, font: INSTAGRAM_FONT_NAME }));
      return;
    }
    const asset = assets.get(path);
    if (!asset) { response.writeHead(404).end("Not found"); return; }
    const data = await readFile(resolve(root, asset[0]));
    response.setHeader("Content-Type", asset[1]);
    response.end(request.method === "HEAD" ? undefined : data);
  } catch {
    response.writeHead(500).end("Could not load the local editor");
  }
});
server.on("error", error => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} is occupied. Open ${origin} if the editor is already running, or use --port=3128.` : error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Bolets Photo Studio: ${origin}\nPhotos stay in your browser. Ctrl+C stops the editor.`);
  if (process.platform === "darwin" && !args.includes("--no-open")) spawn("open", [origin], { stdio: "ignore" }).on("error", () => {});
});
process.on("SIGINT", () => server.close(() => process.exit(0)));
