import "server-only";
import { notFound, redirect } from "next/navigation";
import { AccessError } from "@/features/auth/access";

export async function pageAccess<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    if (error.code === "UNAUTHENTICATED") redirect("/sign-in");
    if (error.code === "ACCOUNT_UNAVAILABLE") redirect("/account-unavailable");
    notFound();
  }
}
