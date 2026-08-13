/**
 * Seed data for CareerOS.
 *
 * Run standalone (`npm run db:seed`), so it loads env and builds its own client
 * rather than importing the app's singleton.
 */
import { config } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

config({ path: ".env.local" });

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — cannot seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

/** Days from now, as a Date. Negative = past. */
function daysOut(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding CareerOS…");

  // Wipe in FK-safe order so the seed is repeatable.
  await prisma.timelineEvent.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.message.deleteMany();
  await prisma.optimizedResume.deleteMany();
  await prisma.application.deleteMany();
  await prisma.analysis.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.jobDescription.deleteMany();
  await prisma.resumeVersion.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { email: "owner@careeros.local", name: "You" },
  });

  // ─── RESUMES ───────────────────────────────────────────────────────────────
  const [masterResume, baResume, dataResume] = await Promise.all([
    prisma.resumeVersion.create({
      data: {
        userId: user.id,
        name: "Master Resume",
        targetRole: "Business Analyst",
        targetIndustry: "Technology",
        isMaster: true,
        versionNumber: 1,
        fileUrl: "https://example.invalid/seed/master.pdf",
        filePathname: "seed/master.pdf",
        fileSizeBytes: 184_320,
        extractedText:
          "Experienced business analyst with an MSc in Business Analytics. " +
          "Led requirements gathering across 3 product teams. Built Power BI " +
          "dashboards tracking 12 KPIs. Reduced monthly reporting time by 40%.",
        skills: ["SQL", "Power BI", "Requirements Gathering", "Stakeholder Management", "Excel"],
        experienceYears: 2,
        educationLevel: "Masters",
        summaryCurrent:
          "Business analyst with 2 years of experience in requirements and reporting.",
      },
    }),
    prisma.resumeVersion.create({
      data: {
        userId: user.id,
        name: "Business Analyst v3",
        targetRole: "Business Analyst",
        targetIndustry: "Fintech",
        versionNumber: 3,
        fileUrl: "https://example.invalid/seed/ba-v3.pdf",
        filePathname: "seed/ba-v3.pdf",
        fileSizeBytes: 176_128,
        extractedText:
          "Business analyst focused on fintech. Mapped 8 payment flows and " +
          "documented 40+ user stories. Partnered with engineering on a " +
          "reconciliation tool used by the finance team daily.",
        skills: ["SQL", "Jira", "Process Mapping", "User Stories", "Agile"],
        experienceYears: 2,
        educationLevel: "Masters",
      },
    }),
    prisma.resumeVersion.create({
      data: {
        userId: user.id,
        name: "Data Analyst v2",
        targetRole: "Data Analyst",
        targetIndustry: "E-commerce",
        versionNumber: 2,
        fileUrl: "https://example.invalid/seed/data-v2.pdf",
        filePathname: "seed/data-v2.pdf",
        fileSizeBytes: 168_960,
        extractedText:
          "Data analyst with strong SQL and Python. Built cohort retention " +
          "analysis covering 50k users. Automated a weekly reporting pipeline.",
        skills: ["SQL", "Python", "pandas", "Tableau", "A/B Testing"],
        experienceYears: 2,
        educationLevel: "Masters",
      },
    }),
  ]);

  // ─── JOB DESCRIPTIONS ──────────────────────────────────────────────────────
  const jobSeeds = [
    {
      company: "Stripe",
      role: "Business Analyst",
      location: "Dublin",
      country: "Ireland",
      workType: "hybrid" as const,
      industry: "Fintech",
      roleCategory: "Business Analyst",
      salaryMin: 55_000,
      salaryMax: 70_000,
      requiredSkills: ["SQL", "Requirements Gathering", "Stakeholder Management"],
      preferredSkills: ["Python", "Payments domain"],
      jdText:
        "We are looking for a Business Analyst to partner with product and " +
        "engineering teams. You will gather requirements, document user " +
        "stories, and build reporting that drives decisions. Requires strong " +
        "SQL, 2+ years in an analytical role, and excellent stakeholder " +
        "communication. Experience in payments is a plus.",
    },
    {
      company: "Booking.com",
      role: "Product Analyst",
      location: "Amsterdam",
      country: "Netherlands",
      workType: "hybrid" as const,
      industry: "Travel",
      roleCategory: "Product Analyst",
      salaryMin: 60_000,
      salaryMax: 75_000,
      requiredSkills: ["SQL", "A/B Testing", "Data Visualization"],
      preferredSkills: ["Python", "Experimentation platforms"],
      jdText:
        "Join our Product Analytics team to design and analyse experiments " +
        "that shape the traveller experience. You will own A/B test design, " +
        "build dashboards, and present findings to product leadership. " +
        "Requires advanced SQL and hands-on experimentation experience.",
    },
    {
      company: "Revolut",
      role: "Business Analyst — Payments",
      location: "London",
      country: "United Kingdom",
      workType: "onsite" as const,
      industry: "Fintech",
      roleCategory: "Business Analyst",
      salaryMin: 50_000,
      salaryMax: 65_000,
      requiredSkills: ["SQL", "Process Mapping", "Agile"],
      preferredSkills: ["Reconciliation", "Jira"],
      jdText:
        "The Payments BA will map end-to-end payment flows, identify process " +
        "gaps, and translate business needs into technical requirements. " +
        "Strong SQL and process mapping required. Fast-paced environment.",
    },
    {
      company: "Spotify",
      role: "Data Analyst",
      location: "Stockholm",
      country: "Sweden",
      workType: "remote" as const,
      industry: "Media",
      roleCategory: "Data Analyst",
      salaryMin: 58_000,
      salaryMax: 72_000,
      requiredSkills: ["SQL", "Python", "Statistics"],
      preferredSkills: ["dbt", "Looker"],
      jdText:
        "As a Data Analyst you will turn listener behaviour into insight. " +
        "You will write complex SQL, build models, and partner with product " +
        "managers. Requires Python, strong statistics, and clear storytelling.",
    },
    {
      company: "Klarna",
      role: "Junior Business Analyst",
      location: "Berlin",
      country: "Germany",
      workType: "hybrid" as const,
      industry: "Fintech",
      roleCategory: "Business Analyst",
      salaryMin: 45_000,
      salaryMax: 58_000,
      requiredSkills: ["SQL", "Excel", "Communication"],
      preferredSkills: ["Power BI", "German"],
      jdText:
        "Entry-level BA role supporting the merchant operations team. You " +
        "will produce weekly reporting, investigate data quality issues, and " +
        "support process improvement projects. SQL and Excel required.",
    },
  ];

  const jobs = [];
  for (const j of jobSeeds) {
    jobs.push(
      await prisma.jobDescription.create({
        data: { ...j, userId: user.id, salaryCurrency: "EUR" },
      }),
    );
  }

  // ─── ANALYSES ──────────────────────────────────────────────────────────────
  const analysisSeeds = [
    { job: jobs[0], resume: baResume, overall: 78, ats: 84 },
    { job: jobs[1], resume: dataResume, overall: 71, ats: 79 },
    { job: jobs[2], resume: baResume, overall: 64, ats: 72 },
  ];

  const analyses = [];
  for (const a of analysisSeeds) {
    analyses.push(
      await prisma.analysis.create({
        data: {
          userId: user.id,
          resumeVersionId: a.resume.id,
          jobDescriptionId: a.job.id,
          status: "complete",
          stage: 9,
          overallScore: a.overall,
          experienceScore: a.overall - 4,
          skillsScore: a.overall + 6,
          keywordAtsScore: a.ats,
          responsibilityScore: a.overall - 2,
          industryScore: a.overall + 3,
          seniorityScore: a.overall - 8,
          educationScore: 92,
          quantificationScore: a.overall - 12,
          recruiterReadability: a.overall + 5,
          overallRecruiterAppeal: a.overall,
          atsScore: a.ats,
          mustHaveRequirements: [
            { requirement: "Strong SQL", status: "strong" },
            { requirement: "2+ years analytical experience", status: "strong" },
            { requirement: "Stakeholder communication", status: "partial" },
          ],
          niceToHaveRequirements: [
            { requirement: "Python", status: "partial" },
            { requirement: "Payments domain knowledge", status: "missing" },
          ],
          keywordsPresent: ["SQL", "requirements", "stakeholder", "dashboard"],
          keywordsMissing: ["payments", "reconciliation", "experimentation"],
          keywordsOverused: ["responsible for"],
          recruiterVerdict: a.overall >= 75 ? "strong" : "potential",
          recruiterVerdictReason:
            "Relevant title and degree are visible immediately; domain " +
            "keywords for this specific role are not.",
          currentSummary:
            "Business analyst with 2 years of experience in requirements and reporting.",
          recommendedSummary:
            "Business analyst (MSc Business Analytics) with 2 years turning " +
            "stakeholder requirements into SQL-backed reporting used by " +
            "product and finance teams.",
          summaryWhyBetter:
            "Names the degree, the tooling, and who consumed the output — all " +
            "three are things a recruiter scans for in the first 10 seconds.",
        },
      }),
    );
  }

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  const applicationSeeds = [
    { company: "Stripe", role: "Business Analyst", status: "interview" as const, method: "referral" as const, days: -21, job: jobs[0], resume: baResume, analysis: analyses[0], score: 78, country: "Ireland", location: "Dublin" },
    { company: "Booking.com", role: "Product Analyst", status: "recruiter_screen" as const, method: "linkedin" as const, days: -14, job: jobs[1], resume: dataResume, analysis: analyses[1], score: 71, country: "Netherlands", location: "Amsterdam" },
    { company: "Revolut", role: "Business Analyst — Payments", status: "rejected" as const, method: "direct" as const, days: -35, job: jobs[2], resume: baResume, analysis: analyses[2], score: 64, country: "United Kingdom", location: "London" },
    { company: "Spotify", role: "Data Analyst", status: "applied" as const, method: "job_board" as const, days: -7, job: jobs[3], resume: dataResume, analysis: null, score: null, country: "Sweden", location: "Stockholm" },
    { company: "Klarna", role: "Junior Business Analyst", status: "applied" as const, method: "linkedin" as const, days: -5, job: jobs[4], resume: masterResume, analysis: null, score: null, country: "Germany", location: "Berlin" },
    { company: "Adyen", role: "Business Analyst", status: "final_round" as const, method: "referral" as const, days: -28, job: null, resume: baResume, analysis: null, score: null, country: "Netherlands", location: "Amsterdam" },
    { company: "Zalando", role: "Data Analyst", status: "rejected" as const, method: "direct" as const, days: -42, job: null, resume: dataResume, analysis: null, score: null, country: "Germany", location: "Berlin" },
    { company: "N26", role: "Business Analyst", status: "offer" as const, method: "referral" as const, days: -30, job: null, resume: baResume, analysis: null, score: null, country: "Germany", location: "Berlin" },
    { company: "Wise", role: "Product Analyst", status: "preparing" as const, method: "linkedin" as const, days: 0, job: null, resume: masterResume, analysis: null, score: null, country: "United Kingdom", location: "London" },
    { company: "Personio", role: "Business Analyst", status: "wishlist" as const, method: null, days: 0, job: null, resume: null, analysis: null, score: null, country: "Germany", location: "Munich" },
  ];

  const applications = [];
  for (const a of applicationSeeds) {
    const app = await prisma.application.create({
      data: {
        userId: user.id,
        company: a.company,
        role: a.role,
        location: a.location,
        country: a.country,
        workType: "hybrid",
        salaryCurrency: "EUR",
        status: a.status,
        applicationDate: a.status === "wishlist" ? null : daysOut(a.days),
        applicationMethod: a.method,
        jobDescriptionId: a.job?.id ?? null,
        resumeVersionId: a.resume?.id ?? null,
        analysisId: a.analysis?.id ?? null,
        matchScore: a.score,
        coverLetterUsed: a.method === "referral",
        outcome:
          a.status === "rejected" ? "rejected" : a.status === "offer" ? "hired" : null,
        rejectionReason:
          a.status === "rejected" ? "Position filled internally" : null,
      },
    });
    applications.push(app);

    await prisma.timelineEvent.create({
      data: {
        userId: user.id,
        applicationId: app.id,
        eventType: "created",
        description: `Application to ${a.company} created`,
      },
    });
  }

  // Interviews on the applications that reached that stage.
  await prisma.interview.createMany({
    data: [
      {
        userId: user.id,
        applicationId: applications[0].id,
        stage: "phone_screen",
        scheduledAt: daysOut(-10),
        durationMins: 30,
        format: "Video",
        interviewers: ["Sarah Chen"],
        outcome: "passed",
      },
      {
        userId: user.id,
        applicationId: applications[5].id,
        stage: "panel",
        scheduledAt: daysOut(3),
        durationMins: 60,
        format: "Video",
        interviewers: ["Mark de Vries", "Lena Fischer"],
        outcome: "pending",
      },
    ],
  });

  // ─── CONTACTS ──────────────────────────────────────────────────────────────
  const contactSeeds = [
    { name: "Sarah Chen", company: "Stripe", position: "Technical Recruiter", status: "replied" as const, howMet: "LinkedIn search", referral: "received" as const, days: -12 },
    { name: "Mark de Vries", company: "Adyen", position: "Engineering Manager", status: "connected" as const, howMet: "Referral from university alum", referral: "requested" as const, days: -6 },
    { name: "Priya Nair", company: "Booking.com", position: "Senior Product Analyst", status: "message_sent" as const, howMet: "Career fair", referral: "none" as const, days: -3 },
    { name: "Tom Bergmann", company: "Klarna", position: "Talent Partner", status: "connection_requested" as const, howMet: "LinkedIn search", referral: "none" as const, days: -1 },
    { name: "Aoife Byrne", company: "Stripe", position: "Business Analyst", status: "not_contacted" as const, howMet: "Alumni network", referral: "none" as const, days: null },
  ];

  const contacts = [];
  for (const c of contactSeeds) {
    contacts.push(
      await prisma.contact.create({
        data: {
          userId: user.id,
          name: c.name,
          company: c.company,
          position: c.position,
          linkedinUrl: `https://linkedin.com/in/${c.name.toLowerCase().replace(/\s+/g, "-")}`,
          relationshipStatus: c.status,
          howMet: c.howMet,
          referralStatus: c.referral,
          targetCompany: c.company,
          lastContactedAt: c.days === null ? null : daysOut(c.days),
        },
      }),
    );
  }

  // ─── FOLLOW-UPS ────────────────────────────────────────────────────────────
  await prisma.followUp.createMany({
    data: [
      // Overdue
      {
        userId: user.id,
        type: "application",
        applicationId: applications[1].id,
        dueDate: daysOut(-3),
        note: "Chase recruiter screen feedback",
      },
      // Due this week
      {
        userId: user.id,
        type: "application",
        applicationId: applications[3].id,
        dueDate: daysOut(2),
        note: "One week since applying — follow up",
      },
      {
        userId: user.id,
        type: "contact",
        contactId: contacts[2].id,
        dueDate: daysOut(4),
        note: "Priya hasn't replied — send a gentle nudge",
      },
      // Upcoming
      {
        userId: user.id,
        type: "contact",
        contactId: contacts[1].id,
        dueDate: daysOut(9),
        note: "Ask Mark about the referral outcome",
      },
      // Already done
      {
        userId: user.id,
        type: "application",
        applicationId: applications[0].id,
        dueDate: daysOut(-15),
        status: "done",
        completedAt: daysOut(-14),
        note: "Thanked Sarah after the phone screen",
      },
    ],
  });

  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  await prisma.message.createMany({
    data: [
      {
        userId: user.id,
        contactId: contacts[0].id,
        type: "recruiter",
        platform: "LinkedIn",
        content:
          "Hi Sarah — I saw Stripe is hiring a Business Analyst in Dublin. " +
          "I spent the last two years turning stakeholder requirements into " +
          "SQL reporting, most recently cutting a monthly reporting cycle " +
          "from five days to three. Would it be worth a short chat?",
        status: "replied",
        sentAt: daysOut(-13),
      },
      {
        userId: user.id,
        contactId: contacts[2].id,
        type: "connection_request",
        platform: "LinkedIn",
        content:
          "Hi Priya — we spoke briefly at the analytics career fair in March. " +
          "I'm looking at product analyst roles at Booking and would love to " +
          "hear how your team approaches experiment design.",
        status: "sent",
        sentAt: daysOut(-3),
      },
    ],
  });

  console.log(
    `Seeded: 1 user, 3 resumes, ${jobs.length} jobs, ${analyses.length} analyses, ` +
      `${applications.length} applications, ${contacts.length} contacts, 5 follow-ups, 2 messages.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
