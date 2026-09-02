import { z } from "zod";

export const CONTRIBUTION_KINDS = [
  "useful_finding",
  "catalogue_correction",
  "reusable_media",
] as const;

export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];

export const SUBMITTABLE_CONTRIBUTION_KINDS = [
  "catalogue_correction",
  "reusable_media",
] as const;

export type SubmittableContributionKind = (typeof SUBMITTABLE_CONTRIBUTION_KINDS)[number];

export const CONTRIBUTION_DESCRIPTION_MIN_LENGTH = 20;
export const CONTRIBUTION_MEDIA_LIMIT = 4;
export const CONTRIBUTION_MEDIA_MAX_BYTES = 4_194_304;

export const CONTRIBUTION_KIND_LABELS: Record<ContributionKind, string> = {
  useful_finding: "Troballa pública enviada per revisió",
  catalogue_correction: "Correcció del catàleg amb fonts fiables",
  reusable_media: "Fotografia o recurs reutilitzable de bolets",
};

const optionalHttpsUrl = z.union([
  z.literal(""),
  z.null(),
  z.string().trim().max(500).url().refine(
    (value) => new URL(value).protocol === "https:",
    "L’enllaç ha de començar per https://",
  ),
]);

export const contributionRequestInputSchema = z.object({
  kind: z.enum(SUBMITTABLE_CONTRIBUTION_KINDS),
  description: z.string().trim().min(CONTRIBUTION_DESCRIPTION_MIN_LENGTH).max(1000),
  evidenceUrl: optionalHttpsUrl.optional().transform((value) => value || null),
  mediaCredit: z.union([z.literal(""), z.null(), z.string().trim().max(80)]).optional().transform((value) => value || null),
  mediaRightsConfirmed: z.boolean().optional().default(false),
  media: z.array(z.object({
    id: z.uuid(),
    stagingPath: z.string().regex(
      /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/,
    ),
    position: z.number().int().min(0).max(CONTRIBUTION_MEDIA_LIMIT - 1),
  })).max(CONTRIBUTION_MEDIA_LIMIT).optional().default([]),
}).superRefine((input, context) => {
  if (input.kind === "reusable_media") {
    if (!input.media.length) {
      context.addIssue({ code: "custom", path: ["media"], message: "Afegeix almenys una fotografia." });
    }
    if (!input.mediaRightsConfirmed) {
      context.addIssue({ code: "custom", path: ["mediaRightsConfirmed"], message: "Confirma els drets de reutilització." });
    }
    if (input.mediaCredit && input.mediaCredit.length < 2) {
      context.addIssue({ code: "custom", path: ["mediaCredit"], message: "El crèdit ha de tenir almenys dos caràcters." });
    }
    if (new Set(input.media.map((item) => item.position)).size !== input.media.length) {
      context.addIssue({ code: "custom", path: ["media"], message: "Hi ha fotografies duplicades." });
    }
    return;
  }
  if (input.media.length || input.mediaRightsConfirmed || input.mediaCredit) {
    context.addIssue({ code: "custom", path: ["media"], message: "Les fotografies directes corresponen a l’aportació de recursos reutilitzables." });
  }
});

export type ContributionRequestInput = z.infer<typeof contributionRequestInputSchema>;
export type ContributionMediaUpload = ContributionRequestInput["media"][number];

export type ContributionRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

export type ContributionRequestSummary = {
  id: string;
  kind: ContributionKind;
  description: string;
  evidenceUrl: string | null;
  findingId: string | null;
  mediaCount: number;
  status: ContributionRequestStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type ContributionMediaSummary = {
  id: string;
  width: number;
  height: number;
  position: number;
  url: string;
};

export type ContributorAccessSummary = {
  authenticated: boolean;
  active: boolean;
  level: "public" | "finding" | "contributor";
  minimumResolutionM: 250 | 1000 | 2500;
  activeUntil: string | null;
  oneKmActiveUntil: string | null;
  fineActiveUntil: string | null;
  revokedAt: string | null;
};

export type ContributorAccessRow = {
  active_until: string | null;
  one_km_active_until: string | null;
  revoked_at: string | null;
};

export function resolveContributorAccess(
  row: ContributorAccessRow | null,
  now = Date.now(),
): ContributorAccessSummary {
  const revokedAt = row?.revoked_at ?? null;
  const fineActiveUntil = row?.active_until ?? null;
  const storedOneKmUntil = row?.one_km_active_until ?? null;
  const fineExpiry = fineActiveUntil ? new Date(fineActiveUntil).getTime() : 0;
  const oneKmExpiry = storedOneKmUntil ? new Date(storedOneKmUntil).getTime() : 0;
  const effectiveOneKmUntil = fineExpiry >= oneKmExpiry ? fineActiveUntil : storedOneKmUntil;

  if (!revokedAt && fineExpiry > now) {
    return {
      authenticated: true,
      active: true,
      level: "contributor",
      minimumResolutionM: 250,
      activeUntil: fineActiveUntil,
      oneKmActiveUntil: effectiveOneKmUntil,
      fineActiveUntil,
      revokedAt,
    };
  }
  if (!revokedAt && Math.max(fineExpiry, oneKmExpiry) > now) {
    return {
      authenticated: true,
      active: true,
      level: "finding",
      minimumResolutionM: 1000,
      activeUntil: effectiveOneKmUntil,
      oneKmActiveUntil: effectiveOneKmUntil,
      fineActiveUntil,
      revokedAt,
    };
  }
  return {
    authenticated: true,
    active: false,
    level: "public",
    minimumResolutionM: 2500,
    activeUntil: null,
    oneKmActiveUntil: effectiveOneKmUntil,
    fineActiveUntil,
    revokedAt,
  };
}
