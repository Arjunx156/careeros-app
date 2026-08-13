"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    exact: true,
  },
];

const sections = [
  {
    label: "AI Tools",
    items: [
      {
        label: "Job Analyzer",
        href: "/job-analyzer",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        ),
      },
      {
        label: "Resume Library",
        href: "/resume-library",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" />
          </svg>
        ),
      },
      {
        label: "Career Copilot",
        href: "/copilot",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
        badge: "AI",
      },
    ],
  },
  {
    label: "Job Search CRM",
    items: [
      {
        label: "Applications",
        href: "/applications",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,11 12,14 22,4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
      {
        label: "Job Pipeline",
        href: "/jobs",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Networking",
    items: [
      {
        label: "Contacts",
        href: "/contacts",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: "Follow-Ups",
        href: "/follow-ups",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{
        width: "var(--sidebar-width, 240px)",
        minHeight: "100vh",
        background: "white",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 20,
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "18px 16px 16px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "30px",
            height: "30px",
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "white", fontWeight: "800", fontSize: "14px" }}>C</span>
        </div>
        <span style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>CareerOS</span>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {/* Dashboard Overview */}
        <div style={{ marginBottom: "4px" }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${isActive(item.href, item.exact) ? "active" : ""}`}
            >
              <span style={{ opacity: isActive(item.href, item.exact) ? 1 : 0.6 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.label} style={{ marginTop: "20px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#9ca3af",
                padding: "0 10px",
                marginBottom: "6px",
              }}
            >
              {section.label}
            </div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
              >
                <span style={{ opacity: isActive(item.href) ? 1 : 0.6 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {"badge" in item && item.badge && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      background: "#eef2ff",
                      color: "#4f46e5",
                      padding: "2px 6px",
                      borderRadius: "9999px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom — Settings & User */}
      <div style={{ padding: "12px 10px 16px", borderTop: "1px solid #f3f4f6" }}>
        <Link
          href="/settings"
          className={`sidebar-item ${isActive("/settings") ? "active" : ""}`}
          style={{ marginBottom: "8px" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 10px",
            borderRadius: "8px",
            background: "#f9fafb",
          }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e5e7eb" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "#111827" }}>Account</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
