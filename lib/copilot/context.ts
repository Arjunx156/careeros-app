import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { aggregateBy, type PerformanceRow } from "@/lib/analytics/performance";

/**
 * Builds the copilot's view of the user's actual job search.
 *
 * The PRD's requirement is that answers reference real data rather than
 * generic advice, so the model is handed pre-computed facts — counts, rates,
 * recurring gaps — instead of raw rows it would have to tally itself. Models
 * are unreliable at arithmetic over long lists and reliable at reasoning over
 * a summary, so the counting happens here.
 */

export async function buildCopilotContext(): Promise<string> {
  const userId = await getOwnerId();

  const [applications, resumes, analyses, contacts] = await Promise.all([
    prisma.application.findMany({
      where: { userId },
      select: {
        company: true,
        role: true,
        status: true,
        country: true,
        applicationMethod: true,
        matchScore: true,
        rejectionReason: true,
        resumeVersion: { select: { name: true } },
        jobDescription: { select: { roleCategory: true } },
      },
    }),
    prisma.resumeVersion.findMany({
      where: { userId },
      select: { name: true, targetRole: true, skills: true, isMaster: true },
    }),
    prisma.analysis.findMany({
      where: { userId, status: "complete" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        overallScore: true,
        atsScore: true,
        keywordsMissing: true,
        recruiterVerdict: true,
        jobDescription: { select: { company: true, role: true } },
      },
    }),
    prisma.contact.findMany({
      where: { userId },
      select: { relationshipStatus: true, referralStatus: true },
    }),
  ]);

  const rows: PerformanceRow[] = applications.map((application) => ({
    status: application.status,
    resumeName: application.resumeVersion?.name ?? null,
    roleCategory: application.jobDescription?.roleCategory ?? null,
    country: application.country,
    method: application.applicationMethod,
  }));

  const byResume = aggregateBy(rows, (row) => row.resumeName, "No resume linked");
  const byMethod = aggregateBy(rows, (row) => row.method, "Not recorded");
  const byRole = aggregateBy(rows, (row) => row.roleCategory, "Uncategorized");

  // Which gaps keep recurring? A skill missing once is noise; missing across
  // half the analyses is the thing worth learning.
  const missingCounts = new Map<string, number>();
  for (const analysis of analyses) {
    for (const keyword of analysis.keywordsMissing) {
      missingCounts.set(keyword, (missingCounts.get(keyword) ?? 0) + 1);
    }
  }
  const recurringGaps = [...missingCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const statusCounts = new Map<string, number>();
  for (const application of applications) {
    statusCounts.set(
      application.status,
      (statusCounts.get(application.status) ?? 0) + 1,
    );
  }

  const rejections = applications
    .filter((application) => application.rejectionReason)
    .map((a) => `${a.company}: ${a.rejectionReason}`)
    .slice(0, 8);

  const section = (title: string, body: string) => `## ${title}\n${body}`;

  return [
    section(
      "Applications",
      applications.length === 0
        ? "None tracked yet."
        : [
            `Total: ${applications.length}`,
            `By status: ${[...statusCounts.entries()].map(([s, c]) => `${s.replace(/_/g, " ")} ${c}`).join(", ")}`,
          ].join("\n"),
    ),
    section(
      "Resume performance (interview rate)",
      byResume.length === 0
        ? "No data."
        : byResume
            .map(
              (stat) =>
                `- ${stat.label}: ${stat.interviews}/${stat.applications} interviews${
                  stat.interviewRate === null
                    ? " (too few to rate)"
                    : ` = ${stat.interviewRate}%`
                }`,
            )
            .join("\n"),
    ),
    section(
      "Application method performance",
      byMethod.length === 0
        ? "No data."
        : byMethod
            .map(
              (stat) =>
                `- ${stat.label}: ${stat.interviews}/${stat.applications}${
                  stat.interviewRate === null ? " (too few to rate)" : ` = ${stat.interviewRate}%`
                }`,
            )
            .join("\n"),
    ),
    section(
      "Role type performance",
      byRole.length === 0
        ? "No data."
        : byRole
            .map(
              (stat) =>
                `- ${stat.label}: ${stat.interviews}/${stat.applications}${
                  stat.interviewRate === null ? " (too few to rate)" : ` = ${stat.interviewRate}%`
                }`,
            )
            .join("\n"),
    ),
    section(
      "Resumes on file",
      resumes.length === 0
        ? "None."
        : resumes
            .map(
              (resume) =>
                `- ${resume.name}${resume.isMaster ? " (master)" : ""} — target: ${
                  resume.targetRole ?? "unset"
                }; skills: ${resume.skills.slice(0, 12).join(", ") || "none listed"}`,
            )
            .join("\n"),
    ),
    section(
      "Recent analyses",
      analyses.length === 0
        ? "None run yet."
        : analyses
            .map(
              (analysis) =>
                `- ${analysis.jobDescription.company} ${analysis.jobDescription.role}: match ${
                  analysis.overallScore ?? "?"
                }, ATS ${analysis.atsScore ?? "?"}, recruiter verdict ${
                  analysis.recruiterVerdict ?? "?"
                }`,
            )
            .join("\n"),
    ),
    section(
      "Gaps that keep recurring",
      recurringGaps.length === 0
        ? "None appearing more than once."
        : recurringGaps
            .map(([keyword, count]) => `- ${keyword} — missing in ${count} analyses`)
            .join("\n"),
    ),
    section(
      "Networking",
      contacts.length === 0
        ? "No contacts yet."
        : `${contacts.length} contacts; ${
            contacts.filter((c) => c.referralStatus === "received").length
          } referrals received.`,
    ),
    section(
      "Rejection reasons recorded",
      rejections.length === 0 ? "None recorded." : rejections.map((r) => `- ${r}`).join("\n"),
    ),
  ].join("\n\n");
}

export const COPILOT_SYSTEM = `You are the user's career analyst. You have their real job search data below.

Rules:
1. Answer from the data. Cite the actual numbers — "your referral rate is 40% versus 8% direct", not "referrals tend to work well".
2. If the data cannot answer the question, say so plainly and say what to track to answer it later. Never fill a gap with generic advice dressed up as analysis.
3. Where a segment is marked "too few to rate", treat it as unknown, not as zero.
4. Never invent an application, company, score, or skill that is not below.
5. Be direct and brief. Lead with the answer, then the evidence. No preamble.`;

export const SUGGESTED_PROMPTS = [
  "Which resume is actually getting me interviews?",
  "What skills keep coming up that I don't have?",
  "Which application method works best for me?",
  "Why am I not getting past the screen?",
  "What should I focus on this week?",
];
