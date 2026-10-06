import "server-only";
import { db } from "@/server/db";
import { requireUser } from "./auth/authorization";

export async function getWorkspace() {
  const user = await requireUser();
  let summary: { label: string; value: string; detail: string };
  switch (user.role) {
    case "BUYER": {
      const profile = await db.buyerProfile.findUnique({
        where: { userId: user.id },
        select: { publishedAt: true },
      });
      summary = {
        label: "Your investment profile",
        value: !profile
          ? "Not created"
          : profile.publishedAt
            ? "Published"
            : "Draft",
        detail: !profile
          ? "This buyer account has not created a profile yet."
          : profile.publishedAt
            ? "Your profile is published in the shared demo."
            : "Your profile is a private draft.",
      };
      break;
    }
    case "SELLER": {
      const count = await db.asset.count({ where: { sellerId: user.id } });
      summary = {
        label: "Your assets",
        value: String(count),
        detail: "Assets owned by this account, across all publication states.",
      };
      break;
    }
    case "MANAGER": {
      const count = await db.user.count({
        where: { role: { in: ["BUYER", "SELLER"] } },
      });
      summary = {
        label: "Demo participants",
        value: String(count),
        detail: "Fictional buyers and sellers, including unavailable accounts.",
      };
      break;
    }
  }
  return { user, summary };
}
