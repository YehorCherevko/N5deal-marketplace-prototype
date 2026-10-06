export const roleLabels = {
  BUYER: "Buyer",
  SELLER: "Seller",
  MANAGER: "Manager",
} as const;
export type AccountRole = keyof typeof roleLabels;

export class AccessError extends Error {
  constructor(
    public readonly code:
      "UNAUTHENTICATED" | "ACCOUNT_UNAVAILABLE" | "FORBIDDEN",
  ) {
    super(code);
    this.name = "AccessError";
  }
}

export function assertMarketplaceAccess(
  user: {
    role: AccountRole;
    status: "ACTIVE" | "SUSPENDED" | "REMOVED";
  } | null,
  allowedRoles?: readonly AccountRole[],
) {
  if (!user) throw new AccessError("UNAUTHENTICATED");
  if (user.status !== "ACTIVE") throw new AccessError("ACCOUNT_UNAVAILABLE");
  if (allowedRoles && !allowedRoles.includes(user.role))
    throw new AccessError("FORBIDDEN");
}
