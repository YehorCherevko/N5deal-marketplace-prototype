import "server-only";
import seed from "../../../prisma/seed-data.json";
import { db } from "@/server/db";

export const demoPersonas = seed.demoPersonas;

export async function getDemoAccounts() {
  const users = await db.user.findMany({
    where: { id: { in: demoPersonas.map((persona) => persona.userId) } },
    select: {
      id: true,
      name: true,
      role: true,
      companyName: true,
      countryCode: true,
      status: true,
    },
  });
  return demoPersonas.map((persona) => ({
    userId: persona.userId,
    label: persona.label,
    user: users.find((user) => user.id === persona.userId) ?? null,
  }));
}
