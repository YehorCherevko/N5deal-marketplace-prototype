"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/features/marketplace/form-state";
import { formFailure } from "@/server/form-failure";
import { archiveSellerAsset, saveSellerAsset } from "./mutations";

function refresh(id: string) {
  for (const path of ["/assets", `/assets/${id}`, "/my-assets", `/my-assets/${id}/edit`, "/workspace"]) revalidatePath(path);
}
export async function saveAsset(id: string | null, _state: FormState, form: FormData): Promise<FormState> {
  const intent = z.enum(["save", "publish"]).safeParse(form.get("intent") ?? "save");
  if (!intent.success) return { error: "Choose Save or Publish.", fields: {} };
  const input = Object.fromEntries(["title", "description", "businessCategory", "assetType", "jurisdiction", "licenseType", "businessStatus", "priceType", "askingPrice"].map((key) => [key, form.get(key) ?? ""]));
  let savedId;
  try { savedId = await saveSellerAsset(id, input, intent.data); } catch (error) { return formFailure(error); }
  refresh(savedId);
  redirect(`/my-assets/${savedId}/edit?saved=${intent.data === "publish" ? "published" : id ? "updated" : "created"}`);
}
export async function archiveAsset(id: string): Promise<FormState> {
  try { await archiveSellerAsset(id); } catch (error) { return formFailure(error); }
  refresh(id);
  redirect(`/my-assets/${id}/edit?saved=archived`);
}
