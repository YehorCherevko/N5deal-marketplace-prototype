"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function FilterPanel({
  action,
  children,
}: {
  action: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <details className="filter-panel" open>
      <summary>Search and filters</summary>
      <form
        action={action}
        method="get"
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          const params = new URLSearchParams();
          for (const [key, value] of new FormData(event.currentTarget))
            if (typeof value === "string" && value.trim())
              params.set(key, value.trim());
          startTransition(() =>
            router.push(params.size ? `${action}?${params}` : action),
          );
        }}
      >
        <fieldset disabled={pending}>
          <div className="filter-grid">{children}</div>
          <div className="filter-actions">
            <button
              type="submit"
              className="button button-primary"
              disabled={pending}
            >
              {pending ? "Searching…" : "Apply filters"}
            </button>
            <Link href={action} className="button button-quiet">
              Reset filters
            </Link>
          </div>
        </fieldset>
      </form>
    </details>
  );
}
