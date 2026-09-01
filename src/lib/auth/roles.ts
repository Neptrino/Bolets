export const APP_ROLES = {
  admin: "admin",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

type RoleBearingUser = {
  app_metadata?: Record<string, unknown> | null;
};

export function userHasAppRole(user: RoleBearingUser, role: AppRole) {
  return user.app_metadata?.app_role === role;
}
