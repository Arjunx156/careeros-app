-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_versions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetRole" TEXT,
    "targetIndustry" TEXT,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "extractedText" TEXT,
    "skills" TEXT[],
    "experienceYears" INTEGER,
    "educationLevel" TEXT,
    "summaryText" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "workType" TEXT,
    "jobUrl" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT DEFAULT 'EUR',
    "jdText" TEXT NOT NULL,
    "industry" TEXT,
    "roleCategory" TEXT,
    "deadline" TIMESTAMP(3),
    "dateFound" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredSkills" TEXT[],
    "preferredSkills" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "jobDescriptionId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "experienceScore" INTEGER NOT NULL DEFAULT 0,
    "skillsScore" INTEGER NOT NULL DEFAULT 0,
    "keywordAtsScore" INTEGER NOT NULL DEFAULT 0,
    "responsibilityScore" INTEGER NOT NULL DEFAULT 0,
    "industryScore" INTEGER NOT NULL DEFAULT 0,
    "seniorityScore" INTEGER NOT NULL DEFAULT 0,
    "educationScore" INTEGER NOT NULL DEFAULT 0,
    "quantificationScore" INTEGER NOT NULL DEFAULT 0,
    "recruiterReadability" INTEGER NOT NULL DEFAULT 0,
    "overallRecruiterAppeal" INTEGER NOT NULL DEFAULT 0,
    "mustHaveRequirements" JSONB,
    "niceToHaveRequirements" JSONB,
    "responsibilities" JSONB,
    "softSkills" JSONB,
    "educationRequirements" JSONB,
    "experienceRequirements" JSONB,
    "gaps" JSONB,
    "bulletAnalysis" JSONB,
    "keywordsPresent" TEXT[],
    "keywordsMissing" TEXT[],
    "keywordsOverused" TEXT[],
    "atsScore" INTEGER NOT NULL DEFAULT 0,
    "atsIssues" JSONB,
    "recruiterVerdict" TEXT,
    "recruiterVerdictReason" TEXT,
    "recruiterAnswers" JSONB,
    "actionPlan" JSONB,
    "currentSummary" TEXT,
    "recommendedSummary" TEXT,
    "summaryWhyBetter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobDescriptionId" TEXT,
    "resumeVersionId" TEXT,
    "analysisId" TEXT,
    "contactId" TEXT,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "workType" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT DEFAULT 'EUR',
    "jobUrl" TEXT,
    "jdSnapshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "applicationDate" TIMESTAMP(3),
    "applicationMethod" TEXT,
    "coverLetterUsed" BOOLEAN NOT NULL DEFAULT false,
    "referralPerson" TEXT,
    "recruiterName" TEXT,
    "recruiterLinkedin" TEXT,
    "recruiterEmail" TEXT,
    "hiringManagerName" TEXT,
    "hiringManagerLinkedin" TEXT,
    "matchScore" INTEGER,
    "nextFollowupDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "durationMins" INTEGER,
    "format" TEXT,
    "interviewers" TEXT[],
    "notes" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "position" TEXT,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "location" TEXT,
    "relationshipStatus" TEXT NOT NULL DEFAULT 'not_contacted',
    "howMet" TEXT,
    "targetCompany" TEXT,
    "targetRole" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowupDate" TIMESTAMP(3),
    "referralStatus" TEXT DEFAULT 'none',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "applicationId" TEXT,
    "type" TEXT NOT NULL,
    "platform" TEXT,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "contextUsed" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "applicationId" TEXT,
    "contactId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimized_resumes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "docxUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimized_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "resume_versions_userId_idx" ON "resume_versions"("userId");

-- CreateIndex
CREATE INDEX "resume_versions_isMaster_idx" ON "resume_versions"("isMaster");

-- CreateIndex
CREATE INDEX "job_descriptions_userId_idx" ON "job_descriptions"("userId");

-- CreateIndex
CREATE INDEX "job_descriptions_company_idx" ON "job_descriptions"("company");

-- CreateIndex
CREATE INDEX "analyses_userId_idx" ON "analyses"("userId");

-- CreateIndex
CREATE INDEX "analyses_resumeVersionId_idx" ON "analyses"("resumeVersionId");

-- CreateIndex
CREATE INDEX "analyses_jobDescriptionId_idx" ON "analyses"("jobDescriptionId");

-- CreateIndex
CREATE INDEX "applications_userId_idx" ON "applications"("userId");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_nextFollowupDate_idx" ON "applications"("nextFollowupDate");

-- CreateIndex
CREATE INDEX "interviews_applicationId_idx" ON "interviews"("applicationId");

-- CreateIndex
CREATE INDEX "timeline_events_applicationId_idx" ON "timeline_events"("applicationId");

-- CreateIndex
CREATE INDEX "contacts_userId_idx" ON "contacts"("userId");

-- CreateIndex
CREATE INDEX "contacts_relationshipStatus_idx" ON "contacts"("relationshipStatus");

-- CreateIndex
CREATE INDEX "contacts_nextFollowupDate_idx" ON "contacts"("nextFollowupDate");

-- CreateIndex
CREATE INDEX "messages_userId_idx" ON "messages"("userId");

-- CreateIndex
CREATE INDEX "messages_contactId_idx" ON "messages"("contactId");

-- CreateIndex
CREATE INDEX "follow_ups_userId_idx" ON "follow_ups"("userId");

-- CreateIndex
CREATE INDEX "follow_ups_status_idx" ON "follow_ups"("status");

-- CreateIndex
CREATE INDEX "follow_ups_dueDate_idx" ON "follow_ups"("dueDate");

-- CreateIndex
CREATE INDEX "optimized_resumes_userId_idx" ON "optimized_resumes"("userId");

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimized_resumes" ADD CONSTRAINT "optimized_resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimized_resumes" ADD CONSTRAINT "optimized_resumes_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimized_resumes" ADD CONSTRAINT "optimized_resumes_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
