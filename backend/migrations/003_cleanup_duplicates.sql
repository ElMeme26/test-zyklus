-- Migration: Clean duplicate data and ensure schema consistency
-- Run this in Supabase SQL Editor to fix duplicates and align with code

-- Step 1: Identify and remove duplicate assets based on unique tag (keep the oldest by created_at)
-- First, create a temporary table with duplicates
CREATE TEMP TABLE duplicate_assets AS
SELECT tag, MIN(created_at) AS keep_created_at
FROM assets
WHERE tag IS NOT NULL AND tag != ''
GROUP BY tag
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping the one with the earliest created_at
DELETE FROM assets
WHERE id NOT IN (
    SELECT a.id
    FROM assets a
    INNER JOIN duplicate_assets da ON a.tag = da.tag AND a.created_at = da.keep_created_at
)
AND tag IN (SELECT tag FROM duplicate_assets);

-- Step 2: Identify and remove duplicate users based on unique email (keep the oldest by created_at)
CREATE TEMP TABLE duplicate_users AS
SELECT email, MIN(created_at) AS keep_created_at
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

DELETE FROM users
WHERE id NOT IN (
    SELECT u.id
    FROM users u
    INNER JOIN duplicate_users du ON u.email = du.email AND u.created_at = du.keep_created_at
)
AND email IN (SELECT email FROM duplicate_users);

-- Step 3: Identify and remove duplicate requests based on asset_id + user_id + status (keep the latest by created_at)
-- This assumes duplicates are requests for the same asset by the same user with same status
CREATE TEMP TABLE duplicate_requests AS
SELECT asset_id, user_id, status, MAX(created_at) AS keep_created_at
FROM requests
WHERE asset_id IS NOT NULL AND user_id IS NOT NULL
GROUP BY asset_id, user_id, status
HAVING COUNT(*) > 1;

DELETE FROM requests
WHERE id NOT IN (
    SELECT r.id
    FROM requests r
    INNER JOIN duplicate_requests dr ON r.asset_id = dr.asset_id
                                      AND r.user_id = dr.user_id
                                      AND r.status = dr.status
                                      AND r.created_at = dr.keep_created_at
)
AND (asset_id, user_id, status) IN (SELECT asset_id, user_id, status FROM duplicate_requests);

-- Step 4: Ensure maintenance_usage_threshold has consistent default (set to 100 if not set)
UPDATE assets
SET maintenance_usage_threshold = 100
WHERE maintenance_usage_threshold IS NULL OR maintenance_usage_threshold = 0;

-- Step 5: Add unique constraints where needed to prevent future duplicates
-- Add unique constraint on assets.tag (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'assets_tag_unique'
                   AND table_name = 'assets') THEN
        ALTER TABLE assets ADD CONSTRAINT assets_tag_unique UNIQUE (tag);
    END IF;
END $$;

-- Add unique constraint on users.email (already has UNIQUE, but ensure)
-- It's already UNIQUE, so no need

-- Step 6: Clean up any orphaned records (e.g., requests without valid assets)
DELETE FROM requests
WHERE asset_id IS NOT NULL AND asset_id NOT IN (SELECT id FROM assets);

DELETE FROM audit_logs
WHERE target_id IS NOT NULL AND target_type = 'ASSET' AND target_id NOT IN (SELECT id::text FROM assets);

-- Step 7: Update any inconsistent status values if needed
-- Ensure all status values are valid per CHECK constraints
UPDATE requests
SET status = 'PENDING'
WHERE status NOT IN ('PENDING', 'ACTION_REQUIRED', 'APPROVED', 'ACTIVE', 'ACTIVE_INTERNAL', 'OVERDUE', 'RETURNED', 'MAINTENANCE', 'REJECTED', 'CANCELLED');

-- Step 8: Reindex for performance (optional, but recommended after cleanup)
REINDEX TABLE assets;
REINDEX TABLE users;
REINDEX TABLE requests;
REINDEX TABLE audit_logs;

-- Log the cleanup in audit_logs
INSERT INTO audit_logs (action, actor_name, target_type, details, metadata)
VALUES ('MAINTENANCE', 'SYSTEM', 'SYSTEM', 'Database cleanup: removed duplicates and ensured consistency', '{"cleanup_type": "duplicate_removal", "timestamp": "' || now() || '"}');