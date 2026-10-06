import { Mailbox } from "@/features/inquiries/mailbox";
import type { SearchParams } from "@/features/marketplace/search";

export default async function InboxPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Mailbox box="inbox" params={await searchParams} />;
}
