-- Migration: add_ai_agents_and_approvals
-- Run this against the production database on the VPS

-- Add AI provider fields to Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "openaiApiKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "anthropicApiKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "googleAiApiKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "aiProvider" TEXT;

-- Create PostApproval table
CREATE TABLE IF NOT EXISTS "PostApproval" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PostApproval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostApproval_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PostApproval_postId_key" ON "PostApproval"("postId");
CREATE INDEX IF NOT EXISTS "PostApproval_status_idx" ON "PostApproval"("status");
CREATE INDEX IF NOT EXISTS "PostApproval_postId_idx" ON "PostApproval"("postId");

-- Create AgentConfig table
CREATE TABLE IF NOT EXISTS "AgentConfig" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentType" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "systemPrompt" TEXT,
  "settings" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgentConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentConfig_organizationId_agentType_key" ON "AgentConfig"("organizationId", "agentType");
CREATE INDEX IF NOT EXISTS "AgentConfig_organizationId_idx" ON "AgentConfig"("organizationId");
