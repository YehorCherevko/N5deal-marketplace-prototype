import { Mailbox } from "@/features/inquiries/mailbox";
import type { SearchParams } from "@/features/marketplace/search";

export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <Mailbox box="sent" params={await searchParams} />;
}
