-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('remote', 'hybrid', 'onsite');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('wishlist', 'preparing', 'applied', 'recruiter_screen', 'interview', 'final_round', 'offer', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "ApplicationMethod" AS ENUM ('direct', 'linkedin', 'referral', 'recruiter', 'job_board', 'other');

-- CreateEnum
CREATE TYPE "ApplicationOutcome" AS ENUM ('hired', 'rejected', 'withdrew', 'ghosted');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'processing', 'complete', 'failed');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('strong', 'partial', 'missing');

-- CreateEnum
CREATE TYPE "RecruiterVerdict" AS ENUM ('strong', 'potential', 'weak');

-- CreateEnum
CREATE TYPE "InterviewStage" AS ENUM ('phone_screen', 'technical', 'case_study', 'panel', 'final', 'offer');

-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('passed', 'failed', 'pending', 'cancelled');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('status_change', 'note_added', 'interview_scheduled', 'message_sent', 'follow_up_done', 'created', 'analysis_linked');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('not_contacted', 'connection_requested', 'connected', 'message_sent', 'replied', 'referral_requested', 'referral_received', 'interview_referral', 'follow_up_required');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('none', 'requested', 'received');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('connection_request', 'after_connection', 'recruiter', 'hiring_manager', 'follow_up', 'other');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('draft', 'sent', 'replied', 'no_response');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('application', 'contact');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('pending', 'done', 'snoozed', 'rescheduled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_versions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_role" TEXT,
    "target_industry" TEXT,
    "is_master" BOOLEAN NOT NULL DEFAULT false,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "file_url" TEXT NOT NULL,
    "file_pathname" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "extracted_text" TEXT,
    "skills" TEXT[],
    "experience_years" INTEGER,
    "education_level" TEXT,
    "summary_current" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "work_type" "WorkType",
    "job_url" TEXT,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT DEFAULT 'EUR',
    "jd_text" TEXT NOT NULL,
    "industry" TEXT,
    "role_category" TEXT,
    "deadline" TIMESTAMP(3),
    "date_found" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "required_skills" TEXT[],
    "preferred_skills" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resume_version_id" TEXT NOT NULL,
    "job_description_id" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "stage" INTEGER NOT NULL DEFAULT 0,
    "stage_error" TEXT,
    "overall_score" INTEGER,
    "experience_score" INTEGER,
    "skills_score" INTEGER,
    "keyword_ats_score" INTEGER,
    "responsibility_score" INTEGER,
    "industry_score" INTEGER,
    "seniority_score" INTEGER,
    "education_score" INTEGER,
    "quantification_score" INTEGER,
    "recruiter_readability" INTEGER,
    "overall_recruiter_appeal" INTEGER,
    "must_have_requirements" JSONB,
    "nice_to_have_requirements" JSONB,
    "responsibilities" JSONB,
    "soft_skills" JSONB,
    "education_requirements" JSONB,
    "experience_requirements" JSONB,
    "gaps" JSONB,
    "bullet_analysis" JSONB,
    "keywords_present" TEXT[],
    "keywords_missing" TEXT[],
    "keywords_overused" TEXT[],
    "ats_score" INTEGER,
    "ats_issues" JSONB,
    "recruiter_verdict" "RecruiterVerdict",
    "recruiter_verdict_reason" TEXT,
    "recruiter_answers" JSONB,
    "action_plan" JSONB,
    "current_summary" TEXT,
    "recommended_summary" TEXT,
    "summary_why_better" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_description_id" TEXT,
    "resume_version_id" TEXT,
    "analysis_id" TEXT,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "work_type" "WorkType",
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT DEFAULT 'EUR',
    "job_url" TEXT,
    "jd_snapshot" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'applied',
    "application_date" TIMESTAMP(3),
    "application_method" "ApplicationMethod",
    "cover_letter_used" BOOLEAN NOT NULL DEFAULT false,
    "referral_person" TEXT,
    "recruiter_name" TEXT,
    "recruiter_linkedin" TEXT,
    "recruiter_email" TEXT,
    "hiring_manager_name" TEXT,
    "hiring_manager_linkedin" TEXT,
    "contact_id" TEXT,
    "match_score" INTEGER,
    "next_followup_date" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "outcome" "ApplicationOutcome",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "stage" "InterviewStage" NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "duration_mins" INTEGER,
    "format" TEXT,
    "interviewers" TEXT[],
    "notes" TEXT,
    "outcome" "InterviewOutcome" DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "event_type" "TimelineEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "position" TEXT,
    "linkedin_url" TEXT,
    "email" TEXT,
    "location" TEXT,
    "relationship_status" "RelationshipStatus" NOT NULL DEFAULT 'not_contacted',
    "how_met" TEXT,
    "target_company" TEXT,
    "target_role" TEXT,
    "last_contacted_at" TIMESTAMP(3),
    "next_followup_date" TIMESTAMP(3),
    "referral_status" "ReferralStatus" DEFAULT 'none',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "application_id" TEXT,
    "type" "MessageType" NOT NULL,
    "platform" TEXT,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "MessageStatus" NOT NULL DEFAULT 'draft',
    "ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "context_used" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "application_id" TEXT,
    "contact_id" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "completed_at" TIMESTAMP(3),
    "snoozed_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimized_resumes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "resume_version_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "pdf_url" TEXT,
    "pdf_pathname" TEXT,
    "docx_url" TEXT,
    "docx_pathname" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimized_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "resume_versions_user_id_idx" ON "resume_versions"("user_id");

-- CreateIndex
CREATE INDEX "resume_versions_user_id_is_master_idx" ON "resume_versions"("user_id", "is_master");

-- CreateIndex
CREATE INDEX "resume_versions_user_id_created_at_idx" ON "resume_versions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "job_descriptions_user_id_idx" ON "job_descriptions"("user_id");

-- CreateIndex
CREATE INDEX "job_descriptions_user_id_company_idx" ON "job_descriptions"("user_id", "company");

-- CreateIndex
CREATE INDEX "job_descriptions_user_id_date_found_idx" ON "job_descriptions"("user_id", "date_found");

-- CreateIndex
CREATE INDEX "analyses_user_id_idx" ON "analyses"("user_id");

-- CreateIndex
CREATE INDEX "analyses_user_id_created_at_idx" ON "analyses"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "analyses_resume_version_id_idx" ON "analyses"("resume_version_id");

-- CreateIndex
CREATE INDEX "analyses_job_description_id_idx" ON "analyses"("job_description_id");

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE INDEX "applications_user_id_status_idx" ON "applications"("user_id", "status");

-- CreateIndex
CREATE INDEX "applications_user_id_company_idx" ON "applications"("user_id", "company");

-- CreateIndex
CREATE INDEX "applications_user_id_application_date_idx" ON "applications"("user_id", "application_date");

-- CreateIndex
CREATE INDEX "applications_user_id_next_followup_date_idx" ON "applications"("user_id", "next_followup_date");

-- CreateIndex
CREATE INDEX "interviews_user_id_idx" ON "interviews"("user_id");

-- CreateIndex
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "timeline_events_application_id_created_at_idx" ON "timeline_events"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "contacts_user_id_idx" ON "contacts"("user_id");

-- CreateIndex
CREATE INDEX "contacts_user_id_relationship_status_idx" ON "contacts"("user_id", "relationship_status");

-- CreateIndex
CREATE INDEX "contacts_user_id_next_followup_date_idx" ON "contacts"("user_id", "next_followup_date");

-- CreateIndex
CREATE INDEX "messages_user_id_idx" ON "messages"("user_id");

-- CreateIndex
CREATE INDEX "messages_contact_id_idx" ON "messages"("contact_id");

-- CreateIndex
CREATE INDEX "messages_application_id_idx" ON "messages"("application_id");

-- CreateIndex
CREATE INDEX "follow_ups_user_id_idx" ON "follow_ups"("user_id");

-- CreateIndex
CREATE INDEX "follow_ups_user_id_status_due_date_idx" ON "follow_ups"("user_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "optimized_resumes_user_id_idx" ON "optimized_resumes"("user_id");

-- CreateIndex
CREATE INDEX "optimized_resumes_analysis_id_idx" ON "optimized_resumes"("analysis_id");

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_resume_version_id_fkey" FOREIGN KEY ("resume_version_id") REFERENCES "resume_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_version_id_fkey" FOREIGN KEY ("resume_version_id") REFERENCES "resume_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimized_resumes" ADD CONSTRAINT "optimized_resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimized_resumes" ADD CONSTRAINT "optimized_resumes_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimized_resumes" ADD CONSTRAINT "optimized_resumes_resume_version_id_fkey" FOREIGN KEY ("resume_version_id") REFERENCES "resume_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
