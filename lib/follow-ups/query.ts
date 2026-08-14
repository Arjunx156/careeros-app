import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

/**
 * Follow-ups grouped the way the App Flow doc describes them: overdue, due this
 * week, upcoming. Grouping happens here rather than in the UI so the dashboard
 * widget and the full page cannot drift apart.
 */

export type FollowUpItem = {
  id: string;
  type: "application" | "contact";
  dueDate: Date;
  note: string | null;
  application: { id: string; company: string; role: string } | null;
  contact: { id: string; name: string; company: string | null } | null;
};

export type GroupedFollowUps = {
  overdue: FollowUpItem[];
  thisWeek: FollowUpItem[];
  upcoming: FollowUpItem[];
  total: number;
};

function endOfWeek(): Date {
  const date = new Date();
  date.setDate(date.getDate() + (7 - ((date.getDay() + 6) % 7)));
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function getGroupedFollowUps(limit?: number): Promise<GroupedFollowUps> {
  const userId = await getOwnerId();

  const rows = await prisma.followUp.findMany({
    where: { userId, status: { in: ["pending", "snoozed"] } },
    orderBy: { dueDate: "asc" },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      type: true,
      dueDate: true,
      note: true,
      application: { select: { id: true, company: true, role: true } },
      contact: { select: { id: true, name: true, company: true } },
    },
  });

  const now = new Date();
  const weekEnd = endOfWeek();

  const grouped: GroupedFollowUps = {
    overdue: [],
    thisWeek: [],
    upcoming: [],
    total: rows.length,
  };

  for (const row of rows as FollowUpItem[]) {
    if (row.dueDate < now) grouped.overdue.push(row);
    else if (row.dueDate <= weekEnd) grouped.thisWeek.push(row);
    else grouped.upcoming.push(row);
  }

  return grouped;
}
