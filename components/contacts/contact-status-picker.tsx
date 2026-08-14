"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { RELATIONSHIP_CONFIG, RELATIONSHIP_STATUSES } from "@/lib/contacts/status";
import type { RelationshipStatus } from "@/lib/generated/prisma/enums";

export function ContactStatusPicker({
  contactId,
  status: initial,
}: {
  contactId: string;
  status: RelationshipStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  async function change(next: RelationshipStatus) {
    const previous = status;
    setStatus(next);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipStatus: next }),
      });
      if (!response.ok) throw new Error();

      toast.success(`Moved to ${RELATIONSHIP_CONFIG[next].label}.`);
      router.refresh();
    } catch {
      setStatus(previous);
      toast.error("Could not update the relationship.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Select
      aria-label="Relationship status"
      value={status}
      disabled={isSaving}
      onChange={(event) => change(event.target.value as RelationshipStatus)}
      className="w-52"
    >
      {RELATIONSHIP_STATUSES.map((option) => (
        <option key={option} value={option}>
          {RELATIONSHIP_CONFIG[option].label}
        </option>
      ))}
    </Select>
  );
}
