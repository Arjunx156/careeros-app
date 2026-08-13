import {
  BarChart3,
  Bot,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Microscope,
  Settings,
  Table2,
  Users,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  /** Section heading. Null for the ungrouped top item. */
  label: string | null;
  items: NavItem[];
};

/** Sidebar structure — source of truth: docs/03_App_Flow.md. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Resume",
    items: [
      { href: "/resume-library", label: "Resume Library", icon: FileText },
      { href: "/job-analyzer", label: "Job Analyzer", icon: Microscope },
    ],
  },
  {
    label: "Job Search",
    items: [
      { href: "/applications", label: "Applications", icon: Table2 },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
    ],
  },
  {
    label: "Networking",
    items: [
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/follow-ups", label: "Follow-Ups", icon: CalendarClock },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/copilot", label: "Career Copilot", icon: Bot },
    ],
  },
  {
    label: null,
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(
  (section) => section.items,
);

/** Resolve the page title for a pathname, longest-prefix first. */
export function titleForPath(pathname: string): string {
  const match = [...ALL_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return match?.label ?? "CareerOS";
}
