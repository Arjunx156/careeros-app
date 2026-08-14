import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  ApplicationDetail,
  type ApplicationDetailData,
} from "@/components/applications/application-detail";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/applications/[id]">) {
  const { id } = await props.params;
  const userId = await getOwnerId();
  const application = await prisma.application.findFirst({
    where: { id, userId },
    select: { company: true, role: true },
  });

  return {
    title: application ? `${application.company} — ${application.role}` : "Application",
  };
}

export default async function ApplicationDetailPage(
  props: PageProps<"/applications/[id]">,
) {
  const { id } = await props.params;
  const userId = await getOwnerId();

  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: {
      resumeVersion: { select: { id: true, name: true } },
      analysis: { select: { id: true, overallScore: true, status: true } },
      interviews: { orderBy: { scheduledAt: "asc" } },
      messages: { orderBy: { createdAt: "desc" } },
      timelineEvents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) notFound();

  return (
    <>
      <Link
        href="/applications"
        className="mb-4 inline-flex items-center gap-1.5 text-label text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Applications
      </Link>

      <ApplicationDetail application={application as unknown as ApplicationDetailData} />
    </>
  );
}
