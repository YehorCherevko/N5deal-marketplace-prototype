"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { demoPersonas } from "./personas";
import { clearSession, createSession } from "./session";

export type SignInState = { error: string | null };

export async function signIn(_state: SignInState, formData: FormData): Promise<SignInState> {
  const input = z.object({ personaId: z.uuid() }).safeParse({ personaId: formData.get("personaId") });
  if (!input.success || !demoPersonas.some((persona) => persona.userId === input.data.personaId)) {
    return { error: "Choose one of the demo accounts below." };
  }

  let destination: string;
  try {
    const user = await db.user.findUnique({
      where: { id: input.data.personaId }, select: { id: true, status: true },
    });
    if (!user) return { error: "This demo account is unavailable. Please choose another account." };
    await createSession(user.id);
    destination = user.status === "ACTIVE" ? "/workspace" : "/account-unavailable";
  } catch (error) {
    console.error("Demo sign-in failed", error);
    return { error: "We couldn’t sign you in. Please try again." };
  }
  redirect(destination);
}

export async function signOut() {
  await clearSession();
  redirect("/sign-in");
}
