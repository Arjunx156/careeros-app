import { Table2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AddApplicationDialog } from "@/components/applications/add-application-dialog";
import { ApplicationsView } from "@/components/applications/applications-view";
import { EmptyState } from "@/components/ui/empty-state";
import { getApplicationCards } from "@/lib/applications/query";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";

export const metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const userId = await getOwnerId();

  const [applications, resumes] = await Promise.all([
    getApplicationCards(),
    prisma.resumeVersion.findMany({
      where: { userId },
      orderBy: [{ isMaster: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every application, from wishlist to outcome."
        actions={<AddApplicationDialog resumes={resumes} />}
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={Table2}
          title="No applications tracked yet"
          description="Add your first application. Drag it across the board as it moves through the pipeline, and every change is recorded to its timeline."
          action={{ label: "Analyze a job first", href: "/job-analyzer" }}
        />
      ) : (
        <ApplicationsView applications={applications} />
      )}
    </>
  );
}
