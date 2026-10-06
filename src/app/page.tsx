import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/authorization";

export default async function Home() {
  const user = await getSessionUser();
  redirect(
    !user
      ? "/sign-in"
      : user.status === "ACTIVE"
        ? "/workspace"
        : "/account-unavailable",
  );
}
