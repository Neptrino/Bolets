import { spawnSync } from "node:child_process";
import { isAbsolute, join, relative, resolve } from "node:path";

/**
 * Parses `--name=value` / `--flag` CLI arguments into a Map. Later duplicates
 * win, matching the behaviour of the existing comparison CLIs.
 */
export function parseCliArguments(argv = process.argv.slice(2)) {
  return new Map(
    argv.filter((argument) => argument.startsWith("--")).map((argument) => {
      const [name, ...value] = argument.slice(2).split("=");
      return [name, value.length ? value.join("=") : "true"];
    }),
  );
}

/**
 * Private inputs and outputs (finding coordinates, replay artifacts, reports)
 * must stay outside the repository so they can never be committed.
 */
export function externalAbsolutePath(value, label, repositoryRoot = process.cwd()) {
  if (typeof value !== "string" || !isAbsolute(value)) {
    throw new Error(`${label} must be an absolute path outside the repository`);
  }
  const absolute = resolve(value);
  const repositoryRelative = relative(repositoryRoot, absolute);
  if (!repositoryRelative.startsWith("..") && repositoryRelative !== "") {
    throw new Error(`${label} must stay outside the repository`);
  }
  return absolute;
}

/**
 * Validates a comparison app origin: root HTTP(S) URL without credentials,
 * query, or path; loopback-only unless the caller explicitly opted in to a
 * remote origin (a prediction query is a tight bbox around a private spot).
 */
export function comparisonOrigin(value, remoteAllowed, label = "--app-url") {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute HTTP(S) URL`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error(`${label} must be a root HTTP(S) origin without credentials or parameters`);
  }
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (!loopback.has(url.hostname) && !remoteAllowed) {
    throw new Error("Remote comparison origins require explicit --allow-remote opt-in");
  }
  return url.origin;
}

/**
 * Runs one env-gated vitest test file and exits the process with its status.
 * Repo TypeScript uses the `@/*` alias, so anything importing app modules must
 * execute under vitest rather than plain node.
 */
export function runVitestTool(testFile, env) {
  const vitestPath = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const result = spawnSync(process.execPath, [
    vitestPath,
    "run",
    testFile,
    "--reporter=verbose",
    "--disableConsoleIntercept",
  ], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${testFile} ended after signal ${result.signal}`);
  process.exit(result.status ?? 1);
}
