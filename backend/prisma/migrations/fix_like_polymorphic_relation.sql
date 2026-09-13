-- Drop the foreign key constraint that enforces targetId to reference Post table
-- This allows Like to work as a polymorphic relation (can reference Post OR Comment)

ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_targetId_fkey";
