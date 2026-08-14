import type { NextRequest } from "next/server";
import { apiSuccess, apiValidationError, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { createApplicationSchema } from "@/lib/applications/schema";
import { APPLICATION_STATUSES } from "@/lib/applications/status";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();
    const params = request.nextUrl.searchParams;

    const status = params.get("status");
    const search = params.get("q")?.trim();

    const where: Prisma.ApplicationWhereInput = {
      userId,
      ...(status && APPLICATION_STATUSES.includes(status as never)
        ? { status: status as never }
        : {}),
      ...(search
        ? {
            OR: [
              { company: { contains: search, mode: "insensitive" } },
              { role: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const applications = await prisma.application.findMany({
      where,
      orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        company: true,
        role: true,
        status: true,
        location: true,
        country: true,
        workType: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        applicationDate: true,
        applicationMethod: true,
        matchScore: true,
        nextFollowupDate: true,
        createdAt: true,
        resumeVersion: { select: { id: true, name: true } },
        _count: { select: { interviews: true, messages: true } },
      },
    });

    return apiSuccess(applications);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const userId = await getOwnerId();

    const parsed = createApplicationSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);

    const { nextFollowupDate, ...data } = parsed.data;

    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          userId,
          ...data,
          nextFollowupDate: nextFollowupDate ?? null,
        },
        select: { id: true, company: true, role: true, status: true },
      });

      await tx.timelineEvent.create({
        data: {
          userId,
          applicationId: created.id,
          eventType: "created",
          description: `Added ${created.company} — ${created.role}`,
          newValue: created.status,
        },
      });

      // A follow-up date is only useful if something surfaces it, so the
      // reminder is created alongside rather than left implicit on the row.
      if (nextFollowupDate) {
        await tx.followUp.create({
          data: {
            userId,
            type: "application",
            applicationId: created.id,
            dueDate: nextFollowupDate,
            note: `Follow up with ${created.company}`,
          },
        });
      }

      return created;
    });

    return apiSuccess(application, 201);
  });
}
