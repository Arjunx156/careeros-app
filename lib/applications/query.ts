import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import type { ApplicationCardData } from "@/components/applications/application-card";

/**
 * Application cards, with time-dependent flags resolved here.
 *
 * "Is this follow-up overdue?" depends on the clock, and reading the clock
 * while rendering is impure — the server and the client can land on opposite
 * sides of a deadline and disagree, which surfaces as a hydration mismatch.
 * Resolving it during data loading gives every card one consistent answer.
 */
export async function getApplicationCards(): Promise<ApplicationCardData[]> {
  const userId = await getOwnerId();

  const rows = await prisma.application.findMany({
    where: { userId },
    orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      company: true,
      role: true,
      status: true,
      location: true,
      workType: true,
      applicationDate: true,
      matchScore: true,
      nextFollowupDate: true,
      resumeVersion: { select: { id: true, name: true } },
      _count: { select: { interviews: true, messages: true } },
    },
  });

  const now = Date.now();

  return rows.map((row) => ({
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status,
    location: row.location,
    workType: row.workType,
    applicationDate: row.applicationDate,
    matchScore: row.matchScore,
    nextFollowupDate: row.nextFollowupDate,
    resumeVersion: row.resumeVersion,
    interviewCount: row._count.interviews,
    messageCount: row._count.messages,
    isFollowUpOverdue: row.nextFollowupDate
      ? row.nextFollowupDate.getTime() < now
      : false,
  }));
}
