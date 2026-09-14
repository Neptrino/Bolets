import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Dates content from git so editorial `updatedAt` values can be checked
 * against what actually changed. A source is either a whole file or a
 * bracket-delimited block (or single line) inside a file, located through a
 * marker string; blocks are dated with `git blame` so one species entry can
 * change without touching its siblings in the same catalogue file.
 */
export type ContentSource =
  | { kind: "file"; file: string }
  | {
      kind: "block";
      file: string;
      /** Substring(s) that must all appear on the block's anchor line. */
      marker: string | string[];
      /** Marker of an enclosing block that the search is limited to. */
      scope?: string;
      unit?: "block" | "line";
      /** Skip silently when the marker is absent (an entry that not every catalogue file carries). */
      optional?: boolean;
    };

export interface SourceDate {
  source: ContentSource;
  /** ISO date (YYYY-MM-DD) in the Catalonia time zone. */
  date: string;
  /** Uncommitted working-tree changes are dated today. */
  uncommitted: boolean;
  /** 1-indexed line range for block sources. */
  lines?: [number, number];
}

const CATALONIA_TIME_ZONE = "Europe/Madrid";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CATALONIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function isoDateInCatalonia(epochSeconds: number) {
  return dateFormatter.format(new Date(epochSeconds * 1000));
}

export function todayInCatalonia() {
  return isoDateInCatalonia(Date.now() / 1000);
}

function git(root: string, args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

export interface GitContentDates {
  /** Why history cannot be trusted; null when it can. */
  unavailable: string | null;
  /** Null only for an optional block whose marker is absent. */
  date(source: ContentSource): SourceDate | null;
}

export interface GitContentDatesOptions {
  /**
   * Abbreviated or full hashes of commits that touched content sources
   * without changing what readers see (style scoping, loading work,
   * refactors). They are skipped when dating files; lines they last touched
   * are treated as unchanged since before them.
   */
  ignoredCommits?: readonly string[];
}

export function createGitContentDates(root: string, options: GitContentDatesOptions = {}): GitContentDates {
  const ignored = (sha: string) => (options.ignoredCommits ?? []).some((prefix) => sha.startsWith(prefix));
  let unavailable: string | null = null;
  try {
    if (git(root, ["rev-parse", "--is-shallow-repository"]).trim() === "true") {
      unavailable = "shallow clone: git history does not reach every content change";
    }
  } catch {
    unavailable = "git history is not available in this checkout";
  }

  let dirtyFiles: Set<string> | null = null;
  const dirty = (file: string) => {
    if (!dirtyFiles) {
      dirtyFiles = new Set(
        git(root, ["status", "--porcelain", "--untracked-files=all", "--no-renames"])
          .split("\n")
          .filter(Boolean)
          .map((line) => line.slice(3)),
      );
    }
    return dirtyFiles.has(file);
  };

  const fileDates = new Map<string, number | null>();
  const lastCommitTime = (file: string) => {
    if (!fileDates.has(file)) {
      const commits = git(root, ["log", "--format=%H %ct", "--", file])
        .split("\n")
        .filter(Boolean)
        .map((entry) => entry.split(" "))
        .filter(([sha]) => !ignored(sha));
      fileDates.set(file, commits.length ? Number(commits[0][1]) : null);
    }
    return fileDates.get(file) ?? null;
  };

  const blames = new Map<string, number[]>();
  const blameTimes = (file: string) => {
    let times = blames.get(file);
    if (!times) {
      times = parseBlame(git(root, ["blame", "--line-porcelain", "--", file]), ignored);
      blames.set(file, times);
    }
    return times;
  };

  const requireFile = (file: string) => {
    if (!existsSync(path.join(root, file))) {
      throw new Error(`Content source ${file} does not exist; update the editorial source map`);
    }
  };

  return {
    unavailable,
    date(source) {
      requireFile(source.file);
      if (source.kind === "file") {
        if (dirty(source.file)) {
          return { source, date: todayInCatalonia(), uncommitted: true };
        }
        const time = lastCommitTime(source.file);
        if (time === null) {
          throw new Error(`Content source ${source.file} has no git history`);
        }
        return { source, date: isoDateInCatalonia(time), uncommitted: false };
      }

      const text = readFileSync(path.join(root, source.file), "utf8");
      const lines = locateBlock(text, source);
      if (!lines) return null;
      const times = blameTimes(source.file);
      const uncommitted = times.length < lines[1];
      let latest = 0;
      for (let line = lines[0]; line <= Math.min(lines[1], times.length); line += 1) {
        latest = Math.max(latest, times[line - 1]);
      }
      if (uncommitted) {
        return { source, date: todayInCatalonia(), uncommitted: true, lines };
      }
      if (latest === 0) {
        // Every line was last touched by an ignored commit: nothing dates it.
        return null;
      }
      const blamedNow = latest >= Date.now() / 1000 - 60;
      return { source, date: isoDateInCatalonia(latest), uncommitted: blamedNow, lines };
    },
  };
}

/**
 * Committer time per (1-indexed) line; uncommitted lines get the current
 * time and lines last touched by an ignored commit get 0.
 */
function parseBlame(porcelain: string, ignored: (sha: string) => boolean) {
  const times: number[] = [];
  let currentLine = 0;
  let committerTime = 0;
  let uncommitted = false;
  let skipped = false;
  for (const line of porcelain.split("\n")) {
    const header = /^([0-9a-f]{40}) \d+ (\d+)(?: \d+)?$/.exec(line);
    if (header) {
      currentLine = Number(header[2]);
      uncommitted = /^0{40}$/.test(header[1]);
      skipped = !uncommitted && ignored(header[1]);
      continue;
    }
    if (line.startsWith("committer-time ")) {
      committerTime = Number(line.slice("committer-time ".length));
      continue;
    }
    if (line.startsWith("\t")) {
      times[currentLine - 1] = uncommitted ? Math.floor(Date.now() / 1000) : skipped ? 0 : committerTime;
    }
  }
  return times;
}

interface BracketPair {
  open: number;
  close: number;
  char: "{" | "[";
}

/**
 * Finds the 1-indexed line range of the `{}`/`[]` literal that the marker
 * line opens or, failing that, the innermost one enclosing it, skipping brackets inside strings and comments.
 */
export function locateBlock(
  text: string,
  source: Extract<ContentSource, { kind: "block" }>,
): [number, number] | null {
  const lines = text.split("\n");
  const pairs = bracketPairs(text);
  const findLine = (marker: string | string[], range: [number, number]) => {
    const markers = Array.isArray(marker) ? marker : [marker];
    for (let index = range[0] - 1; index < range[1]; index += 1) {
      if (markers.every((part) => lines[index].includes(part))) return index + 1;
    }
    return null;
  };
  const requireLine = (marker: string | string[], range: [number, number]) => {
    const found = findLine(marker, range);
    if (found === null) {
      throw new Error(`Marker ${JSON.stringify(marker)} not found in ${source.file}; update the editorial source map`);
    }
    return found;
  };
  // A literal that opens on the anchor line is the entry itself (`"id": [`,
  // `export const x = [`); otherwise the entry is the innermost literal
  // enclosing the line. Same-line `[]`/`{}` type annotations are skipped by
  // preferring the widest pair that opens on the line.
  const blockAt = (line: number) => {
    let opening: BracketPair | undefined;
    let enclosing: BracketPair | undefined;
    for (const pair of pairs) {
      if (pair.open === line && pair.close > line && (!opening || pair.close > opening.close)) {
        opening = pair;
      }
      if (pair.open < line && pair.close > line && (!enclosing || pair.close - pair.open < enclosing.close - enclosing.open)) {
        enclosing = pair;
      }
    }
    const best = opening ?? enclosing;
    return best ? ([best.open, best.close] as [number, number]) : ([1, lines.length] as [number, number]);
  };

  let range: [number, number] = [1, lines.length];
  if (source.scope) {
    range = blockAt(requireLine(source.scope, range));
  }
  const markerLine = source.optional ? findLine(source.marker, range) : requireLine(source.marker, range);
  if (markerLine === null) return null;
  return source.unit === "line" ? [markerLine, markerLine] : blockAt(markerLine);
}

function bracketPairs(text: string) {
  const pairs: BracketPair[] = [];
  const stack: { char: "{" | "["; line: number }[] = [];
  const templateDepths: number[] = [];
  let line = 1;
  let state: "code" | "double" | "single" | "template" | "lineComment" | "blockComment" = "code";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\n") line += 1;

    switch (state) {
      case "double":
        if (char === "\\") index += 1;
        else if (char === '"') state = "code";
        break;
      case "single":
        if (char === "\\") index += 1;
        else if (char === "'") state = "code";
        break;
      case "template":
        if (char === "\\") index += 1;
        else if (char === "`") state = "code";
        else if (char === "$" && next === "{") {
          templateDepths.push(stack.length);
          stack.push({ char: "{", line });
          index += 1;
          state = "code";
        }
        break;
      case "lineComment":
        if (char === "\n") state = "code";
        break;
      case "blockComment":
        if (char === "*" && next === "/") {
          index += 1;
          state = "code";
        }
        break;
      default:
        if (char === '"') state = "double";
        else if (char === "'") state = "single";
        else if (char === "`") state = "template";
        else if (char === "/" && next === "/") state = "lineComment";
        else if (char === "/" && next === "*") state = "blockComment";
        else if (char === "{" || char === "[") stack.push({ char, line });
        else if (char === "}" || char === "]") {
          const open = stack.pop();
          if (!open) continue;
          const templateDepth = templateDepths[templateDepths.length - 1];
          if (char === "}" && templateDepth === stack.length) {
            templateDepths.pop();
            state = "template";
            continue;
          }
          pairs.push({ open: open.line, close: line, char: open.char });
        }
    }
  }
  return pairs;
}
