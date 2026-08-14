import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MessageDrawer } from "@/components/contacts/message-drawer";
import { ContactStatusPicker } from "@/components/contacts/contact-status-picker";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { RELATIONSHIP_CONFIG } from "@/lib/contacts/status";
import { MESSAGE_TYPES } from "@/lib/contacts/status";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/contacts/[id]">) {
  const { id } = await props.params;
  const userId = await getOwnerId();
  const contact = await prisma.contact.findFirst({
    where: { id, userId },
    select: { name: true },
  });
  return { title: contact?.name ?? "Contact" };
}

function messageTypeLabel(type: string): string {
  return MESSAGE_TYPES.find((item) => item.value === type)?.label ?? type;
}

export default async function ContactDetailPage(props: PageProps<"/contacts/[id]">) {
  const { id } = await props.params;
  const userId = await getOwnerId();

  const contact = await prisma.contact.findFirst({
    where: { id, userId },
    include: {
      messages: { orderBy: { createdAt: "desc" } },
      applications: {
        select: { id: true, company: true, role: true, status: true },
      },
    },
  });

  if (!contact) notFound();

  const config = RELATIONSHIP_CONFIG[contact.relationshipStatus];

  const details = [
    { label: "Company", value: contact.company },
    { label: "Role", value: contact.position },
    { label: "Location", value: contact.location },
    { label: "How you found them", value: contact.howMet },
    { label: "Role you want there", value: contact.targetRole },
    {
      label: "Last contacted",
      value: contact.lastContactedAt
        ? format(contact.lastContactedAt, "d MMM yyyy")
        : null,
    },
    {
      label: "Follow up",
      value: contact.nextFollowupDate
        ? format(contact.nextFollowupDate, "d MMM yyyy")
        : null,
    },
  ];

  return (
    <>
      <Link
        href="/contacts"
        className="mb-4 inline-flex items-center gap-1.5 text-label text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Contacts
      </Link>

      <PageHeader
        title={contact.name}
        description={
          [contact.position, contact.company].filter(Boolean).join(" · ") ||
          "No role recorded"
        }
        actions={<MessageDrawer contactId={contact.id} contactName={contact.name} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-section text-ink">Relationship</h2>
                <p className="mt-0.5 text-body text-ink-secondary">
                  Next step: {config.nextStep}
                </p>
              </div>
              <ContactStatusPicker
                contactId={contact.id}
                status={contact.relationshipStatus}
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-section text-ink">Messages</h2>
            {contact.messages.length === 0 ? (
              <p className="mt-3 text-body text-ink-secondary">
                Nothing sent yet. Generate a message to get started — it is written
                from your resume, so it can only claim what you have actually done.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {contact.messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-[var(--radius-control)] border border-line p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-label font-medium text-ink">
                        {messageTypeLabel(message.type)}
                      </span>
                      <span className="text-label text-ink-muted">
                        {message.status}
                        {message.sentAt
                          ? ` · ${format(message.sentAt, "d MMM yyyy")}`
                          : ""}
                      </span>
                    </div>
                    <p className="mt-1.5 text-body whitespace-pre-wrap text-ink-secondary">
                      {message.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {contact.notes ? (
            <section className="card p-5">
              <h2 className="text-section text-ink">Notes</h2>
              <p className="mt-2 text-body whitespace-pre-wrap text-ink-secondary">
                {contact.notes}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="text-section text-ink">Details</h2>
            <dl className="mt-3 space-y-2.5">
              {details.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-label text-ink-secondary">{row.label}</dt>
                  <dd className="text-right text-label font-medium text-ink">
                    {row.value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {contact.linkedinUrl ? (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-line px-3 text-label font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  LinkedIn
                  <ExternalLink aria-hidden className="size-3" />
                </a>
              ) : null}
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-line px-3 text-label font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  <Mail aria-hidden className="size-3" />
                  Email
                </a>
              ) : null}
            </div>
          </section>

          {contact.applications.length > 0 ? (
            <section className="card p-5">
              <h2 className="text-section text-ink">Linked applications</h2>
              <ul className="mt-3 space-y-1.5">
                {contact.applications.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={`/applications/${application.id}`}
                      className="text-body text-ink hover:text-brand-600"
                    >
                      {application.company} — {application.role}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
