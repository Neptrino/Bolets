import { hash } from "bcryptjs";
import { describe, expect, it } from "vitest";

import {
  credentialsMatch,
  issueOperationalSession,
  OPERATIONAL_SESSION_TTL_SECONDS,
  operationalSessionIsValid,
} from "@/src/lib/operational-status-auth-core";

const sessionConfig = {
  secret: "test-session-secret-with-at-least-32-characters",
  username: "bolets-ops",
};

describe("operational status authentication", () => {
  it("checks the configured bcrypt password without accepting a different username", async () => {
    const expectedPasswordHash = await hash("correct-horse-battery-staple", 4);

    await expect(credentialsMatch({
      candidatePassword: "correct-horse-battery-staple",
      candidateUsername: "bolets-ops",
      expectedPasswordHash,
      expectedUsername: "bolets-ops",
    })).resolves.toBe(true);
    await expect(credentialsMatch({
      candidatePassword: "correct-horse-battery-staple",
      candidateUsername: "someone-else",
      expectedPasswordHash,
      expectedUsername: "bolets-ops",
    })).resolves.toBe(false);
  });

  it("signs, verifies, and expires a bounded admin session", async () => {
    const issuedAt = new Date("2026-08-24T12:00:00.000Z");
    const session = await issueOperationalSession(sessionConfig, { now: issuedAt });

    await expect(operationalSessionIsValid(session, sessionConfig, {
      now: new Date(issuedAt.getTime() + 60_000),
    })).resolves.toBe(true);
    await expect(operationalSessionIsValid(session, {
      ...sessionConfig,
      secret: "a-different-session-secret-with-32-characters",
    }, { now: issuedAt })).resolves.toBe(false);
    await expect(operationalSessionIsValid(session, sessionConfig, {
      now: new Date(issuedAt.getTime() + (OPERATIONAL_SESSION_TTL_SECONDS + 1) * 1_000),
    })).resolves.toBe(false);
  });
});
