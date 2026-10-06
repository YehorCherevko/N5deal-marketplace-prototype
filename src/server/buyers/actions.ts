"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/features/marketplace/form-state";
import { formFailure } from "@/server/form-failure";
import { saveOwnProfile, hideOwnProfile } from "./mutations";

function refresh() {
  for (const path of ["/my-profile", "/buyers", "/workspace"])
    revalidatePath(path);
  revalidatePath("/buyers/[id]", "page");
}
export async function saveProfile(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const intent = z
    .enum(["save", "publish"])
    .safeParse(form.get("intent") ?? "save");
  if (!intent.success) return { error: "Choose Save or Publish.", fields: {} };
  const input = {
    ...Object.fromEntries(
      [
        "name",
        "companyName",
        "countryCode",
        "thesis",
        "budgetMin",
        "budgetMax",
      ].map((key) => [key, form.get(key) ?? ""]),
    ),
    targetCategories: form.getAll("targetCategories"),
    targetJurisdictions: form.getAll("targetJurisdictions"),
  };
  try {
    await saveOwnProfile(input, intent.data);
  } catch (error) {
    return formFailure(error);
  }
  refresh();
  redirect(
    `/my-profile?saved=${intent.data === "publish" ? "published" : "updated"}`,
  );
}
export async function hideProfile(): Promise<FormState> {
  try {
    await hideOwnProfile();
  } catch (error) {
    return formFailure(error);
  }
  refresh();
  redirect("/my-profile?saved=hidden");
}
