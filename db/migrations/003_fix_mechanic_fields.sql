-- Migration: Set missing fields on existing mechanics
-- Ensures all mechanics have is_available and specialization set

UPDATE public.mechanics
SET 
  is_available = COALESCE(is_available, true),
  specialization = COALESCE(specialization, service, 'General Mechanic')
WHERE is_available IS NULL OR specialization IS NULL;

-- Run in Supabase SQL editor
