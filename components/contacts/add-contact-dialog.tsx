"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { RELATIONSHIP_CONFIG, RELATIONSHIP_STATUSES } from "@/lib/contacts/status";

export function AddContactDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "");

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value("name"),
          company: value("company"),
          position: value("position"),
          linkedinUrl: value("linkedinUrl"),
          email: value("email"),
          location: value("location"),
          relationshipStatus: value("relationshipStatus"),
          howMet: value("howMet"),
          targetRole: value("targetRole"),
          nextFollowupDate: value("nextFollowupDate"),
          notes: value("notes"),
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        fields?: Record<string, string>;
        data?: { id: string };
      };

      if (!response.ok || !payload.ok || !payload.data) {
        setErrors(payload.fields ?? {});
        toast.error(payload.error ?? "Could not save that contact.");
        return;
      }

      toast.success("Contact added.");
      setIsOpen(false);
      router.push(`/contacts/${payload.data.id}`);
      router.refresh();
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Add Contact
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => !isSubmitting && setIsOpen(false)}
        title="Add a contact"
        description="Only a name is required. The rest is what makes generated outreach specific rather than generic."
        className="sm:max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" required error={errors.name}>
              <TextInput id="name" name="name" autoFocus maxLength={120} />
            </Field>
            <Field label="Company" htmlFor="company">
              <TextInput id="company" name="company" maxLength={120} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Their role" htmlFor="position">
              <TextInput id="position" name="position" maxLength={160} />
            </Field>
            <Field label="Relationship" htmlFor="relationshipStatus">
              <Select
                id="relationshipStatus"
                name="relationshipStatus"
                defaultValue="not_contacted"
              >
                {RELATIONSHIP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {RELATIONSHIP_CONFIG[status].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="LinkedIn URL" htmlFor="linkedinUrl">
            <TextInput
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email">
              <TextInput id="email" name="email" type="email" maxLength={160} />
            </Field>
            <Field label="Location" htmlFor="location">
              <TextInput id="location" name="location" maxLength={120} />
            </Field>
          </div>

          <Field
            label="How you found them"
            htmlFor="howMet"
            hint="The single most useful field for outreach — be specific."
          >
            <TextInput
              id="howMet"
              name="howMet"
              maxLength={200}
              placeholder="e.g. Their post about payments reconciliation"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role you want there" htmlFor="targetRole">
              <TextInput id="targetRole" name="targetRole" maxLength={160} />
            </Field>
            <Field label="Follow up on" htmlFor="nextFollowupDate">
              <TextInput id="nextFollowupDate" name="nextFollowupDate" type="date" />
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes">
            <TextArea id="notes" name="notes" rows={3} maxLength={10_000} />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
              Add contact
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
