import Link from "next/link";
import { catalogUrl } from "@/features/marketplace/search";

export function Pagination({
  base,
  filters,
  page,
  pages,
}: {
  base: string;
  filters: Record<string, string>;
  page: number;
  pages: number;
}) {
  if (pages === 1) return null;

  return (
    <nav className="pagination" aria-label="Result pages">
      {page > 1 ? (
        <Link
          className="button button-secondary"
          href={catalogUrl(base, filters, page - 1)}
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span>Page {page} of {pages}</span>
      {page < pages ? (
        <Link
          className="button button-secondary"
          href={catalogUrl(base, filters, page + 1)}
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
