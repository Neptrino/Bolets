/* Resolves the project's "@/…" import alias for scripts run with
   `node --experimental-strip-types`, which reads tsconfig paths from nowhere. */
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts"];

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = join(ROOT, specifier.slice(2));
    const candidate = existsSync(base) && !base.endsWith("/") ? base : EXTENSIONS.map((ext) => `${base}${ext}`).find(existsSync);
    if (candidate) return nextResolve(pathToFileURL(candidate).href, context);
  }
  return nextResolve(specifier, context);
}
