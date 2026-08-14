import "server-only";

import { z } from "zod";
import { generateStructured } from "@/lib/ai/gemini";
import { zodToGemini } from "@/lib/ai/zod-to-gemini";
import type { MessageTypeValue } from "@/lib/contacts/status";

/**
 * Cold outreach generator.
 *
 * The failure mode here is not hallucination — it is blandness. A message that
 * could have been sent to anyone gets ignored, so the prompt bans the specific
 * phrases that make outreach read as templated, and the schema forces the model
 * to state what makes the message specific to this person.
 */

export const generatedMessageSchema = z.object({
  message: z.string().min(1),
  /** Subject line, for email. Empty for LinkedIn. */
  subject: z.string().default(""),
  /**
   * What in the message is specific to this person. If the model cannot fill
   * this in, the message is generic and the UI says so.
   */
  personalizationUsed: z.array(z.string()).max(4).default([]),
  characterCount: z.number().int().default(0),
});

export type GeneratedMessage = z.infer<typeof generatedMessageSchema>;

const BANNED_OPENERS = [
  "I hope this message finds you well",
  "I hope you are doing well",
  "Dear Sir/Madam",
  "To whom it may concern",
  "I am reaching out to you today",
  "I wanted to reach out",
  "I came across your profile and was impressed",
];

const TYPE_BRIEF: Record<MessageTypeValue, string> = {
  connection_request:
    "A LinkedIn connection request. HARD LIMIT 280 characters. One reason you " +
    "are connecting. Ask for nothing. No pitch.",
  after_connection:
    "The first message after they accept. Two to four sentences. Open a " +
    "conversation — do not ask for a job, a referral, or a call yet.",
  recruiter:
    "A message to a recruiter about a specific role. Lead with the two or " +
    "three things that make the candidate a fit. Under 120 words. End with a " +
    "low-friction ask.",
  hiring_manager:
    "A message to a hiring manager. Lead with what the candidate would " +
    "contribute to their team, not with what they want. Under 120 words.",
  follow_up:
    "A follow-up after no reply. Under 70 words. Warm, not accusatory, and " +
    "give them an easy way out. Add one new piece of value.",
};

export type MessageContext = {
  type: MessageTypeValue;
  contact: {
    name: string;
    company: string | null;
    position: string | null;
    howMet: string | null;
    relationshipStatus: string;
  };
  targetRole: string | null;
  /** Free-text the user pasted: their LinkedIn bio, a recent post, mutual ties. */
  extraContext: string | null;
  /** Candidate side, drawn from their resume so claims stay true. */
  candidate: {
    name: string | null;
    headline: string | null;
    topSkills: string[];
    evidence: string[];
  };
};

function buildPrompt(context: MessageContext): string {
  const { contact, candidate } = context;

  return `Write one ${context.type.replace(/_/g, " ")} message.

BRIEF
${TYPE_BRIEF[context.type]}

WHO YOU ARE WRITING TO
Name: ${contact.name}
Role: ${contact.position ?? "(unknown)"}
Company: ${contact.company ?? "(unknown)"}
How the sender found them: ${contact.howMet ?? "(not recorded)"}
Relationship so far: ${contact.relationshipStatus.replace(/_/g, " ")}

WHAT THE SENDER WANTS
${context.targetRole ? `To be considered for: ${context.targetRole}` : "To build a genuine connection in this field."}

ANYTHING ELSE KNOWN ABOUT THE RECIPIENT
${context.extraContext?.trim() || "(nothing extra provided)"}

THE SENDER — use only these facts about them
Name: ${candidate.name ?? "(not given)"}
Headline: ${candidate.headline ?? "(not given)"}
Skills: ${candidate.topSkills.join(", ") || "(none listed)"}
Things they have actually done:
${candidate.evidence.map((item) => `- ${item}`).join("\n") || "- (nothing on file)"}

RULES
1. Never open with any of these, or anything like them:
${BANNED_OPENERS.map((phrase) => `   "${phrase}"`).join("\n")}
2. Do not claim any achievement, skill or number that is not in the sender's
   facts above. If you have little to work with, write something short and
   honest rather than padding it.
3. Sound like one person writing to another. No corporate register, no
   "synergies", no "I'd love to pick your brain".
4. Be specific to THIS recipient. Anything that could be pasted to a hundred
   people has failed.
5. List what you used to personalise it in personalizationUsed. If you had
   nothing specific to work with, return an empty list — do not invent a
   detail about them.
6. Set characterCount to the exact character count of the message.`;
}

export async function generateMessage(
  context: MessageContext,
): Promise<GeneratedMessage> {
  const result = await generateStructured({
    tier: "deep",
    systemInstruction:
      "You write short, specific, human outreach messages for one job seeker. " +
      "You would rather send four honest sentences than twelve polished empty " +
      "ones. Answer only with JSON matching the schema.",
    prompt: buildPrompt(context),
    schema: generatedMessageSchema,
    responseSchema: zodToGemini(generatedMessageSchema),
    // Higher than the analyzer: this is writing, and identical phrasing every
    // time would be its own kind of failure.
    temperature: 0.75,
  });

  // Trust the text, not the model's arithmetic.
  return { ...result, characterCount: result.message.length };
}

/** Did the model slip into a banned opener anyway? Checked, not just asked. */
export function findBannedPhrases(message: string): string[] {
  const lower = message.toLowerCase();
  return BANNED_OPENERS.filter((phrase) => lower.includes(phrase.toLowerCase()));
}
