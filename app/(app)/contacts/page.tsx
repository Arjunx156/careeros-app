import Link from "next/link";
import { Users } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { AddContactDialog } from "@/components/contacts/add-contact-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { RELATIONSHIP_CONFIG, RELATIONSHIP_STATUSES } from "@/lib/contacts/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Contacts" };
export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const userId = await getOwnerId();

  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      company: true,
      position: true,
      relationshipStatus: true,
      lastContactedAt: true,
      nextFollowupDate: true,
      _count: { select: { messages: true } },
    },
  });

  // Group by stage so the page answers "who needs something from me?" rather
  // than being one long undifferentiated list.
  const byStatus = new Map(
    RELATIONSHIP_STATUSES.map((status) => [status, [] as typeof contacts]),
  );
  for (const contact of contacts) {
    byStatus.get(contact.relationshipStatus)?.push(contact);
  }

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Everyone you have reached out to, and where each conversation stands."
        actions={<AddContactDialog />}
      />

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add a recruiter, hiring manager or alum. CareerOS writes outreach from your resume, so it only claims things you have actually done."
          action={{ label: "Add your first contact", href: "/contacts" }}
        />
      ) : (
        <div className="space-y-6">
          {RELATIONSHIP_STATUSES.map((status) => {
            const group = byStatus.get(status) ?? [];
            if (group.length === 0) return null;
            const config = RELATIONSHIP_CONFIG[status];

            return (
              <section key={status} aria-labelledby={`group-${status}`}>
                <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
                  <h2 id={`group-${status}`} className="section-label">
                    {config.label}
                    <span className="tabular ml-1.5 text-ink-muted">{group.length}</span>
                  </h2>
                  <p className="text-label text-ink-muted">— {config.nextStep}</p>
                </div>

                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.map((contact) => (
                    <li key={contact.id}>
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="card card-interactive block p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-card-title text-ink">
                            {contact.name}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-[var(--radius-badge)] border px-1.5 py-0.5 text-label font-medium",
                              config.badge,
                            )}
                          >
                            {config.label}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-body text-ink-secondary">
                          {[contact.position, contact.company]
                            .filter(Boolean)
                            .join(" · ") || "No role recorded"}
                        </p>

                        <p className="mt-2 text-label text-ink-muted">
                          {contact._count.messages > 0
                            ? `${contact._count.messages} message${contact._count.messages === 1 ? "" : "s"}`
                            : "No messages yet"}
                          {contact.lastContactedAt
                            ? ` · last ${format(contact.lastContactedAt, "d MMM")}`
                            : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
