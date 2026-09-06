import { readFile, writeFile } from "node:fs/promises";

// Only configuration already compiled into the public application belongs here.
const keys = [
  "NEXT_PUBLIC_UMAMI_WEBSITE_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "SUPPORT_URL",
];
const expected = Object.fromEntries(keys.map((key) => [key, process.env[key] || ""]));
const file = "build-config.json";

if (process.argv[2] === "write") {
  await writeFile(file, `${JSON.stringify(expected)}\n`);
} else if (process.argv[2] === "verify") {
  const built = JSON.parse(await readFile(file, "utf8"));
  const mismatches = keys.filter((key) => built[key] !== expected[key]);
  if (mismatches.length) {
    // Report names only: even public keys need not appear in deployment logs.
    throw new Error(`Image build configuration differs from VPS: ${mismatches.join(", ")}`);
  }
  console.log("Image build configuration matches the VPS");
} else {
  throw new Error("Usage: node scripts/image-build-config.mjs write|verify");
}
