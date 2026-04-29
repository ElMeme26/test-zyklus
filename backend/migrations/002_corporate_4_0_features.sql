-- Migration: Add internal loan workflows and security
-- Run this in Supabase SQL Editor after the existing migrations

-- Add is_internal column to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Update the CHECK constraint for status to include 'ACTIVE_INTERNAL'
-- First, drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE constraint_name = 'requests_status_check'
               AND table_name = 'requests') THEN
        ALTER TABLE requests DROP CONSTRAINT requests_status_check;
    END IF;
END $$;

-- Add the new CHECK constraint with 'ACTIVE_INTERNAL'
ALTER TABLE requests ADD CONSTRAINT requests_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'ACTIVE', 'ACTIVE_INTERNAL', 'REJECTED', 'OVERDUE', 'CANCELLED', 'FEEDBACK_REQUIRED'));

-- Add maintenance_usage_threshold column to assets table for preventive maintenance
ALTER TABLE assets ADD COLUMN IF NOT EXISTS maintenance_usage_threshold INTEGER DEFAULT 100;