import Link from "next/link";
import { AccountControls } from "./account-controls";
import { roleLabels, type AccountRole } from "@/features/auth/access";

export function AppHeader({
  user,
  current,
}: {
  user: { name: string; role: AccountRole };
  current: string;
}) {
  const links = [
    { href: "/workspace", label: "Workspace" },
    { href: "/assets", label: "Assets" },
  ];
  if (user.role === "SELLER") links.push({ href: "/my-assets", label: "My assets" });
  if (user.role === "BUYER") links.push({ href: "/my-profile", label: "My profile" });
  else links.push({ href: "/buyers", label: "Buyers" });

  return (
    <header className="app-header marketplace-header">
      <Link href="/workspace" className="brand" aria-label="N5Deal home">
        N5Deal<span>.</span>
      </Link>
      <nav aria-label="Main navigation">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={current === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="header-account">
        <strong>{user.name}</strong>
        <span>{roleLabels[user.role]}</span>
      </div>
      <AccountControls />
    </header>
  );
}

export function AppShell({
  user,
  current,
  children,
}: {
  user: { name: string; role: AccountRole };
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-container">
      <AppHeader user={user} current={current} />
      <main id="main-content" className="marketplace-main">
        {children}
      </main>
      <p className="footer-note">
        Shared demo · Fictional participants and data · All monetary values in EUR
      </p>
    </div>
  );
}
