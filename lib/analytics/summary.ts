import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import type { ApplicationStatus } from "@/lib/generated/prisma/enums";

/** Statuses that mean the application reached at least an interview loop. */
const INTERVIEW_STATUSES: ApplicationStatus[] = [
  "interview",
  "final_round",
  "offer",
];

/** Statuses that mean a human responded, positively or not. */
const RESPONDED_STATUSES: ApplicationStatus[] = [
  "recruiter_screen",
  "interview",
  "final_round",
  "offer",
  "rejected",
];

/** Statuses that represent a live, submitted application. */
const SUBMITTED_STATUSES: ApplicationStatus[] = [
  "applied",
  "recruiter_screen",
  "interview",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
];

export type DashboardSummary = {
  totalApplications: number;
  thisWeek: number;
  thisMonth: number;
  interviews: number;
  offers: number;
  rejections: number;
  awaitingResponse: number;
  responseRate: number | null;
  interviewRate: number | null;
  offerRate: number | null;
  resumeCount: number;
  contactCount: number;
  analysisCount: number;
};

function startOfWeek(): Date {
  const date = new Date();
  // ISO weeks start Monday; getDay() returns 0 for Sunday.
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Percentage of `part` out of `whole`, or null when there is nothing to divide. */
function rate(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Math.round((part / whole) * 100);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const userId = await getOwnerId();
  const where = { userId };

  const [
    totalApplications,
    thisWeek,
    thisMonth,
    submitted,
    interviews,
    offers,
    rejections,
    awaitingResponse,
    responded,
    resumeCount,
    contactCount,
    analysisCount,
  ] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.count({
      where: { ...where, applicationDate: { gte: startOfWeek() } },
    }),
    prisma.application.count({
      where: { ...where, applicationDate: { gte: startOfMonth() } },
    }),
    prisma.application.count({
      where: { ...where, status: { in: SUBMITTED_STATUSES } },
    }),
    prisma.application.count({
      where: { ...where, status: { in: INTERVIEW_STATUSES } },
    }),
    prisma.application.count({ where: { ...where, status: "offer" } }),
    prisma.application.count({ where: { ...where, status: "rejected" } }),
    prisma.application.count({ where: { ...where, status: "applied" } }),
    prisma.application.count({
      where: { ...where, status: { in: RESPONDED_STATUSES } },
    }),
    prisma.resumeVersion.count({ where }),
    prisma.contact.count({ where }),
    prisma.analysis.count({ where }),
  ]);

  return {
    totalApplications,
    thisWeek,
    thisMonth,
    interviews,
    offers,
    rejections,
    awaitingResponse,
    responseRate: rate(responded, submitted),
    interviewRate: rate(interviews, submitted),
    offerRate: rate(offers, submitted),
    resumeCount,
    contactCount,
    analysisCount,
  };
}
