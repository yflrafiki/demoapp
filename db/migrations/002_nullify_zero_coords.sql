-- Migration: Convert 0,0 customer coordinates to NULL
-- This fixes requests that were created with default 0 coordinates when location wasn't available.

UPDATE public.requests
SET lat = NULL, lng = NULL
WHERE (lat = 0 OR lat = 0.0) AND (lng = 0 OR lng = 0.0);

-- Optional: if you use separate customer_lat/customer_lng columns, run similar update:
-- UPDATE public.requests
-- SET customer_lat = NULL, customer_lng = NULL
-- WHERE (customer_lat = 0 OR customer_lat = 0.0) AND (customer_lng = 0 OR customer_lng = 0.0);

-- Run in Supabase SQL editor. After running, restart the client/dev server to refresh schema/data cache.
