-- ============================================
-- FIX: Comment Likes Foreign Key Constraint
-- ============================================
-- This migration removes the foreign key constraint that prevents
-- the Like table from working as a polymorphic relation.
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- ============================================

-- Drop the constraint that enforces targetId must reference Post table
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_targetId_fkey";

-- Verify the constraint was dropped
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = '"Like"'::regclass
AND conname = 'Like_targetId_fkey';

-- If the query above returns no rows, the migration was successful!

-- ============================================
-- DONE! Now comment likes will work properly
-- ============================================
