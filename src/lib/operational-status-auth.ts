import "server-only";

import {
  credentialsMatch,
  issueOperationalSession,
  OPERATIONAL_SESSION_TTL_SECONDS,
  operationalSessionIsValid,
} from "@/src/lib/operational-status-auth-core";

export const OPERATIONAL_SESSION_COOKIE = "bolets-admin-session";
export const OPERATIONAL_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: OPERATIONAL_SESSION_TTL_SECONDS,
  path: "/",
  priority: "high" as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

function sessionConfig() {
  const secret = process.env.STATUS_SESSION_SECRET;
  const username = process.env.STATUS_USERNAME;
  if (!secret || secret.length < 32 || !username) return null;
  return { secret, username };
}

export async function verifyOperationalCredentials(
  candidateUsername: string,
  candidatePassword: string,
) {
  const config = sessionConfig();
  const expectedPasswordHash = process.env.STATUS_PASSWORD_HASH;
  if (!config || !expectedPasswordHash) return false;

  return await credentialsMatch({
    candidatePassword,
    candidateUsername,
    expectedPasswordHash,
    expectedUsername: config.username,
  });
}

export async function createOperationalSession() {
  const config = sessionConfig();
  if (!config) throw new Error("Operational session authentication is not configured");
  return await issueOperationalSession(config);
}

export async function isOperationalSessionAuthorized(session: string | undefined) {
  const config = sessionConfig();
  return config ? await operationalSessionIsValid(session, config) : false;
}
