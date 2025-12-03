-- Migration: Add accepted_at and declined_at columns to requests table
-- Run this in Supabase SQL editor (or via psql) against your project's public schema.

-- Adds timestamp columns if they do not already exist.
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

-- Optional: index on accepted_at for queries (uncomment if desired)
-- CREATE INDEX IF NOT EXISTS idx_requests_accepted_at ON public.requests (accepted_at);

-- Note for Supabase users:
-- 1) Open your Supabase project, go to 'SQL' > 'New query'.
-- 2) Paste the SQL above and run it. This will modify the table schema.
-- 3) If your app uses Row Level Security (RLS), ensure any new column access is covered by policies.
-- 4) After running, refresh your client or restart your dev server so the schema cache updates.

-- Troubleshooting:
-- If you still see the "schema cache" error after running this, try:
--  - Log out/in to Supabase dashboard and re-open the SQL editor.
--  - In your app, restart Metro / Expo dev server to refresh the client schema.
--  - If using a remote connection, run `SELECT * FROM pg_extension;` to verify extensions.

-- End of migration
