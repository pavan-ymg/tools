"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; badge?: number };

export default function NavLinks({
  canManageUsers,
  canManageRoles,
  isSuperAdminUser,
  dueCount,
}: {
  canManageUsers: boolean;
  canManageRoles: boolean;
  isSuperAdminUser: boolean;
  dueCount: number;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/leads", label: "Lead Feed" },
    { href: "/intake/new", label: "New Intake" },
    { href: "/intake", label: "Intake Records", badge: dueCount },
    { href: "/leaderboard", label: "Leaderboard" },
    ...(canManageUsers ? [{ href: "/admin/users", label: "Users" }] : []),
    ...(canManageRoles ? [{ href: "/admin/roles", label: "Roles" }] : []),
    ...(isSuperAdminUser ? [{ href: "/admin/audit", label: "Audit Log" }] : []),
  ];

  // "/intake" is itself a path-prefix of "/intake/new", so both would
  // match a naive startsWith check on a page under New Intake — pick
  // whichever matching item has the longest (most specific) href.
  const matchLengths = items.map((item) => (pathname === item.href || pathname.startsWith(`${item.href}/`) ? item.href.length : -1));
  const longestMatch = Math.max(-1, ...matchLengths);

  return (
    <>
      {items.map((item, i) => {
        const isActive = matchLengths[i] === longestMatch && longestMatch !== -1;
        return (
          <Link key={item.href} href={item.href} className={`nav-link${isActive ? " active" : ""}`}>
            {item.label}
            {!!item.badge && (
              <span
                style={{
                  background: "var(--danger)",
                  color: "white",
                  borderRadius: 999,
                  fontSize: 11,
                  lineHeight: 1,
                  padding: "2px 6px",
                }}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
