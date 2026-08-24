import { timingSafeEqual } from "node:crypto";

import { compare } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";

const SESSION_AUDIENCE = "bolets-operational-status";
const SESSION_ISSUER = "bolets.app";
const SESSION_SCOPE = "operational-status";

export const OPERATIONAL_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type OperationalSessionConfig = {
  secret: string;
  username: string;
};

type SessionTiming = {
  now?: Date;
};

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

function constantTimeEqual(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length
    && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function credentialsMatch({
  candidatePassword,
  candidateUsername,
  expectedPasswordHash,
  expectedUsername,
}: {
  candidatePassword: string;
  candidateUsername: string;
  expectedPasswordHash: string;
  expectedUsername: string;
}) {
  let passwordMatches = false;
  try {
    // Always run the expensive password comparison so username failures do
    // not create a useful timing distinction.
    passwordMatches = await compare(candidatePassword, expectedPasswordHash);
  } catch {
    passwordMatches = false;
  }

  return constantTimeEqual(candidateUsername, expectedUsername) && passwordMatches;
}

export async function issueOperationalSession(
  config: OperationalSessionConfig,
  timing: SessionTiming = {},
) {
  const now = timing.now ?? new Date();
  const issuedAt = Math.floor(now.getTime() / 1_000);

  return await new SignJWT({ scope: SESSION_SCOPE })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(SESSION_AUDIENCE)
    .setIssuer(SESSION_ISSUER)
    .setSubject(config.username)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + OPERATIONAL_SESSION_TTL_SECONDS)
    .sign(secretKey(config.secret));
}

export async function operationalSessionIsValid(
  session: string | undefined,
  config: OperationalSessionConfig,
  timing: SessionTiming = {},
) {
  if (!session) return false;

  try {
    const { payload } = await jwtVerify(session, secretKey(config.secret), {
      algorithms: ["HS256"],
      audience: SESSION_AUDIENCE,
      issuer: SESSION_ISSUER,
      requiredClaims: ["exp", "iat", "sub"],
      currentDate: timing.now,
    });

    return payload.scope === SESSION_SCOPE && payload.sub === config.username;
  } catch {
    return false;
  }
}
